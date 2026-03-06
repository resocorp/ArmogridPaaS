import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

/**
 * POST /api/admin/solar-locations/panels
 * OWM Panel Energy Prediction API requires a separate paid subscription.
 * kWh estimation is now done locally using panel specs + One Call API weather data.
 */
export async function POST(request: NextRequest) {
  try {
    await requireAdmin();

    return NextResponse.json({
      success: false,
      error: 'OWM Panel Energy Prediction API requires a separate paid subscription. kWh estimation is now calculated locally using your panel specs (peak power, peak sun hours, and derating factor). Configure these in the Solar Location settings.',
    }, { status: 400 });
  } catch (error: any) {
    if (error.message === 'Unauthorized' || error.message.includes('Admin')) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }
    return NextResponse.json({ error: 'Failed to process request' }, { status: 500 });
  }
}

/**
 * GET /api/admin/solar-locations/panels?projectId=xxx
 * Returns panel configuration stored locally for a project location
 */
export async function GET(request: NextRequest) {
  try {
    await requireAdmin();

    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('projectId');

    if (!projectId) {
      return NextResponse.json({ error: 'projectId is required' }, { status: 400 });
    }

    const { data: location } = await supabaseAdmin
      .from('solar_project_locations')
      .select('panel_config, project_name')
      .eq('project_id', projectId)
      .single();

    if (!location) {
      return NextResponse.json({
        success: true,
        data: [],
        message: 'Solar project location not found',
      });
    }

    return NextResponse.json({
      success: true,
      data: location.panel_config ? [location.panel_config] : [],
      projectName: location.project_name,
      message: 'Panel config stored locally. kWh estimation uses UV index + cloud cover from One Call API.',
    });
  } catch (error: any) {
    if (error.message === 'Unauthorized' || error.message.includes('Admin')) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }
    return NextResponse.json({ error: 'Failed to fetch solar panels' }, { status: 500 });
  }
}
