import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin, getAdminToken, getUserToken } from '@/lib/auth';
import { iotClient } from '@/lib/iot-client';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  try {
    await requireAdmin();
    const adminToken = await getAdminToken();
    const { projectId } = await params;

    // Get user token for appProjectMeterList API
    let userToken: string;
    try {
      userToken = await getUserToken();
    } catch (e) {
      console.log('[Admin Meters] Failed to get user token, falling back to admin token');
      userToken = adminToken;
    }

    // Use appProjectMeterList to get all meters with full details in one call
    console.log(`[Admin Meters] Fetching meters for project: ${projectId}`);
    const meterListResponse = await iotClient.getProjectMeterList(projectId, userToken);
    
    if (meterListResponse.success !== '1') {
      return NextResponse.json(
        { error: meterListResponse.errorMsg || 'Failed to fetch project meters' },
        { status: 400 }
      );
    }

    const meters = meterListResponse.data?.list || [];
    console.log(`[Admin Meters] Found ${meters.length} meters`);
    
    // Map meter data to expected format
    const metersWithDetails = meters.map((meter: any) => {
      const roomNo = meter.roomNo || meter.meterName || meter.meterSn || '';
      // unConnect: 0 = online, 1 = offline (note: single 'n' in API response)
      const unConnect = meter.unConnect ?? 1;
      
      return {
        roomNo,
        projectId: String(meter.projectId),
        projectName: meter.projectName,
        meterId: String(meter.id || ''),
        meterSN: meter.meterSn,
        meterSn: meter.meterSn,
        balance: meter.balance || '0',
        switchSta: meter.switchSta,
        unConnect,
        unConnnect: unConnect, // Keep both for backward compatibility
        controlMode: meter.prepaidType,
        readValue: meter.EPI,
        model: meter.model,
        alarmA: meter.alarmA,
        alarmB: meter.alarmB,
        ownerName: meter.ownerName,
        createTime: meter.createTime,
        gatewaySn: meter.gatewaySn,
        sn: meter.sn,
      };
    });

    return NextResponse.json({
      success: true,
      data: metersWithDetails,
      totalMeters: meters.length,
      pagination: meterListResponse.data?.pagination,
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
