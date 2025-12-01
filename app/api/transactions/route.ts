import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { iotClient } from '@/lib/iot-client';
import { format, subDays, addDays, parseISO } from 'date-fns';

export async function GET(request: NextRequest) {
  try {
    const session = await requireAuth();
    const { searchParams } = new URL(request.url);
    
    // Support both days-based and custom date range
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const days = parseInt(searchParams.get('days') || '30');

    let startDateStr: string;
    let endDateStr: string;

    if (startDate && endDate) {
      // Use custom date range - add 1 day buffer to end date for API
      startDateStr = startDate;
      // Add 1 day to end date as IoT API treats endTime as exclusive
      const endDateParsed = parseISO(endDate);
      endDateStr = format(addDays(endDateParsed, 1), 'yyyy-MM-dd');
    } else {
      // Use days-based range
      const end = new Date();
      const start = subDays(end, days);
      startDateStr = format(start, 'yyyy-MM-dd');
      // Add 1 day to end date as IoT API treats endTime as exclusive
      endDateStr = format(addDays(end, 1), 'yyyy-MM-dd');
    }

    console.log(`[Transactions API] Fetching from ${startDateStr} to ${endDateStr}`);

    // Get user's sale list from IoT platform
    const response = await iotClient.getUserSaleList(
      startDateStr,
      endDateStr,
      session.token
    );

    // Handle new API response format (success: "1")
    if (response.success !== '1') {
      return NextResponse.json(
        { error: response.errorMsg || 'Failed to fetch transactions' },
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

    console.error('Get transactions error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
