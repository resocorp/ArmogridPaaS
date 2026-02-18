/**
 * IvoryPay Bank Transfer API Test Script
 * Run with: npx ts-node scripts/test-bank-transfer.ts
 */

import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env.local
const envPath = path.join(__dirname, '..', '.env.local');
const envContent = fs.readFileSync(envPath, 'utf-8');
envContent.split('\n').forEach(line => {
  const [key, ...valueParts] = line.split('=');
  if (key && valueParts.length > 0) {
    process.env[key.trim()] = valueParts.join('=').trim();
  }
});

const IVORYPAY_SECRET_KEY = process.env.IVORYPAY_SECRET_KEY!;
const IVORYPAY_API_URL = 'https://api.ivorypay.io/api/v1';

function generateUuidV4(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

async function testBuyCryptoAPI() {
  console.log('\n========================================');
  console.log('Testing IvoryPay Buy Crypto (Bank Transfer) API');
  console.log('========================================\n');

  console.log('API URL:', IVORYPAY_API_URL);
  console.log('Secret Key present:', !!IVORYPAY_SECRET_KEY);

  const reference = generateUuidV4();
  const payload = {
    fiatAmount: 1000,
    reference,
    fiatCurrency: 'NGN',
    email: 'test@example.com',
    businessFeeInFiat: 0,
    note: 'Test meter recharge',
    redirectUrl: 'https://example.com/success',
  };

  console.log('\nRequest payload:', JSON.stringify(payload, null, 2));

  try {
    const response = await fetch(`${IVORYPAY_API_URL}/buy/initiate`, {
      method: 'POST',
      headers: {
        'Authorization': IVORYPAY_SECRET_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    const responseText = await response.text();
    console.log('\nResponse status:', response.status);
    
    try {
      const data = JSON.parse(responseText);
      console.log('Response body:', JSON.stringify(data, null, 2));

      if (data.success && data.data?.transferDetails) {
        console.log('\n✅ Buy Crypto API WORKS!');
        console.log('\n--- Bank Transfer Details ---');
        console.log('Bank:', data.data.transferDetails.bank);
        console.log('Account Number:', data.data.transferDetails.accountNumber);
        console.log('Account Name:', data.data.transferDetails.accountName);
        console.log('Amount to Pay:', data.data.transferDetails.amountPayable, data.data.transferDetails.currency);
        console.log('Expires At:', data.data.transferDetails.expiresAt);
        console.log('Reference:', reference);
        return true;
      } else {
        console.log('\n❌ Buy Crypto API failed:', data.message);
        return false;
      }
    } catch {
      console.log('Response (raw):', responseText);
      return false;
    }
  } catch (error: any) {
    console.error('\n❌ Error:', error.message);
    return false;
  }
}

async function testPaymentLinksAPI() {
  console.log('\n========================================');
  console.log('Testing IvoryPay Payment Links API');
  console.log('========================================\n');

  const payload = {
    name: 'Test Payment Link',
    description: 'Testing payment link creation',
    baseFiat: 'NGN',
    amount: '1000',
    isAmountFixed: true,
    redirectLink: 'https://example.com/success',
  };

  console.log('Request payload:', JSON.stringify(payload, null, 2));

  try {
    const response = await fetch(`${IVORYPAY_API_URL}/payment-links`, {
      method: 'POST',
      headers: {
        'Authorization': IVORYPAY_SECRET_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    const responseText = await response.text();
    console.log('\nResponse status:', response.status);
    
    try {
      const data = JSON.parse(responseText);
      console.log('Response body:', JSON.stringify(data, null, 2));

      if (data.success) {
        console.log('\n✅ Payment Links API WORKS!');
        console.log('BUT: This redirects to IvoryPay checkout (popup issue)');
        return true;
      } else {
        console.log('\n❌ Payment Links API failed:', data.message);
        return false;
      }
    } catch {
      console.log('Response (raw):', responseText);
      return false;
    }
  } catch (error: any) {
    console.error('\n❌ Error:', error.message);
    return false;
  }
}

async function testInitiateTransaction() {
  console.log('\n========================================');
  console.log('Testing IvoryPay Initiate Transaction API');
  console.log('(Direct crypto payment - no redirect)');
  console.log('========================================\n');

  // This endpoint uses /v1 NOT /api/v1
  const TRANSACTIONS_URL = 'https://api.ivorypay.io/v1/transactions';

  const payload = {
    baseFiat: 'NGN',
    amount: 1000,
    crypto: 'USDT',
    email: 'test@example.com',
    reference: generateUuidV4().replace(/-/g, '').substring(0, 32),
  };

  console.log('API URL:', TRANSACTIONS_URL);
  console.log('Request payload:', JSON.stringify(payload, null, 2));

  try {
    const response = await fetch(TRANSACTIONS_URL, {
      method: 'POST',
      headers: {
        'Authorization': IVORYPAY_SECRET_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    const responseText = await response.text();
    console.log('\nResponse status:', response.status);
    
    try {
      const data = JSON.parse(responseText);
      console.log('Response body:', JSON.stringify(data, null, 2));

      if (data.success && data.data?.address) {
        console.log('\n✅ Initiate Transaction API WORKS!');
        console.log('\n--- Payment Details ---');
        console.log('Crypto Address:', data.data.address);
        console.log('Amount to Pay:', data.data.expectedAmountWithFeeInCrypto, data.data.crypto);
        console.log('Reference:', data.data.reference);
        console.log('Email:', data.data.email);
        return true;
      } else {
        console.log('\n❌ Initiate Transaction API failed:', data.message);
        return false;
      }
    } catch {
      console.log('Response (raw):', responseText);
      return false;
    }
  } catch (error: any) {
    console.error('\n❌ Error:', error.message);
    return false;
  }
}

async function testCheckoutURLPrefill() {
  console.log('\n========================================');
  console.log('Testing IvoryPay Checkout URL Pre-fill');
  console.log('========================================\n');

  // First create a payment link
  const payload = {
    name: 'Test Prefill Payment',
    description: 'Testing checkout prefill',
    baseFiat: 'NGN',
    amount: '1000',
    isAmountFixed: true,
    redirectLink: 'https://example.com/success',
  };

  try {
    const response = await fetch(`${IVORYPAY_API_URL}/payment-links`, {
      method: 'POST',
      headers: {
        'Authorization': IVORYPAY_SECRET_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    const data = await response.json();
    if (!data.success) {
      console.log('Failed to create payment link');
      return;
    }

    const reference = data.data.reference;
    const baseUrl = `https://checkout.ivorypay.io/checkout/${reference}`;
    
    console.log('Payment Link Reference:', reference);
    console.log('\n--- Possible Checkout URLs with Pre-fill ---');
    console.log('\n1. Base URL:');
    console.log(baseUrl);
    console.log('\n2. With email query param:');
    console.log(`${baseUrl}?email=test@example.com`);
    console.log('\n3. With customer params:');
    console.log(`${baseUrl}?email=test@example.com&firstName=John&lastName=Doe`);
    console.log('\n4. With customer object:');
    const customerData = encodeURIComponent(JSON.stringify({email: 'test@example.com', firstName: 'John', lastName: 'Doe'}));
    console.log(`${baseUrl}?customer=${customerData}`);
    
    console.log('\n--- Test these URLs manually in browser ---');
    console.log('If pre-fill works, we can update the code to use this approach.');
    
  } catch (error: any) {
    console.error('Error:', error.message);
  }
}

async function main() {
  console.log('IvoryPay API Comparison Test');
  console.log('============================\n');

  // Test Checkout URL prefill options
  await testCheckoutURLPrefill();

  // Test Initiate Transaction API (direct crypto payment - no redirect)
  const initiateTransactionWorks = await testInitiateTransaction();

  // Test Buy Crypto API (Bank Transfer)
  const buyCryptoWorks = await testBuyCryptoAPI();

  // Test Payment Links API (what's currently being used - causes popup)
  const paymentLinksWorks = await testPaymentLinksAPI();

  console.log('\n========================================');
  console.log('SUMMARY');
  console.log('========================================');
  console.log('Initiate Transaction API (crypto):', initiateTransactionWorks ? '✅ WORKS' : '❌ FAILED');
  console.log('Buy Crypto API (Bank Transfer):', buyCryptoWorks ? '✅ WORKS' : '❌ FAILED');
  console.log('Payment Links API:', paymentLinksWorks ? '✅ WORKS' : '❌ FAILED');
  console.log('\nRECOMMENDATION:');
  if (initiateTransactionWorks) {
    console.log('Use Initiate Transaction API (/v1/transactions) for direct crypto payments.');
    console.log('This returns a crypto address directly without redirect.');
  } else if (paymentLinksWorks) {
    console.log('Payment Links API works but redirects to IvoryPay checkout (popup issue).');
  }
  console.log('\n========================================\n');
}

main().catch(console.error);
