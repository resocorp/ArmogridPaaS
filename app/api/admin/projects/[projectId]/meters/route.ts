import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin, getAdminToken } from '@/lib/auth';
import { iotClient } from '@/lib/iot-client';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  try {
    await requireAdmin();
    const adminToken = await getAdminToken();
    const { projectId } = await params;

    // Step 1: Get rooms/meters for this project using ProjectRoomInfo
    console.log(`[Admin Meters] Fetching rooms for project: ${projectId}`);
    const roomResponse = await iotClient.getProjectRoomInfo(projectId, adminToken);
    console.log(`[Admin Meters] Room response:`, JSON.stringify(roomResponse));

    // Handle both new format (success: "1") and legacy format (code: 200)
    const isSuccess = roomResponse.success === '1' || roomResponse.code === 200 || roomResponse.code === 0;
    if (!isSuccess) {
      return NextResponse.json(
        { error: roomResponse.errorMsg || roomResponse.msg || 'Failed to fetch project rooms' },
        { status: 400 }
      );
    }

    const rooms = roomResponse.data || [];
    console.log(`[Admin Meters] Found ${rooms.length} rooms`);
    
    // Step 2: For each room, get detailed meter info using getMeterInfo with room name
    const metersWithDetails = await Promise.all(
      rooms.map(async (room: any) => {
        try {
          // Use room.name as roomNo for getMeterInfo call
          const roomName = room.name || room.roomNo;
          console.log(`[Admin Meters] Fetching meter info for room: ${roomName}`);
          
          const meterInfoResponse = await iotClient.getMeterInfo(roomName, adminToken);
          
          // Check for success in both formats
          const isSuccess = meterInfoResponse.success === '1' || 
                           meterInfoResponse.code === 200 || 
                           meterInfoResponse.code === 0;
          
          if (isSuccess && meterInfoResponse.data) {
            const meterData = meterInfoResponse.data;
            return {
              roomNo: roomName,
              projectId: String(room.projectId),
              projectName: room.projectName,
              // Meter details from getMeterInfo
              meterId: String(meterData.meterId || room.meterId),
              meterSN: room.meterSN,
              balance: meterData.balance || '0',
              totalMoney: meterData.totalMoney,
              buyTimes: meterData.buyTimes,
              switchSta: meterData.switchSta,
              unConnnect: meterData.unConnnect ?? 1,
              controlMode: meterData.controlMode,
              readValue: meterData.epi, // Energy reading
              model: meterData.model,
              power: meterData.p,
              lastReadTime: meterData.createTime,
            };
          }
          
          // If getMeterInfo fails, return basic room info
          console.log(`[Admin Meters] getMeterInfo failed for ${roomName}, using basic info`);
          return {
            roomNo: roomName,
            projectId: String(room.projectId),
            projectName: room.projectName,
            meterId: String(room.meterId),
            meterSN: room.meterSN,
            balance: '0',
            switchSta: '0',
            unConnnect: 1,
          };
        } catch (err) {
          console.error(`[Admin Meters] Error fetching meter info for ${room.name}:`, err);
          return {
            roomNo: room.name || room.roomNo,
            projectId: String(room.projectId),
            projectName: room.projectName,
            meterId: String(room.meterId),
            meterSN: room.meterSN,
            balance: '0',
            switchSta: '0',
            unConnnect: 1,
            error: 'Failed to fetch details',
          };
        }
      })
    );

    return NextResponse.json({
      success: true,
      data: metersWithDetails,
      totalRooms: rooms.length,
    });
  } catch (error: any) {
    console.error('Get project meters error:', error);
    
    if (error.message === 'Unauthorized' || error.message.includes('Admin')) {
      return NextResponse.json(
        { error: 'Admin access required' },
        { status: 403 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to fetch project meters' },
      { status: 500 }
    );
  }
}
