/**
 * Test Script: Payment Initialization Flow
 *
 * Simulates exactly what happens when the user clicks "Pay" on the Quick Recharge
 * or Dashboard meters page. Tests:
 * 1. Local isValidMeterId check (the gate that was blocking short IDs)
 * 2. POST /api/payment/initialize  (the full server-side flow)
 *    - meter existence check via IoT API
 *    - Paystack initialization
 * 3. Diagnoses the exact error message returned at each stage
 *
 * Usage: node scripts/test-payment-init.mjs [meterId] [amount] [email]
 * Example: node scripts/test-payment-init.mjs 36 500 test@example.com
 */

const BASE_URL = 'http://localhost:3000';

const METER_ID = process.argv[2] || '36';
const AMOUNT   = Number(process.argv[3]) || 500;
const EMAIL    = process.argv[4] || 'test@example.com';

// ── Helpers ───────────────────────────────────────────────────────────────────

function isValidMeterId_OLD(meterId) {
  return /^\d{4,20}$/.test(meterId);
}

function isValidMeterId_NEW(meterId) {
  return /^\d{1,20}$/.test(meterId);
}

function section(title) {
  console.log('\n' + '='.repeat(60));
  console.log(`  ${title}`);
  console.log('='.repeat(60));
}

function step(n, title) {
  console.log(`\n[${n}] ${title}`);
  console.log('-'.repeat(60));
}

// ── Main ──────────────────────────────────────────────────────────────────────

section('PAYMENT INITIALIZATION FLOW TEST');
console.log(`  meterId : "${METER_ID}"`);
console.log(`  amount  : ${AMOUNT} NGN`);
console.log(`  email   : ${EMAIL}`);
console.log(`  app URL : ${BASE_URL}`);

// ── Step 1: Client-side gate (isValidMeterId) ─────────────────────────────────
step(1, 'CLIENT-SIDE isValidMeterId CHECK');

const oldPass = isValidMeterId_OLD(METER_ID);
const newPass = isValidMeterId_NEW(METER_ID);

console.log(`  OLD regex (\\d{4,20}): ${oldPass ? '✓ PASS — would proceed' : '✗ FAIL — would show "Please enter a valid meter ID" and STOP'}`);
console.log(`  NEW regex (\\d{1,20}): ${newPass ? '✓ PASS — proceeds to server' : '✗ FAIL — still blocked'}`);

if (!newPass) {
  console.log('\n  ✗ meterId fails even the new regex. Check the value.');
  process.exit(1);
}

if (!oldPass) {
  console.log('\n  *** This was the root cause — old regex blocked short IDs before any server call ***');
}

// ── Step 2: Server-side /api/payment/initialize ───────────────────────────────
step(2, 'SERVER POST /api/payment/initialize');
console.log(`  Sending: { meterId: "${METER_ID}", amount: ${AMOUNT}, email: "${EMAIL}" }`);

let initResponse;
let initData;
try {
  initResponse = await fetch(`${BASE_URL}/api/payment/initialize`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ meterId: METER_ID, amount: AMOUNT, email: EMAIL }),
  });
  initData = await initResponse.json();
} catch (err) {
  console.error(`  ✗ Network error reaching ${BASE_URL}: ${err.message}`);
  console.error('    Is the dev server running? (npm run dev)');
  process.exit(1);
}

console.log(`  HTTP Status : ${initResponse.status}`);

if (!initResponse.ok) {
  console.log(`  ✗ FAILED`);
  console.log(`  Error       : ${initData.error}`);
  console.log(`  Full body   : ${JSON.stringify(initData)}`);

  // Diagnose which stage failed
  if (initData.error?.includes('Valid meter ID')) {
    console.log('\n  DIAGNOSIS: Server-side isValidMeterId rejected the ID.');
    console.log('  Check: lib/utils.ts isValidMeterId regex');
  } else if (initData.error?.includes('Meter not found') || initData.error?.includes('meter')) {
    console.log('\n  DIAGNOSIS: Meter lookup failed on IoT platform.');
    console.log('  The meter ID format is accepted but the IoT API returned an error.');
    console.log('  Run test-meter-id-resolution.mjs to check IoT API directly.');
  } else if (initData.error?.includes('Amount')) {
    console.log('\n  DIAGNOSIS: Amount validation failed.');
    console.log(`  Min: 500 NGN, Max: 5,000,000 NGN. You sent: ${AMOUNT}`);
  } else if (initData.error?.includes('email')) {
    console.log('\n  DIAGNOSIS: Email validation failed.');
  } else if (initData.error?.includes('Paystack') || initData.error?.includes('payment')) {
    console.log('\n  DIAGNOSIS: Paystack initialization failed.');
    console.log('  Check PAYSTACK_SECRET_KEY in .env.local');
  } else {
    console.log('\n  DIAGNOSIS: Unknown error — check server logs.');
  }
} else {
  console.log(`  ✓ SUCCESS`);
  console.log(`  reference         : ${initData.data?.reference}`);
  console.log(`  access_code       : ${initData.data?.access_code}`);
  console.log(`  authorization_url : ${initData.data?.authorization_url}`);
  console.log('\n  Payment initialized successfully. The Paystack popup/redirect URL is ready.');
  console.log('  In a browser this would open the Paystack payment page.');
}

// ── Step 3: Server-side /api/meters/validate (the onBlur resolution) ──────────
step(3, 'SERVER POST /api/meters/validate (room number resolution on blur)');
console.log(`  Sending: { meterId: "${METER_ID}" }`);

let valResponse;
let valData;
try {
  valResponse = await fetch(`${BASE_URL}/api/meters/validate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ meterId: METER_ID }),
  });
  valData = await valResponse.json();
} catch (err) {
  console.error(`  ✗ Network error: ${err.message}`);
  process.exit(1);
}

console.log(`  HTTP Status : ${valResponse.status}`);

if (valResponse.status === 400) {
  console.log(`  ✗ REJECTED by server: ${valData.error}`);
  console.log('  DIAGNOSIS: Server-side isValidMeterId in /api/meters/validate rejected the ID.');
  console.log('  This means the room number will NOT appear under the Meter ID field.');
} else if (valData.found) {
  console.log(`  ✓ FOUND`);
  console.log(`  roomNo  : "${valData.roomNo}"`);
  console.log(`  meterId : "${valData.meterId}"`);
  console.log('\n  Room number resolution is working correctly.');
} else {
  console.log(`  ✗ NOT FOUND: ${valData.message}`);
  console.log('  The meter ID passes format validation but the IoT API could not find it.');
}

console.log('\n' + '='.repeat(60));
console.log('  TEST COMPLETE');
console.log('='.repeat(60));
