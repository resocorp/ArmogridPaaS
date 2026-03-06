import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { solarClient } from '@/lib/solar-client';
import {
  sendSolarAdvisorySms,
  sendSolarAdvisoryToAdmin,
  sendRechargeRecommendationSms,
} from '@/lib/sms';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

/**
 * GET /api/cron/solar-advisory
 * Daily cron job to check tomorrow's solar forecast and send advisory SMS
 * Should be called daily in the evening (e.g., 6 PM WAT)
 */
export async function GET(request: NextRequest) {
  try {
    // Verify cron secret if configured
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;

    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log('[SolarAdvisory] Starting solar advisory check...');

    // Check if solar advisory is enabled
    const { data: settings } = await supabaseAdmin
      .from('admin_settings')
      .select('key, value')
      .in('key', [
        'solar_advisory_enabled',
        'sms_solar_advisory_enabled',
        'openweathermap_api_key',
        'solar_forecast_days',
      ]);

    const settingsMap: Record<string, string> = {};
    settings?.forEach((s: any) => {
      settingsMap[s.key] = s.value;
    });

    if (settingsMap.solar_advisory_enabled !== 'true') {
      console.log('[SolarAdvisory] Solar advisory is disabled');
      return NextResponse.json({
        success: true,
        message: 'Solar advisory is disabled',
      });
    }

    if (!settingsMap.openweathermap_api_key) {
      console.log('[SolarAdvisory] OpenWeatherMap API key not configured');
      return NextResponse.json({
        success: false,
        error: 'OpenWeatherMap API key not configured',
      });
    }

    const forecastDays = parseInt(settingsMap.solar_forecast_days || '7');
    const smsEnabled = settingsMap.sms_solar_advisory_enabled !== 'false';

    // Get all enabled solar project locations
    const { data: locations, error: locError } = await supabaseAdmin
      .from('solar_project_locations')
      .select('*')
      .eq('enabled', true);

    if (locError || !locations || locations.length === 0) {
      console.log('[SolarAdvisory] No solar project locations configured');
      return NextResponse.json({
        success: true,
        message: 'No solar project locations configured',
        locationsChecked: 0,
      });
    }

    console.log(`[SolarAdvisory] Checking ${locations.length} locations...`);

    // Tomorrow's date
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = tomorrow.toISOString().split('T')[0];

    // Load derating factor from admin settings
    const { data: extraSettings } = await supabaseAdmin
      .from('admin_settings')
      .select('key, value')
      .in('key', ['solar_derating_factor']);

    const extraMap: Record<string, string> = {};
    extraSettings?.forEach((s: any) => { extraMap[s.key] = s.value; });
    const deratingFactor = parseFloat(extraMap.solar_derating_factor || '0.78');

    let totalAdvisoriesSent = 0;
    let totalCustomersNotified = 0;
    const results: Array<{
      projectId: string;
      projectName: string;
      solarRatio: number;
      advisoryLevel: string;
      customersNotified: number;
    }> = [];

    for (const location of locations) {
      try {
        console.log(`[SolarAdvisory] Fetching forecast for ${location.project_name} (${location.lat}, ${location.lon})...`);

        // Panel config for kWh estimation
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

        // Find tomorrow in the forecast
        const tomorrowData = forecastDays.find(d => d.date === tomorrowStr);
        if (!tomorrowData) {
          console.log(`[SolarAdvisory] No forecast data for tomorrow (${tomorrowStr}) at ${location.project_name}`);
          continue;
        }

        // Determine advisory level
        const advisoryLevel = await solarClient.getAdvisoryLevel(tomorrowData.solarRatio);
        const solarPercent = Math.round(tomorrowData.solarRatio * 100);
        const weatherDesc = tomorrowData.weatherSummary || undefined;

        console.log(`[SolarAdvisory] ${location.project_name}: Solar ratio=${tomorrowData.solarRatio.toFixed(3)}, Level=${advisoryLevel}, UVI=${tomorrowData.uvi}, Clouds=${tomorrowData.clouds}%, Est kWh=${tomorrowData.estimatedKwh.toFixed(2)}`);

        // Store ALL forecast days in database (single API call, multiple upserts)
        for (const day of forecastDays) {
          const dayLevel = await solarClient.getAdvisoryLevel(day.solarRatio);
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
                advisory_level: dayLevel,
                hourly_data: null,
                updated_at: new Date().toISOString(),
              },
              { onConflict: 'project_id,forecast_date' }
            );
        }

        // Send advisory SMS if level is not normal
        let customersNotified = 0;

        if (advisoryLevel !== 'normal' && smsEnabled) {
          // Check if advisory was already sent for this location + date
          const { data: existingForecast } = await supabaseAdmin
            .from('solar_forecasts')
            .select('advisory_sent')
            .eq('project_id', location.project_id)
            .eq('forecast_date', tomorrowStr)
            .single();

          if (existingForecast?.advisory_sent) {
            console.log(`[SolarAdvisory] Advisory already sent for ${location.project_name} on ${tomorrowStr}`);
          } else {
            // Get customers registered at this location
            const { data: customers } = await supabaseAdmin
              .from('customer_registrations')
              .select('name, phone')
              .eq('location_id', location.project_id)
              .in('payment_status', ['success', 'completed']);

            if (customers && customers.length > 0) {
              console.log(`[SolarAdvisory] Sending advisory to ${customers.length} customers at ${location.project_name}`);

              for (const customer of customers) {
                if (customer.phone) {
                  try {
                    await sendSolarAdvisorySms({
                      name: customer.name,
                      phone: customer.phone,
                      locationName: location.project_name || 'Your Location',
                      solarPercent,
                      advisoryLevel: advisoryLevel as 'low' | 'very_low' | 'critical',
                      weatherDesc,
                    });
                    customersNotified++;
                  } catch (err) {
                    console.error(`[SolarAdvisory] Failed to send SMS to ${customer.phone}:`, err);
                  }
                }
              }
            }

            // Send admin notification
            await sendSolarAdvisoryToAdmin({
              locationName: location.project_name || location.project_id,
              solarPercent,
              advisoryLevel,
              weatherDesc,
              customersNotified,
            });

            // Mark advisory as sent
            await supabaseAdmin
              .from('solar_forecasts')
              .update({
                advisory_sent: true,
                advisory_sent_at: new Date().toISOString(),
              })
              .eq('project_id', location.project_id)
              .eq('forecast_date', tomorrowStr);

            totalAdvisoriesSent++;
          }
        }

        totalCustomersNotified += customersNotified;

        results.push({
          projectId: location.project_id,
          projectName: location.project_name || location.project_id,
          solarRatio: tomorrowData.solarRatio,
          advisoryLevel,
          customersNotified,
        });
      } catch (err: any) {
        console.error(`[SolarAdvisory] Error processing ${location.project_name}:`, err);
        results.push({
          projectId: location.project_id,
          projectName: location.project_name || location.project_id,
          solarRatio: -1,
          advisoryLevel: 'error',
          customersNotified: 0,
        });
      }
    }

    console.log(`[SolarAdvisory] Complete. Advisories sent: ${totalAdvisoriesSent}, Customers notified: ${totalCustomersNotified}`);

    return NextResponse.json({
      success: true,
      forecastDate: tomorrowStr,
      locationsChecked: locations.length,
      advisoriesSent: totalAdvisoriesSent,
      customersNotified: totalCustomersNotified,
      results,
    });
  } catch (error: any) {
    console.error('[SolarAdvisory] Solar advisory check failed:', error);
    return NextResponse.json(
      { error: 'Solar advisory check failed', message: error.message },
      { status: 500 }
    );
  }
}
