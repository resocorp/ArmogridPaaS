/**
 * End-to-end solar forecast test.
 * 1. Reads OWM API key + solar locations from Supabase
 * 2. Calls the FREE /data/2.5/forecast API
 * 3. Computes solar ratio + estimated kWh
 * 4. Upserts into solar_forecasts table
 * 5. Reads back and prints the stored forecasts
 *
 * Usage:  node scripts/test-solar-e2e.mjs
 */

import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

// ---------------------------------------------------------------------------
// Load .env.local
// ---------------------------------------------------------------------------
function loadEnv() {
  const envPath = resolve(__dirname, '..', '.env.local');
  const envContent = readFileSync(envPath, 'utf-8');
  const vars = {};
  for (const line of envContent.split('\n')) {
    const eqIdx = line.indexOf('=');
    if (eqIdx > 0 && !line.startsWith('#')) {
      vars[line.substring(0, eqIdx).trim()] = line.substring(eqIdx + 1).trim();
    }
  }
  return vars;
}

// ---------------------------------------------------------------------------
// Supabase helpers
// ---------------------------------------------------------------------------
function sbHeaders(serviceKey) {
  return {
    apikey: serviceKey,
    Authorization: `Bearer ${serviceKey}`,
    'Content-Type': 'application/json',
    Prefer: 'return=representation',
  };
}

async function sbGet(url, key, query = '') {
  const resp = await fetch(`${url}/rest/v1/${query}`, { headers: sbHeaders(key) });
  if (!resp.ok) throw new Error(`Supabase GET ${query}: ${resp.status} ${await resp.text()}`);
  return resp.json();
}

async function sbUpsert(url, key, table, rows, onConflict = '') {
  const qs = onConflict ? `?on_conflict=${onConflict}` : '';
  const resp = await fetch(`${url}/rest/v1/${table}${qs}`, {
    method: 'POST',
    headers: {
      ...sbHeaders(key),
      Prefer: 'resolution=merge-duplicates,return=representation',
    },
    body: JSON.stringify(rows),
  });
  if (!resp.ok) throw new Error(`Supabase UPSERT ${table}: ${resp.status} ${await resp.text()}`);
  return resp.json();
}

// ---------------------------------------------------------------------------
// Solar helpers (must match lib/solar-client.ts)
// ---------------------------------------------------------------------------
function estimateSolarRatio(cloudCoverPct) {
  return Math.max(0.05, 1 - (cloudCoverPct / 100) * 0.75);
}

function estimateDailyKwh(panelCapacityKw, peakSunHours, solarRatio, deratingFactor) {
  return panelCapacityKw * peakSunHours * solarRatio * deratingFactor;
}

function aggregateToDays(list) {
  const days = {};
  for (const entry of list) {
    const date = entry.dt_txt.split(' ')[0];
    if (!days[date]) {
      days[date] = {
        date, clouds: [], temps: [], rain: 0, wind: [], humidity: [],
        weather: entry.weather?.[0]?.description || '',
        weatherIcon: entry.weather?.[0]?.icon || '',
        pop: [],
      };
    }
    const d = days[date];
    d.clouds.push(entry.clouds?.all ?? 0);
    d.temps.push(entry.main?.temp ?? 0);
    d.humidity.push(entry.main?.humidity ?? 0);
    d.wind.push(entry.wind?.speed ?? 0);
    d.pop.push(entry.pop ?? 0);
    d.rain += entry.rain?.['3h'] ?? 0;
    if (entry.dt_txt.includes('12:00')) {
      d.weather = entry.weather?.[0]?.description || d.weather;
      d.weatherIcon = entry.weather?.[0]?.icon || d.weatherIcon;
    }
  }
  return Object.values(days).map(d => ({
    date: d.date,
    avgCloud: d.clouds.reduce((a, b) => a + b, 0) / d.clouds.length,
    tempMin: Math.min(...d.temps),
    tempMax: Math.max(...d.temps),
    rain: d.rain,
    avgWind: +(d.wind.reduce((a, b) => a + b, 0) / d.wind.length).toFixed(1),
    avgHumidity: Math.round(d.humidity.reduce((a, b) => a + b, 0) / d.humidity.length),
    maxPop: Math.max(...d.pop),
    weather: d.weather,
    weatherIcon: d.weatherIcon,
  }));
}

function getAdvisoryLevel(solarRatio, thresholds) {
  if (solarRatio <= thresholds.critical) return 'critical';
  if (solarRatio <= thresholds.veryLow) return 'very_low';
  if (solarRatio <= thresholds.low) return 'low';
  return 'normal';
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
async function main() {
  console.log('=== Solar Forecast End-to-End Test ===\n');

  const env = loadEnv();
  const sbUrl = env.NEXT_PUBLIC_SUPABASE_URL;
  const sbKey = env.SUPABASE_SERVICE_ROLE_KEY;
  if (!sbUrl || !sbKey) { console.error('Missing SUPABASE env vars'); process.exit(1); }

  // Step 1: Get OWM API key from admin_settings
  console.log('Step 1: Loading OWM API key from admin_settings...');
  const apiKeyRows = await sbGet(sbUrl, sbKey, 'admin_settings?key=eq.openweathermap_api_key&select=value');
  const apiKey = apiKeyRows?.[0]?.value;
  if (!apiKey) { console.error('  ERROR: No OWM API key in admin_settings'); process.exit(1); }
  console.log(`  API key: ${apiKey.substring(0, 6)}...${apiKey.slice(-4)}\n`);

  // Step 2: Get advisory thresholds
  const thresholdRows = await sbGet(sbUrl, sbKey,
    'admin_settings?key=in.(solar_advisory_threshold,solar_very_low_threshold,solar_critical_threshold,solar_derating_factor)&select=key,value');
  const tMap = {};
  thresholdRows.forEach(r => { tMap[r.key] = r.value; });
  const thresholds = {
    low: parseFloat(tMap.solar_advisory_threshold || '0.40'),
    veryLow: parseFloat(tMap.solar_very_low_threshold || '0.25'),
    critical: parseFloat(tMap.solar_critical_threshold || '0.15'),
  };
  const deratingFactor = parseFloat(tMap.solar_derating_factor || '0.78');
  console.log(`Step 2: Thresholds: low=${thresholds.low}, veryLow=${thresholds.veryLow}, critical=${thresholds.critical}, derating=${deratingFactor}\n`);

  // Step 3: Get solar project locations
  console.log('Step 3: Loading solar project locations...');
  const locations = await sbGet(sbUrl, sbKey, 'solar_project_locations?enabled=eq.true&select=*');
  if (!locations || locations.length === 0) {
    console.error('  ERROR: No enabled solar project locations found');
    process.exit(1);
  }
  console.log(`  Found ${locations.length} location(s)\n`);

  for (const loc of locations) {
    const panelConfig = loc.panel_config || {};
    const panelCapacityKw = parseFloat(panelConfig.peak_power || '0');
    const peakSunHours = parseFloat(panelConfig.peak_sun_hours || '5.0');

    console.log(`--- ${loc.project_name} (${loc.lat}, ${loc.lon}) ---`);
    console.log(`  Panel: ${panelCapacityKw} kW | Peak Sun: ${peakSunHours}h | Derating: ${deratingFactor}`);

    // Step 4: Call FREE 5-day forecast API
    console.log('  Step 4: Calling /data/2.5/forecast...');
    const forecastUrl = `https://api.openweathermap.org/data/2.5/forecast?lat=${loc.lat}&lon=${loc.lon}&units=metric&appid=${apiKey}`;
    const resp = await fetch(forecastUrl);
    if (!resp.ok) {
      console.error(`  ERROR: OWM API ${resp.status}: ${await resp.text()}`);
      continue;
    }
    const forecastData = await resp.json();
    const sunrise = forecastData.city?.sunrise ? new Date(forecastData.city.sunrise * 1000).toISOString() : null;
    const sunset = forecastData.city?.sunset ? new Date(forecastData.city.sunset * 1000).toISOString() : null;
    console.log(`  City: ${forecastData.city?.name}, intervals: ${forecastData.list?.length}`);

    // Step 5: Aggregate + compute
    const dailySummaries = aggregateToDays(forecastData.list || []);
    console.log(`  Days aggregated: ${dailySummaries.length}\n`);

    const dbRows = [];
    console.log('  Date        Cloud%  SolRatio  EstKwh    Advisory  Weather');
    console.log('  ' + '-'.repeat(75));

    for (const day of dailySummaries) {
      const solarRatio = estimateSolarRatio(day.avgCloud);
      const estKwh = estimateDailyKwh(panelCapacityKw, peakSunHours, solarRatio, deratingFactor);
      const maxKwh = estimateDailyKwh(panelCapacityKw, peakSunHours, 1.0, deratingFactor);
      const advisory = getAdvisoryLevel(solarRatio, thresholds);

      const desc = day.weather ? day.weather.charAt(0).toUpperCase() + day.weather.slice(1) : '';
      const parts = [desc];
      if (day.rain > 0) parts.push(`${day.rain.toFixed(1)}mm rain`);
      if (day.avgCloud > 70) parts.push(`${Math.round(day.avgCloud)}% clouds`);
      const weatherSummary = parts.filter(Boolean).join('. ');

      console.log(
        `  ${day.date}  ${String(Math.round(day.avgCloud) + '%').padEnd(8)}${((solarRatio * 100).toFixed(1) + '%').padEnd(10)}${(estKwh.toFixed(2) + ' kWh').padEnd(10)}${advisory.padEnd(10)}${day.weather}`
      );

      dbRows.push({
        project_id: loc.project_id,
        forecast_date: day.date,
        clear_sky_ghi: 0,
        clear_sky_dni: 0,
        clear_sky_dhi: 0,
        cloudy_sky_ghi: 0,
        cloudy_sky_dni: 0,
        cloudy_sky_dhi: 0,
        solar_ratio: solarRatio,
        panel_energy_clear_sky: maxKwh,
        panel_energy_cloudy_sky: estKwh,
        sunrise,
        sunset,
        weather_summary: weatherSummary || null,
        weather_icon: day.weatherIcon || null,
        cloud_cover_pct: Math.round(day.avgCloud),
        temp_min: day.tempMin,
        temp_max: day.tempMax,
        rain_mm: day.rain,
        wind_speed: day.avgWind,
        humidity: day.avgHumidity,
        advisory_level: advisory,
        hourly_data: null,
        updated_at: new Date().toISOString(),
      });
    }

    // Step 6: Upsert into solar_forecasts
    console.log(`\n  Step 6: Upserting ${dbRows.length} rows into solar_forecasts...`);
    try {
      const result = await sbUpsert(sbUrl, sbKey, 'solar_forecasts', dbRows, 'project_id,forecast_date');
      console.log(`  ✅ Upserted ${result.length} rows\n`);
    } catch (err) {
      console.error(`  ERROR upserting: ${err.message}\n`);
    }
  }

  // Step 7: Read back and verify
  console.log('Step 7: Verifying stored forecasts...');
  const today = new Date().toISOString().split('T')[0];
  const stored = await sbGet(sbUrl, sbKey,
    `solar_forecasts?forecast_date=gte.${today}&order=forecast_date.asc&select=project_id,forecast_date,solar_ratio,panel_energy_cloudy_sky,cloud_cover_pct,advisory_level,weather_summary`);

  if (!stored || stored.length === 0) {
    console.error('  ERROR: No forecasts found in DB after upsert!');
    process.exit(1);
  }

  console.log(`\n  Found ${stored.length} forecast rows in DB:\n`);
  console.log('  Project ID                     Date        Ratio   Est kWh  Clouds  Advisory');
  console.log('  ' + '-'.repeat(85));
  for (const row of stored) {
    console.log(
      `  ${String(row.project_id).substring(0, 30).padEnd(33)}${row.forecast_date}  ${((parseFloat(row.solar_ratio) * 100).toFixed(0) + '%').padEnd(8)}${(parseFloat(row.panel_energy_cloudy_sky).toFixed(2) + ' kWh').padEnd(9)}${String(row.cloud_cover_pct + '%').padEnd(8)}${row.advisory_level}`
    );
  }

  console.log('\n=== DONE ===');
  console.log('✅ Solar forecasts are in the DB. The dashboard widget should now display them.');
  console.log('   Navigate to Admin Panel → Solar tab to verify.');
}

main().catch(err => { console.error('FATAL:', err); process.exit(1); });
