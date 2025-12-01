import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { iotClient } from '@/lib/iot-client';
import { format, subDays, subMonths, addDays, parseISO } from 'date-fns';
import { translateErrorMessage } from '@/lib/utils';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await requireAuth();
    const { id: meterId } = params;
    const { searchParams } = new URL(request.url);
    const period = searchParams.get('period') || 'day'; // 'day' or 'month'
    
    // Support custom date range or days-based
    const customStartDate = searchParams.get('startDate');
    const customEndDate = searchParams.get('endDate');
    const days = parseInt(searchParams.get('days') || '30');

    if (!meterId) {
      return NextResponse.json(
        { error: 'Meter ID is required' },
        { status: 400 }
      );
    }

    let startDateStr: string;
    let endDateStr: string;

    if (customStartDate && customEndDate) {
      // Custom date range - format with time
      startDateStr = `${customStartDate} 00:00:00`;
      // Add 1 day buffer to end date (API may treat as exclusive)
      const endDateParsed = parseISO(customEndDate);
      endDateStr = `${format(addDays(endDateParsed, 1), 'yyyy-MM-dd')} 23:59:59`;
    } else {
      // Days-based range
      const endDate = new Date();
      const startDate = period === 'month' 
        ? subMonths(endDate, Math.ceil(days / 30))
        : subDays(endDate, days);

      // Format with time as API expects "YYYY-MM-DD HH:mm:ss"
      startDateStr = `${format(startDate, 'yyyy-MM-dd')} 00:00:00`;
      endDateStr = `${format(addDays(endDate, 1), 'yyyy-MM-dd')} 23:59:59`;
    }

    console.log(`[Energy API] Fetching ${period} data for meter ${meterId} from ${startDateStr} to ${endDateStr}`);

    // Get energy data
    const response = period === 'month'
      ? await iotClient.getMeterEnergyMonth(meterId, startDateStr, endDateStr, session.token)
      : await iotClient.getMeterEnergyDay(meterId, startDateStr, endDateStr, session.token);

    // Handle new API response format (success: "1")
    if (response.success !== '1') {
      const errorMsg = translateErrorMessage(response.errorMsg || 'Failed to fetch energy data');
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
