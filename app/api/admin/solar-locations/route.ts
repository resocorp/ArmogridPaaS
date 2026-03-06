import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase';
import { solarClient } from '@/lib/solar-client';

export const dynamic = 'force-dynamic';

/**
 * GET /api/admin/solar-locations
 * List all solar project locations
 */
export async function GET(request: NextRequest) {
  try {
    await requireAdmin();

    const { data: locations, error } = await supabaseAdmin
      .from('solar_project_locations')
      .select('*')
      .order('project_name', { ascending: true });

    if (error) {
      console.error('[SolarLocations] Error fetching locations:', error);
      return NextResponse.json({ error: 'Failed to fetch solar locations' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      data: locations || [],
    });
  } catch (error: any) {
    if (error.message === 'Unauthorized' || error.message.includes('Admin')) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }
    return NextResponse.json({ error: 'Failed to fetch solar locations' }, { status: 500 });
  }
}

/**
 * POST /api/admin/solar-locations
 * Create or update a solar project location
 * Body: { projectId, projectName, lat, lon, timezone?, panelConfig?, enabled? }
 */
export async function POST(request: NextRequest) {
  try {
    await requireAdmin();

    const body = await request.json();
    const { projectId, projectName, lat, lon, timezone, panelConfig, enabled } = body;

    if (!projectId || lat === undefined || lon === undefined) {
      return NextResponse.json(
        { error: 'projectId, lat, and lon are required' },
        { status: 400 }
      );
    }

    if (lat < -90 || lat > 90 || lon < -180 || lon > 180) {
      return NextResponse.json(
        { error: 'Invalid coordinates. Lat must be -90 to 90, Lon must be -180 to 180' },
        { status: 400 }
      );
    }

    // Upsert the location
    const { data: location, error } = await supabaseAdmin
      .from('solar_project_locations')
      .upsert(
        {
          project_id: projectId,
          project_name: projectName || null,
          lat,
          lon,
          timezone: timezone || '+01:00',
          panel_config: panelConfig || {},
          enabled: enabled !== false,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'project_id' }
      )
      .select()
      .single();

    if (error) {
      console.error('[SolarLocations] Error upserting location:', error);
      return NextResponse.json({ error: 'Failed to save solar location' }, { status: 500 });
    }

    console.log(`[SolarLocations] Location saved for project ${projectId}`);

    return NextResponse.json({
      success: true,
      data: location,
    });
  } catch (error: any) {
    if (error.message === 'Unauthorized' || error.message.includes('Admin')) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }
    console.error('[SolarLocations] Error:', error);
    return NextResponse.json({ error: 'Failed to save solar location' }, { status: 500 });
  }
}

/**
 * DELETE /api/admin/solar-locations
 * Delete a solar project location
 * Query: ?projectId=xxx
 */
export async function DELETE(request: NextRequest) {
  try {
    await requireAdmin();

    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('projectId');

    if (!projectId) {
      return NextResponse.json({ error: 'projectId is required' }, { status: 400 });
    }

    // If location has an OWM location ID, delete it from OpenWeatherMap too
    const { data: existing } = await supabaseAdmin
      .from('solar_project_locations')
      .select('owm_location_id')
      .eq('project_id', projectId)
      .single();

    if (existing?.owm_location_id) {
      try {
        await solarClient.deleteLocation(existing.owm_location_id);
        console.log(`[SolarLocations] Deleted OWM location ${existing.owm_location_id}`);
      } catch (err) {
        console.error('[SolarLocations] Failed to delete OWM location:', err);
      }
    }

    const { error } = await supabaseAdmin
      .from('solar_project_locations')
      .delete()
      .eq('project_id', projectId);

    if (error) {
      console.error('[SolarLocations] Error deleting location:', error);
      return NextResponse.json({ error: 'Failed to delete solar location' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    if (error.message === 'Unauthorized' || error.message.includes('Admin')) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }
    return NextResponse.json({ error: 'Failed to delete solar location' }, { status: 500 });
  }
}
