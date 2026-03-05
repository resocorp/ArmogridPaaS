/**
 * ArmogridPaaS Cron Worker
 * Run on DigitalOcean VPS with PM2 for reliable scheduling
 *
 * Setup:
 *   npm install -g pm2
 *   pm2 start scripts/cron-worker.mjs --name armogrid-cron
 *   pm2 save && pm2 startup
 *
 * Required env vars (set in .env or PM2 ecosystem config):
 *   APP_URL          - e.g. https://yourdomain.com or http://localhost:3000
 *   CRON_SECRET      - must match CRON_SECRET in your Next.js app
 */

const APP_URL = process.env.APP_URL || process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
const CRON_SECRET = process.env.CRON_SECRET || '';

if (!CRON_SECRET) {
  console.warn('[Cron Worker] WARNING: CRON_SECRET is not set. Endpoints are unprotected.');
}

const headers = {
  'Authorization': `Bearer ${CRON_SECRET}`,
  'Content-Type': 'application/json',
};

async function callCronEndpoint(path) {
  const url = `${APP_URL}${path}`;
  const start = Date.now();
  try {
    const response = await fetch(url, { method: 'GET', headers });
    const elapsed = Date.now() - start;
    if (!response.ok) {
      console.error(`[${ts()}] ERROR ${path} - HTTP ${response.status} (${elapsed}ms)`);
      return;
    }
    const data = await response.json();
    console.log(`[${ts()}] OK ${path} (${elapsed}ms)`, JSON.stringify(data));
  } catch (err) {
    console.error(`[${ts()}] FAIL ${path} - ${err.message}`);
  }
}

function ts() {
  return new Date().toISOString();
}

// ── Schedule definitions ────────────────────────────────────────────────────

const FIVE_MINUTES   = 5  * 60 * 1000;
const FIFTEEN_MINUTES = 15 * 60 * 1000;
const ONE_DAY        = 24 * 60 * 60 * 1000;

// Power readings every 5 minutes → 5-min resolution on the Live Power chart
setInterval(() => callCronEndpoint('/api/cron/power-readings'), FIVE_MINUTES);

// Meter offline monitoring every 15 minutes
setInterval(() => callCronEndpoint('/api/cron/monitor-meters'), FIFTEEN_MINUTES);

// Low-credit SMS alerts once per day
setInterval(() => callCronEndpoint('/api/cron/low-credit-alerts'), ONE_DAY);

// ── Run immediately on startup ──────────────────────────────────────────────
console.log(`[${ts()}] ArmogridPaaS Cron Worker started`);
console.log(`[${ts()}]   APP_URL          : ${APP_URL}`);
console.log(`[${ts()}]   Power readings   : every 5 minutes`);
console.log(`[${ts()}]   Meter monitoring : every 15 minutes`);
console.log(`[${ts()}]   Low-credit alerts: every 24 hours`);
console.log('');

callCronEndpoint('/api/cron/power-readings');
callCronEndpoint('/api/cron/monitor-meters');
callCronEndpoint('/api/cron/low-credit-alerts');
