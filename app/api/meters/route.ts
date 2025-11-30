import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { iotClient } from '@/lib/iot-client';

export async function GET() {
  try {
    const session = await requireAuth();

    // Get user's meter list
    const response = await iotClient.getUserMeterList(session.token);

    // Check success in both API formats
    const isSuccess = 
      (response.success === '1') || // New format
      (response.code === 200 || response.code === 0); // Legacy format

    if (!isSuccess) {
      const errorMsg = response.errorMsg || response.msg || 'Failed to fetch meters';
      
      // Check if token expired (common error codes)
      if (errorMsg.toLowerCase().includes('token') || errorMsg.toLowerCase().includes('expired')) {
        return NextResponse.json(
          { error: 'Session expired', tokenExpired: true },
          { status: 401 }
        );
      }
      
      return NextResponse.json(
        { error: errorMsg },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      data: response.data || [],
    });
  } catch (error: any) {
    if (error.message === 'Unauthorized') {
      return NextResponse.json(
        { error: 'Unauthorized', tokenExpired: true },
        { status: 401 }
      );
    }

    console.error('Get meters error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
