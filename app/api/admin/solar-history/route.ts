import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

/**
 * GET /api/admin/solar-history
 * Get historical solar forecast data and compare with actual consumption
 * Query params:
 *   - projectId: required
 *   - startDate: YYYY-MM-DD (default: 30 days ago)
 *   - endDate: YYYY-MM-DD (default: today)
 */
export async function GET(request: NextRequest) {
  try {
    await requireAdmin();

    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('projectId');

    if (!projectId) {
      return NextResponse.json({ error: 'projectId is required' }, { status: 400 });
    }

    const today = new Date();
    const defaultStart = new Date(today);
    defaultStart.setDate(defaultStart.getDate() - 30);

    const startDate = searchParams.get('startDate') || defaultStart.toISOString().split('T')[0];
    const endDate = searchParams.get('endDate') || today.toISOString().split('T')[0];

    // Get the location
    const { data: location } = await supabaseAdmin
      .from('solar_project_locations')
      .select('*')
      .eq('project_id', projectId)
      .single();

    if (!location) {
      return NextResponse.json(
        { error: 'Solar project location not found' },
        { status: 404 }
      );
    }

    // Get cached solar forecasts for the date range (populated by daily cron)
    const { data: solarData, error: solarError } = await supabaseAdmin
      .from('solar_forecasts')
      .select('*')
      .eq('project_id', projectId)
      .gte('forecast_date', startDate)
      .lte('forecast_date', endDate)
      .order('forecast_date', { ascending: true });

    if (solarError) {
      console.error('[SolarHistory] Error fetching solar data:', solarError);
    }

    // Get actual power consumption data for the same period
    const { data: powerData, error: powerError } = await supabaseAdmin
      .from('power_readings')
      .select('recorded_at, total_power, active_meters, readings_by_project')
      .gte('recorded_at', `${startDate}T00:00:00`)
      .lte('recorded_at', `${endDate}T23:59:59`)
      .order('recorded_at', { ascending: true });

    if (powerError) {
      console.error('[SolarHistory] Error fetching power data:', powerError);
    }

    // Aggregate power data by day
    const powerByDay: Record<string, { totalPower: number; readings: number; activeMeters: number }> = {};
    powerData?.forEach((reading: any) => {
      const day = reading.recorded_at.split('T')[0];
      if (!powerByDay[day]) {
        powerByDay[day] = { totalPower: 0, readings: 0, activeMeters: 0 };
      }
      powerByDay[day].totalPower += parseFloat(reading.total_power) || 0;
      powerByDay[day].readings += 1;
      powerByDay[day].activeMeters = Math.max(powerByDay[day].activeMeters, reading.active_meters || 0);
    });

    // Calculate daily average power (kW)
    const dailyPowerAvg: Record<string, number> = {};
    for (const [day, data] of Object.entries(powerByDay)) {
      dailyPowerAvg[day] = data.readings > 0 ? data.totalPower / data.readings : 0;
    }

    // Build combined dataset for charts
    const combinedData = (solarData || []).map((solar: any) => ({
      date: solar.forecast_date,
      clearSkyGhi: parseFloat(solar.clear_sky_ghi),
      cloudySkyGhi: parseFloat(solar.cloudy_sky_ghi),
      solarRatio: parseFloat(solar.solar_ratio),
      advisoryLevel: solar.advisory_level,
      panelEnergyClearSky: parseFloat(solar.panel_energy_clear_sky),
      panelEnergyCloudySky: parseFloat(solar.panel_energy_cloudy_sky),
      avgPowerKw: dailyPowerAvg[solar.forecast_date] || null,
      activeMeters: powerByDay[solar.forecast_date]?.activeMeters || null,
      weatherSummary: solar.weather_summary,
      cloudCover: solar.cloud_cover_pct,
      tempMin: solar.temp_min ? parseFloat(solar.temp_min) : null,
      tempMax: solar.temp_max ? parseFloat(solar.temp_max) : null,
      rainMm: parseFloat(solar.rain_mm) || 0,
    }));

    // Calculate monthly averages for seasonal analysis
    const monthlyAverages: Record<string, { ghi: number; ratio: number; count: number }> = {};
    (solarData || []).forEach((solar: any) => {
      const month = solar.forecast_date.substring(0, 7); // YYYY-MM
      if (!monthlyAverages[month]) {
        monthlyAverages[month] = { ghi: 0, ratio: 0, count: 0 };
      }
      monthlyAverages[month].ghi += parseFloat(solar.cloudy_sky_ghi) || 0;
      monthlyAverages[month].ratio += parseFloat(solar.solar_ratio) || 0;
      monthlyAverages[month].count += 1;
    });

    const monthlySummary = Object.entries(monthlyAverages).map(([month, data]) => ({
      month,
      avgDailyGhi: data.count > 0 ? data.ghi / data.count : 0,
      avgSolarRatio: data.count > 0 ? data.ratio / data.count : 0,
      daysRecorded: data.count,
    }));

    // Overall statistics
    const totalDays = solarData?.length || 0;
    const lowSolarDays = solarData?.filter((s: any) => s.advisory_level !== 'normal').length || 0;
    const avgSolarRatio = totalDays > 0
      ? (solarData || []).reduce((sum: number, s: any) => sum + parseFloat(s.solar_ratio), 0) / totalDays
      : 0;

    return NextResponse.json({
      success: true,
      location: {
        projectId: location.project_id,
        projectName: location.project_name,
        lat: location.lat,
        lon: location.lon,
      },
      dateRange: { startDate, endDate },
      statistics: {
        totalDays,
        lowSolarDays,
        lowSolarPercent: totalDays > 0 ? ((lowSolarDays / totalDays) * 100).toFixed(1) : '0',
        avgSolarRatio: avgSolarRatio.toFixed(3),
        avgDailyGhi: totalDays > 0
          ? ((solarData || []).reduce((sum: number, s: any) => sum + parseFloat(s.cloudy_sky_ghi), 0) / totalDays).toFixed(1)
          : '0',
      },
      combinedData,
      monthlySummary,
    });
  } catch (error: any) {
    if (error.message === 'Unauthorized' || error.message.includes('Admin')) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }
    console.error('[SolarHistory] Error:', error);
    return NextResponse.json({ error: 'Failed to fetch solar history' }, { status: 500 });
  }
}
