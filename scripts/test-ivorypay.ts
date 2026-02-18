/**
 * IvoryPay API Test Script
 * Run with: npx ts-node scripts/test-ivorypay.ts
 */

// Load .env.local manually
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const envPath = path.join(__dirname, '..', '.env.local');
const envContent = fs.readFileSync(envPath, 'utf-8');
envContent.split('\n').forEach(line => {
  const [key, ...valueParts] = line.split('=');
  if (key && valueParts.length > 0) {
    process.env[key.trim()] = valueParts.join('=').trim();
  }
});

const IVORYPAY_SECRET_KEY = process.env.IVORYPAY_SECRET_KEY!;
const IVORYPAY_PUBLIC_KEY = process.env.NEXT_PUBLIC_IVORYPAY_PUBLIC_KEY!;
const IVORYPAY_API_URL = 'https://api.ivorypay.io/api/v1';

interface PaymentLinkResponse {
  success: boolean;
  message: string;
  data: {
    uuid: string;
    reference: string;
    name: string;
    description: string;
    baseFiat: string;
    amount: number;
    isAmountFixed: boolean;
    redirectLink: string;
    environment: string;
    isActive: number;
    createdAt: string;
    // Add any other fields
  };
}

async function getHeaders(): Promise<HeadersInit> {
  return {
    'Authorization': IVORYPAY_SECRET_KEY,
    'Content-Type': 'application/json',
  };
}

async function testCreatePaymentLink(): Promise<PaymentLinkResponse | null> {
  console.log('\n========================================');
  console.log('Testing IvoryPay Payment Link Creation');
  console.log('========================================\n');

  console.log('API URL:', IVORYPAY_API_URL);
  console.log('Secret Key present:', !!IVORYPAY_SECRET_KEY);
  console.log('Public Key present:', !!IVORYPAY_PUBLIC_KEY);
  console.log('Secret Key (first 10 chars):', IVORYPAY_SECRET_KEY?.substring(0, 10) + '...');

  const payload = {
    name: 'Test Payment Link',
    description: 'Testing IvoryPay payment link creation',
    baseFiat: 'NGN',
    amount: '1000',
    isAmountFixed: true,
    redirectLink: 'https://example.com/success',
  };

  console.log('\nRequest payload:', JSON.stringify(payload, null, 2));

  try {
    const response = await fetch(`${IVORYPAY_API_URL}/payment-links`, {
      method: 'POST',
      headers: await getHeaders(),
      body: JSON.stringify(payload),
    });

    const responseText = await response.text();
    console.log('\nResponse status:', response.status);
    console.log('Response headers:', Object.fromEntries(response.headers.entries()));
    
    const data = JSON.parse(responseText);
    console.log('\nResponse body:', JSON.stringify(data, null, 2));

    if (data.success) {
      console.log('\n✅ Payment link created successfully!');
      console.log('\n--- Payment Link Details ---');
      console.log('UUID:', data.data.uuid);
      console.log('Reference:', data.data.reference);
      console.log('Environment:', data.data.environment);
      console.log('Is Active:', data.data.isActive);
      
      // Test different payment URL formats
      console.log('\n--- Possible Payment URLs to test ---');
      console.log('1. https://pay.ivorypay.io/' + data.data.reference);
      console.log('2. https://pay.ivorypay.io/p/' + data.data.reference);
      console.log('3. https://pay.ivorypay.io/link/' + data.data.reference);
      console.log('4. https://checkout.ivorypay.io/' + data.data.reference);
      console.log('5. https://pay.ivorypay.io/' + data.data.uuid);
      console.log('6. https://sandbox.pay.ivorypay.io/' + data.data.reference);
      console.log('7. https://pay-test.ivorypay.io/' + data.data.reference);

      return data;
    } else {
      console.log('\n❌ Payment link creation failed:', data.message);
      return null;
    }
  } catch (error) {
    console.error('\n❌ Error:', error);
    return null;
  }
}

async function testGetPaymentLink(reference: string): Promise<void> {
  console.log('\n========================================');
  console.log('Testing Get Payment Link by Reference');
  console.log('========================================\n');

  try {
    const response = await fetch(`${IVORYPAY_API_URL}/payment-links/${reference}`, {
      method: 'GET',
      headers: await getHeaders(),
    });

    const responseText = await response.text();
    console.log('Response status:', response.status);
    
    try {
      const data = JSON.parse(responseText);
      console.log('Response body:', JSON.stringify(data, null, 2));
      
      if (data.data?.paymentUrl) {
        console.log('\n✅ Found payment URL:', data.data.paymentUrl);
      }
    } catch {
      console.log('Response (raw):', responseText);
    }
  } catch (error) {
    console.error('Error:', error);
  }
}

async function testListPaymentLinks(): Promise<void> {
  console.log('\n========================================');
  console.log('Testing List All Payment Links');
  console.log('========================================\n');

  try {
    const response = await fetch(`${IVORYPAY_API_URL}/payment-links`, {
      method: 'GET',
      headers: await getHeaders(),
    });

    const responseText = await response.text();
    console.log('Response status:', response.status);
    
    try {
      const data = JSON.parse(responseText);
      console.log('Response body:', JSON.stringify(data, null, 2));
    } catch {
      console.log('Response (raw):', responseText);
    }
  } catch (error) {
    console.error('Error:', error);
  }
}

async function testCheckoutURL(url: string): Promise<boolean> {
  console.log(`\nChecking URL: ${url}`);
  try {
    const response = await fetch(url, {
      method: 'HEAD',
      redirect: 'manual',
    });
    console.log(`  Status: ${response.status}`);
    console.log(`  Location: ${response.headers.get('location') || 'N/A'}`);
    return response.status === 200 || response.status === 302 || response.status === 301;
  } catch (error: any) {
    console.log(`  Error: ${error.message}`);
    return false;
  }
}

async function main() {
  console.log('IvoryPay API Test Script');
  console.log('========================\n');

  // Test 1: Create a payment link
  const paymentLink = await testCreatePaymentLink();

  if (paymentLink) {
    const ref = paymentLink.data.reference;
    const uuid = paymentLink.data.uuid;

    // Test 2: Get payment link details
    await testGetPaymentLink(ref);

    // Test 3: Try to verify which URL format works
    console.log('\n========================================');
    console.log('Testing Payment URL Formats');
    console.log('========================================');

    const urlsToTest = [
      `https://pay.ivorypay.io/${ref}`,
      `https://pay.ivorypay.io/p/${ref}`,
      `https://pay.ivorypay.io/link/${ref}`,
      `https://checkout.ivorypay.io/${ref}`,
      `https://pay.ivorypay.io/${uuid}`,
      `https://sandbox.pay.ivorypay.io/${ref}`,
      `https://pay-test.ivorypay.io/${ref}`,
      `https://ivorypay.io/pay/${ref}`,
      `https://www.ivorypay.io/pay/${ref}`,
    ];

    for (const url of urlsToTest) {
      await testCheckoutURL(url);
    }
  }

  // Test 4: List all payment links
  await testListPaymentLinks();

  console.log('\n========================================');
  console.log('Test Complete');
  console.log('========================================\n');
}

main().catch(console.error);
