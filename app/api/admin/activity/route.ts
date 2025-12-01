import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase';
import { format, subDays } from 'date-fns';
import type { Transaction, WebhookLog } from '@/types/database';

export async function GET(request: NextRequest) {
  try {
    await requireAdmin();

    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '20');

    // Fetch recent transactions as activity
    const { data: transactions } = await supabaseAdmin
      .from('transactions')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit) as { data: Transaction[] | null };

    // Fetch recent webhook events
    const { data: webhooks } = await supabaseAdmin
      .from('webhook_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit) as { data: WebhookLog[] | null };

    // Fetch active sessions count
    const { count: activeSessions } = await supabaseAdmin
      .from('user_sessions')
      .select('*', { count: 'exact', head: true })
      .gte('expires_at', new Date().toISOString());

    // Combine and sort activities
    const activities: any[] = [];

    (transactions || []).forEach(tx => {
      activities.push({
        id: tx.id,
        type: 'transaction',
        status: tx.paystack_status,
        description: `Transaction ${tx.paystack_status}: ₦${(tx.amount_kobo / 100).toLocaleString()} for meter ${tx.meter_id}`,
        meterId: tx.meter_id,
        amount: tx.amount_kobo / 100,
        reference: tx.paystack_reference,
        timestamp: tx.created_at,
      });
    });

    (webhooks || []).forEach(wh => {
      activities.push({
        id: wh.id,
        type: 'webhook',
        status: wh.processed ? 'processed' : 'pending',
        description: `Webhook ${wh.event_type} ${wh.processed ? 'processed' : 'received'}`,
        reference: wh.reference,
        timestamp: wh.created_at,
        error: wh.error,
      });
    });

    // Sort by timestamp
    activities.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    return NextResponse.json({
      success: true,
      data: activities.slice(0, limit),
      stats: {
        activeSessions: activeSessions || 0,
        recentTransactions: (transactions || []).length,
        recentWebhooks: (webhooks || []).length,
      },
    });
  } catch (error: any) {
    console.error('Get admin activity error:', error);
    
    if (error.message === 'Unauthorized' || error.message.includes('Admin')) {
      return NextResponse.json(
        { error: 'Admin access required' },
        { status: 403 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to fetch activity' },
      { status: 500 }
    );
  }
}
