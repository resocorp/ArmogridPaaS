import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  try {
    await requireAdmin();

    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '50');
    const status = searchParams.get('status');

    let query = supabaseAdmin
      .from('customer_registrations')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (status && status !== 'all') {
      query = query.eq('payment_status', status);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Failed to fetch registrations:', error);
      return NextResponse.json(
        { error: 'Failed to fetch registrations' },
        { status: 500 }
      );
    }

    // Get counts by status
    const { data: countData } = await supabaseAdmin
      .from('customer_registrations')
      .select('payment_status');

    const counts = {
      total: countData?.length || 0,
      pending: countData?.filter(r => r.payment_status === 'pending').length || 0,
      success: countData?.filter(r => r.payment_status === 'success').length || 0,
      failed: countData?.filter(r => r.payment_status === 'failed').length || 0,
    };

    return NextResponse.json({
      success: true,
      data,
      counts,
    });
  } catch (error: any) {
    console.error('Get registrations error:', error);
    
    if (error.message === 'Unauthorized' || error.message.includes('Admin')) {
      return NextResponse.json(
        { error: 'Admin access required' },
        { status: 403 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to fetch registrations' },
      { status: 500 }
    );
  }
}
