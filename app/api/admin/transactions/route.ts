import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase';
import { format, subDays } from 'date-fns';

export async function GET(request: NextRequest) {
  try {
    await requireAdmin();

    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('startDate') || format(subDays(new Date(), 30), 'yyyy-MM-dd');
    const endDate = searchParams.get('endDate') || format(new Date(), 'yyyy-MM-dd');
    const status = searchParams.get('status'); // pending, success, failed
    const limit = parseInt(searchParams.get('limit') || '100');
    const offset = parseInt(searchParams.get('offset') || '0');

    let query = supabaseAdmin
      .from('transactions')
      .select('*', { count: 'exact' })
      .gte('created_at', `${startDate}T00:00:00`)
      .lte('created_at', `${endDate}T23:59:59`)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (status) {
      query = query.eq('paystack_status', status);
    }

    const { data, error, count } = await query;

    if (error) {
      console.error('Supabase error:', error);
      return NextResponse.json(
        { error: 'Failed to fetch transactions' },
        { status: 500 }
      );
    }

    // Calculate summary stats
    const allTransactions = data || [];
    const totalAmount = allTransactions.reduce((sum, t) => sum + (t.amount_kobo || 0), 0) / 100;
    const successfulAmount = allTransactions
      .filter(t => t.paystack_status === 'success')
      .reduce((sum, t) => sum + (t.amount_kobo || 0), 0) / 100;

    return NextResponse.json({
      success: true,
      data: allTransactions,
      total: count || 0,
      summary: {
        totalTransactions: count || 0,
        totalAmount,
        successfulAmount,
        successRate: count ? (allTransactions.filter(t => t.paystack_status === 'success').length / count * 100).toFixed(1) : 0,
      },
    });
  } catch (error: any) {
    console.error('Get admin transactions error:', error);
    
    if (error.message === 'Unauthorized' || error.message.includes('Admin')) {
      return NextResponse.json(
        { error: 'Admin access required' },
        { status: 403 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to fetch transactions' },
      { status: 500 }
    );
  }
}
