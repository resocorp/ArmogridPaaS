import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin, getAdminToken } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase';

// GET - Fetch power readings history
export async function GET(request: NextRequest) {
  try {
    await requireAdmin();
    
    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const limit = parseInt(searchParams.get('limit') || '100');

    let query = supabaseAdmin
      .from('power_readings')
      .select('*')
      .order('recorded_at', { ascending: true })
      .limit(limit);

    if (startDate) {
      query = query.gte('recorded_at', `${startDate}T00:00:00`);
    }
    if (endDate) {
      query = query.lte('recorded_at', `${endDate}T23:59:59`);
    }

    const { data, error } = await query;

    if (error) {
      console.error('[Power Readings] Error fetching:', error);
      return NextResponse.json(
        { error: 'Failed to fetch power readings' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: data || [],
    });
  } catch (error: any) {
    console.error('[Power Readings] Error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch power readings' },
      { status: 500 }
    );
  }
}

// POST - Record current power reading (called periodically or on page load)
export async function POST(request: NextRequest) {
  try {
    await requireAdmin();
    
    const body = await request.json();
    const { totalPower, activeMeters, readingsByProject, readingsByMeter } = body;

    // Insert new power reading
    const { data, error } = await supabaseAdmin
      .from('power_readings')
      .insert({
        total_power: totalPower || 0,
        active_meters: activeMeters || 0,
        readings_by_project: readingsByProject || {},
        readings_by_meter: readingsByMeter || [],
      })
      .select()
      .single();

    if (error) {
      console.error('[Power Readings] Error inserting:', error);
      return NextResponse.json(
        { error: 'Failed to record power reading' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data,
    });
  } catch (error: any) {
    console.error('[Power Readings] Error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to record power reading' },
      { status: 500 }
    );
  }
}
