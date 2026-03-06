import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase';
import { solarClient } from '@/lib/solar-client';

export const dynamic = 'force-dynamic';

/**
 * GET /api/admin/solar-forecast
 * Get solar forecasts for dashboard display
 * Query params:
 *   - projectId: optional, filter by project
 *   - days: number of forecast days to return (default 7)
 *   - includeToday: boolean, include today's forecast (default true)
 *   - refresh: boolean, force refresh from API instead of cached data
 */
export async function GET(request: NextRequest) {
  try {
    await requireAdmin();

    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('projectId');
    const days = parseInt(searchParams.get('days') || '7');
    const includeToday = searchParams.get('includeToday') !== 'false';
    const refresh = searchParams.get('refresh') === 'true';

    // Get the date range
    const today = new Date();
    const startDate = includeToday ? today : new Date(today.getTime() + 86400000);
    const endDate = new Date(today.getTime() + days * 86400000);

    const startStr = startDate.toISOString().split('T')[0];
    const endStr = endDate.toISOString().split('T')[0];

    // If refresh requested, fetch fresh data from API
    if (refresh) {
      let locations;

      if (projectId) {
        const { data } = await supabaseAdmin
          .from('solar_project_locations')
          .select('*')
          .eq('project_id', projectId)
          .eq('enabled', true);
        locations = data;
      } else {
        const { data } = await supabaseAdmin
          .from('solar_project_locations')
          .select('*')
          .eq('enabled', true);
        locations = data;
      }

      // Load derating factor from admin settings
      const { data: extraSettings } = await supabaseAdmin
        .from('admin_settings')
        .select('key, value')
        .in('key', ['solar_derating_factor']);

      const extraMap: Record<string, string> = {};
      extraSettings?.forEach((s: any) => { extraMap[s.key] = s.value; });
      const deratingFactor = parseFloat(extraMap.solar_derating_factor || '0.78');

      if (locations && locations.length > 0) {
        for (const location of locations) {
          try {
            const panelConfig = location.panel_config || {};
            const panelCapacityKw = parseFloat(panelConfig.peak_power || '0');
            const peakSunHours = parseFloat(panelConfig.peak_sun_hours || '5.0');

            // Single 5-day forecast API request (free tier)
            const { days: forecastDays } = await solarClient.getWeatherBasedSolarForecast(
              location.lat,
              location.lon,
              panelCapacityKw,
              peakSunHours,
              deratingFactor
            );

            for (const day of forecastDays) {
              const advisoryLevel = await solarClient.getAdvisoryLevel(day.solarRatio);

              await supabaseAdmin
                .from('solar_forecasts')
                .upsert(
                  {
                    project_id: location.project_id,
                    forecast_date: day.date,
                    clear_sky_ghi: 0,
                    clear_sky_dni: 0,
                    clear_sky_dhi: 0,
                    cloudy_sky_ghi: 0,
                    cloudy_sky_dni: 0,
                    cloudy_sky_dhi: 0,
                    solar_ratio: day.solarRatio,
                    panel_energy_clear_sky: day.estimatedKwhClearSky,
                    panel_energy_cloudy_sky: day.estimatedKwh,
                    sunrise: day.sunrise,
                    sunset: day.sunset,
                    weather_summary: day.weatherSummary || null,
                    weather_icon: day.weatherIcon || null,
                    cloud_cover_pct: day.clouds,
                    temp_min: day.tempMin,
                    temp_max: day.tempMax,
                    rain_mm: day.rainMm,
                    wind_speed: day.windSpeed,
                    humidity: day.humidity,
                    advisory_level: advisoryLevel,
                    hourly_data: null,
                    updated_at: new Date().toISOString(),
                  },
                  { onConflict: 'project_id,forecast_date' }
                );
            }
          } catch (err) {
            console.error(`[SolarForecast] Failed to refresh forecast for ${location.project_name}:`, err);
          }
        }
      }
    }

    // Query cached forecasts from database
    let query = supabaseAdmin
      .from('solar_forecasts')
      .select('*')
      .gte('forecast_date', startStr)
      .lte('forecast_date', endStr)
      .order('forecast_date', { ascending: true });

    if (projectId) {
      query = query.eq('project_id', projectId);
    }

    const { data: forecasts, error } = await query;

    if (error) {
      console.error('[SolarForecast] Error fetching forecasts:', error);
      return NextResponse.json({ error: 'Failed to fetch solar forecasts' }, { status: 500 });
    }

    // Get location names for display
    const { data: locations } = await supabaseAdmin
      .from('solar_project_locations')
      .select('project_id, project_name, lat, lon');

    const locationMap: Record<string, { name: string; lat: number; lon: number }> = {};
    locations?.forEach((loc: any) => {
      locationMap[loc.project_id] = {
        name: loc.project_name || loc.project_id,
        lat: loc.lat,
        lon: loc.lon,
      };
    });

    // Group forecasts by project
    const forecastsByProject: Record<string, any[]> = {};
    forecasts?.forEach((f: any) => {
      if (!forecastsByProject[f.project_id]) {
        forecastsByProject[f.project_id] = [];
      }
      forecastsByProject[f.project_id].push({
        ...f,
        project_name: locationMap[f.project_id]?.name || f.project_id,
      });
    });

    // Calculate summary statistics
    const tomorrowStr = new Date(today.getTime() + 86400000).toISOString().split('T')[0];
    const tomorrowForecasts = forecasts?.filter((f: any) => f.forecast_date === tomorrowStr) || [];

    const summary = {
      totalLocations: Object.keys(forecastsByProject).length,
      tomorrowAvgSolarRatio:
        tomorrowForecasts.length > 0
          ? tomorrowForecasts.reduce((sum: number, f: any) => sum + parseFloat(f.solar_ratio), 0) /
            tomorrowForecasts.length
          : null,
      tomorrowAdvisories: tomorrowForecasts.filter(
        (f: any) => f.advisory_level !== 'normal'
      ).length,
      lowSolarDaysAhead: forecasts?.filter((f: any) => f.advisory_level !== 'normal').length || 0,
    };

    return NextResponse.json({
      success: true,
      summary,
      forecastsByProject,
      forecasts: forecasts || [],
      locationMap,
    });
  } catch (error: any) {
    if (error.message === 'Unauthorized' || error.message.includes('Admin')) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }
    console.error('[SolarForecast] Error:', error);
    return NextResponse.json({ error: 'Failed to fetch solar forecasts' }, { status: 500 });
  }
}
