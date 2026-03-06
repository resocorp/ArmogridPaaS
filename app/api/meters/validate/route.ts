import { NextRequest, NextResponse } from 'next/server';
import { iotClient, isIotSuccess } from '@/lib/iot-client';
import { getAdminToken } from '@/lib/auth';
import { isValidMeterId } from '@/lib/utils';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { meterId } = body;

    // Validate meter ID format
    if (!meterId || !isValidMeterId(meterId)) {
      return NextResponse.json(
        { error: 'Invalid meter ID format' },
        { status: 400 }
      );
    }

    // Get admin token and verify meter exists
    try {
      const adminToken = await getAdminToken();
      const meterInfo = await iotClient.getMeterInfoById(meterId, adminToken);
      
      if (!isIotSuccess(meterInfo)) {
        // Meter not found
        return NextResponse.json({
          success: false,
          found: false,
          message: 'Meter not found'
        });
      }

      // Extract room number from meter info
      const roomNo = meterInfo.data?.roomNo || meterInfo.data?.roomno || null;
      
      return NextResponse.json({
        success: true,
        found: true,
        roomNo: roomNo,
        meterId: meterId
      });
    } catch (error: any) {
      console.error('[Meter Validation] Error:', error);
      // Return meter not found instead of exposing error
      return NextResponse.json({
        success: false,
        found: false,
        message: 'Meter not found'
      });
    }
  } catch (error: any) {
    console.error('[Meter Validation] Request error:', error);
    return NextResponse.json(
      { error: 'Invalid request' },
      { status: 400 }
    );
  }
}
