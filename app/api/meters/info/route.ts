import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { iotClient } from '@/lib/iot-client';
import { translateErrorMessage } from '@/lib/utils';

// POST /api/meters/info - Get detailed meter info using roomNo
export async function POST(request: NextRequest) {
  try {
    const session = await requireAuth();
    const { roomNo } = await request.json();

    if (!roomNo) {
      return NextResponse.json(
        { error: 'Room number is required' },
        { status: 400 }
      );
    }

    // Get detailed meter info using roomNo
    const response = await iotClient.getMeterInfo(roomNo, session.token);

    // Check success in both API formats
    const isSuccess = 
      (response.success === '1') || 
      (response.code === 200 || response.code === 0);

    if (!isSuccess) {
      const rawErrorMsg = response.errorMsg || response.msg || 'Failed to fetch meter info';
      const errorMsg = translateErrorMessage(rawErrorMsg);
      
      // Check if token expired
      if (rawErrorMsg.toLowerCase().includes('token') || rawErrorMsg.toLowerCase().includes('expired')) {
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
      data: response.data,
    });
  } catch (error: any) {
    if (error.message === 'Unauthorized') {
      return NextResponse.json(
        { error: 'Unauthorized', tokenExpired: true },
        { status: 401 }
      );
    }

    console.error('Get meter detailed info error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
