/**
 * Authenticated end-to-end test: login → call forecast API → verify data.
 * Usage: node scripts/test-solar-authenticated.mjs
 */

import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const BASE = 'http://localhost:3000';

function loadEnv() {
  const envPath = resolve(__dirname, '..', '.env.local');
  const content = readFileSync(envPath, 'utf-8');
  const vars = {};
  for (const line of content.split('\n')) {
    const i = line.indexOf('=');
    if (i > 0 && !line.startsWith('#')) {
      vars[line.substring(0, i).trim()] = line.substring(i + 1).trim();
    }
  }
  return vars;
}

async function main() {
  const env = loadEnv();
  const username = env.IOT_ADMIN_USERNAME;
  const password = env.IOT_ADMIN_PASSWORD;

  if (!username || !password) {
    console.error('Missing IOT_ADMIN_USERNAME or IOT_ADMIN_PASSWORD in .env.local');
    process.exit(1);
  }

  console.log('=== Authenticated Solar Forecast Test ===\n');

  // Step 1: Login
  console.log('Step 1: Logging in as admin...');
  const loginResp = await fetch(`${BASE}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password, type: 0 }),
    redirect: 'manual',
  });

  const loginData = await loginResp.json();
  if (!loginData.success) {
    console.error('  Login FAILED:', loginData.error);
    process.exit(1);
  }

  // Extract session cookie from Set-Cookie header
  const setCookie = loginResp.headers.get('set-cookie');
  const sessionMatch = setCookie?.match(/armogrid_session=([^;]+)/);
  if (!sessionMatch) {
    console.error('  No session cookie in response');
    console.error('  Headers:', [...loginResp.headers.entries()]);
    process.exit(1);
  }
  const sessionCookie = `armogrid_session=${sessionMatch[1]}`;
  console.log(`  ✅ Logged in as ${loginData.data.username} (type=${loginData.data.userType})`);
  console.log(`  Session: ${sessionMatch[1].substring(0, 20)}...\n`);

  // Step 2: Call solar forecast API (no refresh — should read from DB)
  console.log('Step 2: Calling /api/admin/solar-forecast (cached)...');
  const forecastResp = await fetch(`${BASE}/api/admin/solar-forecast?days=7&includeToday=true`, {
    headers: { Cookie: sessionCookie },
  });

  if (!forecastResp.ok) {
    console.error(`  FAIL: ${forecastResp.status} ${await forecastResp.text()}`);
    process.exit(1);
  }

  const forecastData = await forecastResp.json();
  console.log(`  success: ${forecastData.success}`);
  console.log(`  forecasts: ${forecastData.forecasts?.length || 0} rows`);
  console.log(`  locations: ${Object.keys(forecastData.locationMap || {}).length}`);
  console.log(`  summary: ${JSON.stringify(forecastData.summary)}`);

  if (forecastData.forecasts && forecastData.forecasts.length > 0) {
    console.log('\n  Date        Ratio   Est kWh   Clouds  Advisory  Weather');
    console.log('  ' + '-'.repeat(70));
    for (const f of forecastData.forecasts) {
      const ratio = (parseFloat(f.solar_ratio) * 100).toFixed(0);
      const kwh = parseFloat(f.panel_energy_cloudy_sky).toFixed(2);
      console.log(
        `  ${f.forecast_date}  ${(ratio + '%').padEnd(8)}${(kwh + ' kWh').padEnd(10)}${(f.cloud_cover_pct + '%').padEnd(8)}${f.advisory_level.padEnd(10)}${f.weather_summary || ''}`
      );
    }
    console.log(`\n  ✅ Widget should display ${forecastData.forecasts.length} days of forecast data!`);
  } else {
    console.log('\n  ⚠️ No cached forecasts found. Testing with refresh=true...');

    // Step 3: Call with refresh to trigger API fetch
    console.log('\nStep 3: Calling /api/admin/solar-forecast?refresh=true...');
    const refreshResp = await fetch(`${BASE}/api/admin/solar-forecast?days=7&includeToday=true&refresh=true`, {
      headers: { Cookie: sessionCookie },
    });

    const refreshData = await refreshResp.json();
    console.log(`  success: ${refreshData.success}`);
    console.log(`  forecasts: ${refreshData.forecasts?.length || 0} rows`);

    if (refreshData.forecasts && refreshData.forecasts.length > 0) {
      for (const f of refreshData.forecasts) {
        const ratio = (parseFloat(f.solar_ratio) * 100).toFixed(0);
        const kwh = parseFloat(f.panel_energy_cloudy_sky).toFixed(2);
        console.log(`  ${f.forecast_date}  ${ratio}%  ${kwh} kWh  ${f.advisory_level}`);
      }
      console.log(`\n  ✅ Refresh worked! ${refreshData.forecasts.length} forecast rows stored.`);
    } else {
      console.error('  ❌ Still no forecasts after refresh. Check server logs.');
    }
  }

  console.log('\n=== DONE ===');
}

main().catch(err => { console.error('FATAL:', err); process.exit(1); });
