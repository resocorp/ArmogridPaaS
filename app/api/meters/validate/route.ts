import { NextRequest, NextResponse } from 'next/server';
import { iotClient } from '@/lib/iot-client';
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
      
      // Check if the response indicates success (handle both API formats)
      const isSuccess = 
        (meterInfo.success === '1') || // New format
        (meterInfo.code === 200 || meterInfo.code === 0); // Legacy format
      
      if (!isSuccess) {
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
