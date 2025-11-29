import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { iotClient } from '@/lib/iot-client';
import { format, subDays, subMonths } from 'date-fns';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await requireAuth();
    const { id: meterId } = params;
    const { searchParams } = new URL(request.url);
    const period = searchParams.get('period') || 'day'; // 'day' or 'month'
    const days = parseInt(searchParams.get('days') || '30');

    if (!meterId) {
      return NextResponse.json(
        { error: 'Meter ID is required' },
        { status: 400 }
      );
    }

    const endDate = new Date();
    const startDate = period === 'month' 
      ? subMonths(endDate, Math.ceil(days / 30))
      : subDays(endDate, days);

    const startDateStr = format(startDate, 'yyyy-MM-dd');
    const endDateStr = format(endDate, 'yyyy-MM-dd');

    // Get energy data
    const response = period === 'month'
      ? await iotClient.getMeterEnergyMonth(meterId, startDateStr, endDateStr, session.token)
      : await iotClient.getMeterEnergyDay(meterId, startDateStr, endDateStr, session.token);

    if (response.code !== 200 && response.code !== 0) {
      return NextResponse.json(
        { error: response.msg || 'Failed to fetch energy data' },
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

    console.error('Get energy data error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
