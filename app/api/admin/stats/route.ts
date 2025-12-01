import { NextResponse } from 'next/server';
import { requireAdmin, getAdminToken } from '@/lib/auth';
import { iotClient } from '@/lib/iot-client';
import { supabaseAdmin } from '@/lib/supabase';
import { format, subDays, startOfMonth, endOfMonth } from 'date-fns';

export async function GET() {
  try {
    await requireAdmin();
    const adminToken = await getAdminToken();

    // Fetch data in parallel
    const [projectsResponse, transactionsData, todayTransactions] = await Promise.all([
      // Get all projects to count meters
      iotClient.getProjectList('', 100, 1, adminToken),
      // Get monthly revenue from Supabase
      supabaseAdmin
        .from('transactions')
        .select('amount_kobo, paystack_status, created_at')
        .gte('created_at', startOfMonth(new Date()).toISOString())
        .lte('created_at', endOfMonth(new Date()).toISOString()),
      // Get today's transactions
      supabaseAdmin
        .from('transactions')
        .select('id, amount_kobo, paystack_status')
        .gte('created_at', format(new Date(), 'yyyy-MM-dd'))
    ]);

    // Calculate stats
    let totalMeters = 0;
    let totalProjects = 0;

    if (projectsResponse.code === 200 || projectsResponse.code === 0) {
      totalProjects = projectsResponse.data?.total || projectsResponse.data?.list?.length || 0;
      // Sum up meters from all projects
      for (const project of projectsResponse.data?.list || []) {
        totalMeters += project.meterCount || 0;
      }
    }

    // Calculate revenue
    const monthlyRevenue = (transactionsData.data || [])
      .filter((t: any) => t.paystack_status === 'success')
      .reduce((sum: number, t: any) => sum + (t.amount_kobo || 0), 0) / 100;

    const todayCount = (todayTransactions.data || []).length;
    const todaySuccessCount = (todayTransactions.data || [])
      .filter((t: any) => t.paystack_status === 'success').length;

    return NextResponse.json({
      success: true,
      data: {
        totalProjects,
        totalMeters,
        monthlyRevenue,
        todayTransactions: todayCount,
        todaySuccessful: todaySuccessCount,
      },
    });
  } catch (error: any) {
    console.error('Admin stats error:', error);
    
    if (error.message === 'Unauthorized' || error.message.includes('Admin')) {
      return NextResponse.json(
        { error: 'Admin access required' },
        { status: 403 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to fetch admin stats' },
      { status: 500 }
    );
  }
}
