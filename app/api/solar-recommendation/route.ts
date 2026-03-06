import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { solarClient } from '@/lib/solar-client';

export const dynamic = 'force-dynamic';

/**
 * GET /api/solar-recommendation
 * Public endpoint for customers to get solar forecast status and recharge recommendations
 * Query params:
 *   - locationId: project/location ID
 *   - meterId: optional meter ID for personalized recommendations
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const locationId = searchParams.get('locationId');
    const meterId = searchParams.get('meterId');

    if (!locationId) {
      return NextResponse.json({ error: 'locationId is required' }, { status: 400 });
    }

    // Get the solar location
    const { data: location } = await supabaseAdmin
      .from('solar_project_locations')
      .select('*')
      .eq('project_id', locationId)
      .eq('enabled', true)
      .single();

    if (!location) {
      return NextResponse.json({
        success: true,
        available: false,
        message: 'Solar forecast not available for this location',
      });
    }

    // Get tomorrow's forecast
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = tomorrow.toISOString().split('T')[0];

    const { data: forecast } = await supabaseAdmin
      .from('solar_forecasts')
      .select('*')
      .eq('project_id', locationId)
      .eq('forecast_date', tomorrowStr)
      .single();

    // Get next 3 days of forecasts for multi-day recommendation
    const threeDaysOut = new Date();
    threeDaysOut.setDate(threeDaysOut.getDate() + 3);
    const threeDaysStr = threeDaysOut.toISOString().split('T')[0];

    const { data: upcomingForecasts } = await supabaseAdmin
      .from('solar_forecasts')
      .select('forecast_date, solar_ratio, advisory_level, weather_summary, cloud_cover_pct')
      .eq('project_id', locationId)
      .gte('forecast_date', tomorrowStr)
      .lte('forecast_date', threeDaysStr)
      .order('forecast_date', { ascending: true });

    // Count upcoming low solar days
    const lowSolarDays = (upcomingForecasts || []).filter(
      (f: any) => f.advisory_level !== 'normal'
    ).length;

    // Build response
    const result: any = {
      success: true,
      available: true,
      locationName: location.project_name || locationId,
      tomorrow: forecast
        ? {
            date: forecast.forecast_date,
            solarPercent: Math.round(parseFloat(forecast.solar_ratio as any) * 100),
            advisoryLevel: forecast.advisory_level,
            weatherSummary: forecast.weather_summary,
            cloudCover: forecast.cloud_cover_pct,
            sunrise: forecast.sunrise,
            sunset: forecast.sunset,
          }
        : null,
      upcomingDays: (upcomingForecasts || []).map((f: any) => ({
        date: f.forecast_date,
        solarPercent: Math.round(parseFloat(f.solar_ratio) * 100),
        advisoryLevel: f.advisory_level,
        weatherSummary: f.weather_summary,
      })),
      lowSolarDaysAhead: lowSolarDays,
    };

    // If meter ID provided, calculate personalized recharge recommendation
    if (meterId && forecast) {
      const { data: meterCred } = await supabaseAdmin
        .from('meter_credentials')
        .select('meter_data')
        .eq('room_no', meterId)
        .single();

      const balance = parseFloat(meterCred?.meter_data?.balance || '0');
      const solarRatio = parseFloat(forecast.solar_ratio as any);

      // Estimate average daily consumption from recent transactions
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const { data: recentTransactions } = await supabaseAdmin
        .from('transactions')
        .select('amount_kobo')
        .eq('meter_id', meterId)
        .eq('paystack_status', 'success')
        .gte('created_at', thirtyDaysAgo.toISOString());

      const totalSpent30Days = (recentTransactions || []).reduce(
        (sum: number, t: any) => sum + (t.amount_kobo / 100),
        0
      );
      const avgDailySpend = totalSpent30Days / 30;

      if (avgDailySpend > 0) {
        const recommendedAmount = solarClient.calculateRechargeRecommendation(
          avgDailySpend,
          solarRatio,
          lowSolarDays > 0 ? lowSolarDays + 1 : 2
        );

        result.recommendation = {
          currentBalance: balance,
          avgDailyConsumption: Math.round(avgDailySpend),
          recommendedRecharge: recommendedAmount,
          daysToCover: lowSolarDays > 0 ? lowSolarDays + 1 : 2,
          reason:
            solarRatio < 0.4
              ? `Low solar forecast (${Math.round(solarRatio * 100)}%) - extra credit recommended`
              : 'Standard recommendation based on your usage',
        };
      }
    }

    // Add a showBanner flag for frontend
    result.showBanner =
      forecast &&
      forecast.advisory_level !== 'normal' &&
      parseFloat(forecast.solar_ratio as any) < 0.5;

    return NextResponse.json(result);
  } catch (error: any) {
    console.error('[SolarRecommendation] Error:', error);
    return NextResponse.json(
      { error: 'Failed to get solar recommendation' },
      { status: 500 }
    );
  }
}
