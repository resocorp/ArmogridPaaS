import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { iotClient } from '@/lib/iot-client';

export async function GET() {
  try {
    const session = await requireAuth();

    // Get user's meter list
    const response = await iotClient.getUserMeterList(session.token);

    if (response.code !== 200 && response.code !== 0) {
      return NextResponse.json(
        { error: response.msg || 'Failed to fetch meters' },
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
        { error: 'Unauthorized' },
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
