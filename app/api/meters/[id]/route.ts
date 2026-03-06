import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { iotClient, isIotSuccess } from '@/lib/iot-client';
import { translateErrorMessage } from '@/lib/utils';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await requireAuth();
    const { id: meterId } = params;

    if (!meterId) {
      return NextResponse.json(
        { error: 'Meter ID is required' },
        { status: 400 }
      );
    }

    // Get meter info
    const response = await iotClient.getMeterInfoById(meterId, session.token);

    if (!isIotSuccess(response)) {
      const rawErrorMsg = response.errorMsg || response.msg || 'Failed to fetch meter info';
      const errorMsg = translateErrorMessage(rawErrorMsg);

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

    console.error('Get meter info error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
