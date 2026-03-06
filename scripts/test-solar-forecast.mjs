/**
 * Test script: Verify OWM FREE APIs work and produce meaningful kWh estimates.
 * Uses /data/2.5/forecast (5-day/3-hour) which IS free — not One Call 3.0 (paid).
 * 
 * Usage:
 *   node scripts/test-solar-forecast.mjs
 */

import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

// ---------------------------------------------------------------------------
// Config – RUBEZ VILLA IFITE AWKA
// ---------------------------------------------------------------------------
const LAT = 6.257027;
const LON = 7.104275;
const PANEL_CAPACITY_KW = 10;      // 10 kW system
const PEAK_SUN_HOURS = 5.0;        // SE Nigeria default
const DERATING_FACTOR = 0.78;

// ---------------------------------------------------------------------------
// Helpers (must match lib/solar-client.ts)
// ---------------------------------------------------------------------------

/** Estimate solar ratio from cloud cover (free tier — no UV available) */
function estimateSolarRatio(cloudCoverPct) {
  // Cloud cover attenuation: 0% clouds → 100%, 50% → 62.5%, 100% → 25%
  return Math.max(0.05, 1 - (cloudCoverPct / 100) * 0.75);
}

/** Estimate daily kWh from panel specs + solar ratio */
function estimateDailyKwh(panelCapacityKw, peakSunHours, solarRatio, deratingFactor) {
  return panelCapacityKw * peakSunHours * solarRatio * deratingFactor;
}

/** Aggregate 3-hour forecast intervals into daily summaries */
function aggregateToDays(list) {
  const days = {};
  for (const entry of list) {
    const date = entry.dt_txt.split(' ')[0];
    if (!days[date]) {
      days[date] = { 
        date, clouds: [], temps: [], rain: 0, wind: [], humidity: [],
        weather: entry.weather?.[0]?.description || '', pop: [], 
      };
    }
    days[date].clouds.push(entry.clouds?.all ?? 0);
    days[date].temps.push(entry.main?.temp ?? 0);
    days[date].humidity.push(entry.main?.humidity ?? 0);
    days[date].wind.push(entry.wind?.speed ?? 0);
    days[date].pop.push(entry.pop ?? 0);
    days[date].rain += entry.rain?.['3h'] ?? 0;
    // Keep daytime weather description (12:00 slot)
    if (entry.dt_txt.includes('12:00')) {
      days[date].weather = entry.weather?.[0]?.description || days[date].weather;
    }
  }
  return Object.values(days).map(d => ({
    date: d.date,
    avgCloud: d.clouds.reduce((a, b) => a + b, 0) / d.clouds.length,
    tempMin: Math.min(...d.temps),
    tempMax: Math.max(...d.temps),
    rain: d.rain,
    avgWind: d.wind.reduce((a, b) => a + b, 0) / d.wind.length,
    avgHumidity: d.humidity.reduce((a, b) => a + b, 0) / d.humidity.length,
    maxPop: Math.max(...d.pop),
    weather: d.weather,
    intervals: d.clouds.length,
  }));
}

// ---------------------------------------------------------------------------
// Load API key
// ---------------------------------------------------------------------------
function loadApiKeyFromEnv() {
  try {
    const envPath = resolve(__dirname, '..', '.env.local');
    const envContent = readFileSync(envPath, 'utf-8');
    for (const line of envContent.split('\n')) {
      if (line.startsWith('OPENWEATHERMAP_API_KEY=')) {
        return line.split('=').slice(1).join('=').trim();
      }
    }
  } catch { /* not found */ }
  return null;
}

async function loadApiKeyFromSupabase() {
  try {
    const envPath = resolve(__dirname, '..', '.env.local');
    const envContent = readFileSync(envPath, 'utf-8');
    let supabaseUrl = '', supabaseKey = '';
    for (const line of envContent.split('\n')) {
      if (line.startsWith('NEXT_PUBLIC_SUPABASE_URL=')) supabaseUrl = line.split('=').slice(1).join('=').trim();
      if (line.startsWith('SUPABASE_SERVICE_ROLE_KEY=')) supabaseKey = line.split('=').slice(1).join('=').trim();
    }
    if (!supabaseUrl || !supabaseKey) return null;

    const resp = await fetch(
      `${supabaseUrl}/rest/v1/admin_settings?key=eq.openweathermap_api_key&select=value`,
      {
        headers: {
          apikey: supabaseKey,
          Authorization: `Bearer ${supabaseKey}`,
        },
      }
    );
    const data = await resp.json();
    return data?.[0]?.value || null;
  } catch { return null; }
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
async function main() {
  console.log('=== Solar Forecast Test (Free Tier) ===\n');
  console.log(`Location: RUBEZ VILLA IFITE AWKA (${LAT}, ${LON})`);
  console.log(`Panel: ${PANEL_CAPACITY_KW} kW | Peak Sun: ${PEAK_SUN_HOURS}h | Derating: ${DERATING_FACTOR}\n`);

  // Get API key
  let apiKey = loadApiKeyFromEnv();
  if (!apiKey) {
    console.log('No OPENWEATHERMAP_API_KEY in .env.local, trying Supabase...');
    apiKey = await loadApiKeyFromSupabase();
  }
  if (!apiKey) {
    console.error('ERROR: Could not find OpenWeatherMap API key.');
    process.exit(1);
  }
  console.log(`API key: ${apiKey.substring(0, 6)}...${apiKey.substring(apiKey.length - 4)}\n`);

  // --- Test 1: Current Weather (/data/2.5/weather) — FREE ---
  console.log('--- Test 1: Current Weather API (free) ---');
  const currentUrl = `https://api.openweathermap.org/data/2.5/weather?lat=${LAT}&lon=${LON}&units=metric&appid=${apiKey}`;
  const currentResp = await fetch(currentUrl);
  if (!currentResp.ok) {
    console.error(`  FAIL: ${currentResp.status} ${await currentResp.text()}`);
  } else {
    const current = await currentResp.json();
    console.log(`  Temp: ${current.main?.temp}°C, Clouds: ${current.clouds?.all}%, Wind: ${current.wind?.speed} m/s`);
    console.log(`  Weather: ${current.weather?.[0]?.description}`);
    const ratio = estimateSolarRatio(current.clouds?.all || 0);
    console.log(`  Solar Ratio (from cloud cover): ${(ratio * 100).toFixed(1)}%`);
    console.log(`  ✅ Current Weather API works\n`);
  }

  // --- Test 2: 5-Day/3-Hour Forecast (/data/2.5/forecast) — FREE ---
  console.log('--- Test 2: 5-Day/3-Hour Forecast API (free) ---');
  const forecastUrl = `https://api.openweathermap.org/data/2.5/forecast?lat=${LAT}&lon=${LON}&units=metric&appid=${apiKey}`;
  const forecastResp = await fetch(forecastUrl);
  if (!forecastResp.ok) {
    const text = await forecastResp.text();
    console.error(`  FAIL: ${forecastResp.status} ${text}`);
    process.exit(1);
  }

  const forecastData = await forecastResp.json();
  console.log(`  City: ${forecastData.city?.name}, Country: ${forecastData.city?.country}`);
  console.log(`  Sunrise: ${new Date(forecastData.city?.sunrise * 1000).toISOString()}`);
  console.log(`  Sunset: ${new Date(forecastData.city?.sunset * 1000).toISOString()}`);
  console.log(`  3-hour intervals returned: ${forecastData.list?.length || 0}\n`);

  // Aggregate into daily summaries
  const dailySummaries = aggregateToDays(forecastData.list || []);

  console.log('=== 5-Day Solar Forecast ===\n');
  console.log(
    'Date'.padEnd(12) +
    'Cloud%'.padEnd(8) +
    'SolRatio'.padEnd(10) +
    'EstKwh'.padEnd(10) +
    'MaxKwh'.padEnd(10) +
    'Rain(mm)'.padEnd(10) +
    'Temp'.padEnd(12) +
    'Wind'.padEnd(8) +
    'Weather'
  );
  console.log('-'.repeat(95));

  let totalEstKwh = 0;
  let totalRatio = 0;

  for (const day of dailySummaries) {
    const solarRatio = estimateSolarRatio(day.avgCloud);
    const estKwh = estimateDailyKwh(PANEL_CAPACITY_KW, PEAK_SUN_HOURS, solarRatio, DERATING_FACTOR);
    const maxKwh = estimateDailyKwh(PANEL_CAPACITY_KW, PEAK_SUN_HOURS, 1.0, DERATING_FACTOR);
    totalEstKwh += estKwh;
    totalRatio += solarRatio;

    console.log(
      day.date.padEnd(12) +
      (day.avgCloud.toFixed(0) + '%').padEnd(8) +
      ((solarRatio * 100).toFixed(1) + '%').padEnd(10) +
      (estKwh.toFixed(2) + ' kWh').padEnd(10) +
      (maxKwh.toFixed(2) + ' kWh').padEnd(10) +
      (day.rain.toFixed(1) + ' mm').padEnd(10) +
      `${day.tempMin.toFixed(0)}-${day.tempMax.toFixed(0)}°C`.padEnd(12) +
      (day.avgWind.toFixed(1) + 'm/s').padEnd(8) +
      day.weather
    );
  }

  const count = dailySummaries.length;
  console.log(`\n=== Summary ===`);
  console.log(`Days forecasted: ${count}`);
  console.log(`Avg Solar Ratio: ${((totalRatio / count) * 100).toFixed(1)}%`);
  console.log(`Total Est. Generation: ${totalEstKwh.toFixed(2)} kWh`);
  console.log(`Avg Daily Est.: ${(totalEstKwh / count).toFixed(2)} kWh`);
  console.log(`Max Possible Daily (clear sky): ${estimateDailyKwh(PANEL_CAPACITY_KW, PEAK_SUN_HOURS, 1.0, DERATING_FACTOR).toFixed(2)} kWh`);

  // --- Test 3: Verify One Call 3.0 is NOT available (expected) ---
  console.log(`\n--- Test 3: One Call API 3.0 (expected to fail — paid) ---`);
  const oneCallUrl = `https://api.openweathermap.org/data/3.0/onecall?lat=${LAT}&lon=${LON}&exclude=minutely&units=metric&appid=${apiKey}`;
  const oneCallResp = await fetch(oneCallUrl);
  if (oneCallResp.ok) {
    console.log(`  ✅ One Call 3.0 IS available (unexpected — you have a paid plan!)`);
  } else {
    console.log(`  ❌ One Call 3.0 NOT available (${oneCallResp.status}) — as expected for free tier`);
    console.log(`  → Using 5-day/3-hour forecast API instead (✅ free)\n`);
  }

  console.log('=== RESULT ===');
  console.log('✅ Free-tier 5-day forecast API works. Solar kWh estimation produces meaningful values.');
  console.log('   Solar ratio is derived from cloud cover %. kWh = panelKw × peakSunHrs × solarRatio × derating.');
}

main().catch(console.error);
