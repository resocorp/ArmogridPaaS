/**
 * Test Script: Meter ID Resolution
 *
 * Tests the full meter ID resolution flow:
 * 1. isValidMeterId format check (local) - old vs new regex
 * 2. /api/meters/validate endpoint (resolves meter ID -> room number)
 * 3. Direct IoT API call (getMeterInfoById) to confirm the raw response
 *
 * Usage: node scripts/test-meter-id-resolution.mjs [meterId]
 * Example: node scripts/test-meter-id-resolution.mjs 36
 */

import { createHash } from 'crypto';

const BASE_URL = 'http://localhost:3000';
const IOT_BASE_URL = process.env.IOT_BASE_URL || 'http://46.101.88.194';
const IOT_ADMIN_USERNAME = process.env.IOT_ADMIN_USERNAME || 'admin';
const IOT_ADMIN_PASSWORD = process.env.IOT_ADMIN_PASSWORD || 'MQptQ8JT_V:KeLr';

const TEST_METER_IDS = process.argv[2]
  ? [process.argv[2]]
  : ['36', '55', '38', '1234', '0001']; // Test various lengths

// ── Helpers ──────────────────────────────────────────────────────────────────

function isValidMeterId_OLD(meterId) {
  return /^\d{4,20}$/.test(meterId);
}

function isValidMeterId_NEW(meterId) {
  return /^\d{1,20}$/.test(meterId);
}

async function iotRequest(endpoint, options = {}) {
  const { token, body, method = 'POST' } = options;
  const url = `${IOT_BASE_URL}${endpoint}`;

  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['token'] = token;

  const res = await fetch(url, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`IoT API ${res.status}: ${text}`);
  }
  return res.json();
}

async function getAdminToken() {
  const hashedPassword = createHash('md5').update(IOT_ADMIN_PASSWORD).digest('hex');

  const response = await iotRequest('/basic/prepayment/app/appUserLogin', {
    body: { username: IOT_ADMIN_USERNAME, password: hashedPassword, type: 0 },
  });

  if (response.success === '1' && response.data) return response.data;
  if ((response.code === 200 || response.code === 0) && response.data) return response.data;
  throw new Error(`Login failed: ${JSON.stringify(response)}`);
}

async function testAppValidateEndpoint(meterId) {
  const res = await fetch(`${BASE_URL}/api/meters/validate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ meterId }),
  });
  const data = await res.json();
  return { status: res.status, data };
}

async function testDirectIotLookup(meterId, adminToken) {
  return iotRequest('/basic/prepayment/app/MeterInfo', {
    token: adminToken,
    body: { meterId },
  });
}

// ── Main ─────────────────────────────────────────────────────────────────────

console.log('='.repeat(60));
console.log('  METER ID RESOLUTION TEST');
console.log('='.repeat(60));
console.log(`  App base URL : ${BASE_URL}`);
console.log(`  IoT base URL : ${IOT_BASE_URL}`);
console.log(`  Test IDs     : ${TEST_METER_IDS.join(', ')}`);
console.log('='.repeat(60));

// Step 1: Local regex validation
console.log('\n[1] LOCAL isValidMeterId CHECK (old \\d{4,20} vs new \\d{1,20})');
console.log('-'.repeat(60));
for (const id of TEST_METER_IDS) {
  const oldResult = isValidMeterId_OLD(id);
  const newResult = isValidMeterId_NEW(id);
  const changed = oldResult !== newResult ? ' ← FIXED' : '';
  console.log(
    `  meterId="${id.padEnd(6)}" | OLD: ${oldResult ? '✓ PASS' : '✗ FAIL'} | NEW: ${newResult ? '✓ PASS' : '✗ FAIL'}${changed}`
  );
}

// Step 2: App /api/meters/validate endpoint
console.log('\n[2] APP /api/meters/validate ENDPOINT (requires dev server running)');
console.log('-'.repeat(60));
for (const id of TEST_METER_IDS) {
  try {
    const { status, data } = await testAppValidateEndpoint(id);
    if (status === 400) {
      console.log(`  meterId="${id}" | HTTP ${status} | ✗ REJECTED: ${data.error}`);
    } else if (data.found) {
      console.log(`  meterId="${id}" | HTTP ${status} | ✓ FOUND | roomNo="${data.roomNo}"`);
    } else {
      console.log(`  meterId="${id}" | HTTP ${status} | ✗ NOT FOUND | msg="${data.message}"`);
    }
  } catch (err) {
    console.log(`  meterId="${id}" | ✗ REQUEST FAILED: ${err.message}`);
  }
}

// Step 3: Direct IoT API lookup
console.log('\n[3] DIRECT IoT API /MeterInfo (bypasses app validation)');
console.log('-'.repeat(60));
let adminToken;
try {
  adminToken = await getAdminToken();
  console.log(`  Admin token obtained: ${adminToken.substring(0, 20)}...`);
} catch (err) {
  console.error(`  ✗ Failed to get admin token: ${err.message}`);
  process.exit(1);
}

for (const id of TEST_METER_IDS) {
  try {
    const response = await testDirectIotLookup(id, adminToken);
    const isSuccess = response.success === '1' || response.code === 200 || response.code === 0;
    if (isSuccess) {
      const roomNo = response.data?.roomNo || response.data?.roomno || '(none)';
      const balance = response.data?.balance ?? '(none)';
      console.log(`  meterId="${id}" | ✓ SUCCESS | roomNo="${roomNo}" | balance="${balance}"`);
    } else {
      console.log(
        `  meterId="${id}" | ✗ FAILED | success="${response.success}" errorMsg="${response.errorMsg || response.msg}"`
      );
    }
    console.log(`    Raw: ${JSON.stringify(response).substring(0, 250)}`);
  } catch (err) {
    console.log(`  meterId="${id}" | ✗ REQUEST FAILED: ${err.message}`);
  }
}

console.log('\n' + '='.repeat(60));
console.log('  TEST COMPLETE');
console.log('='.repeat(60));
