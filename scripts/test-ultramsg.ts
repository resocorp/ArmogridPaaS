/**
 * Test script for UltraMsg WhatsApp API
 * Run with: npx ts-node scripts/test-ultramsg.ts
 */

const ULTRAMSG_INSTANCE_ID = 'instance150203';
const ULTRAMSG_TOKEN = 'qd23s4ljh60p0vul';
const ADMIN_WHATSAPP = '+2347035090096';

async function testUltraMsg() {
  console.log('='.repeat(50));
  console.log('UltraMsg API Test');
  console.log('='.repeat(50));
  console.log('Instance ID:', ULTRAMSG_INSTANCE_ID);
  console.log('Token:', ULTRAMSG_TOKEN.substring(0, 4) + '****');
  console.log('Target Number:', ADMIN_WHATSAPP);
  console.log('='.repeat(50));

  const url = `https://api.ultramsg.com/${ULTRAMSG_INSTANCE_ID}/messages/chat`;
  
  const testMessage = `🧪 *UltraMsg Test Message*

This is a test message from ArmogridSolar.
Time: ${new Date().toISOString()}

If you received this, WhatsApp notifications are working!`;

  console.log('\n📤 Sending test message...\n');
  console.log('URL:', url);
  console.log('Message:', testMessage);
  console.log('\n');

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        token: ULTRAMSG_TOKEN,
        to: ADMIN_WHATSAPP,
        body: testMessage,
      }),
    });

    console.log('Response Status:', response.status);
    console.log('Response Status Text:', response.statusText);
    
    const result = await response.json();
    console.log('\n📥 API Response:');
    console.log(JSON.stringify(result, null, 2));

    if (result.sent === 'true' || result.sent === true) {
      console.log('\n✅ SUCCESS: Message sent successfully!');
    } else if (result.error) {
      console.log('\n❌ ERROR:', result.error);
      console.log('Error Details:', result.message || 'No details provided');
    } else {
      console.log('\n⚠️ UNKNOWN STATUS:', result);
    }
  } catch (error: any) {
    console.error('\n❌ FETCH ERROR:', error.message);
    console.error('Full error:', error);
  }
}

// Also test with URL-encoded form data (alternative method)
async function testUltraMsgFormData() {
  console.log('\n' + '='.repeat(50));
  console.log('Testing with URL-encoded form data...');
  console.log('='.repeat(50));

  const url = `https://api.ultramsg.com/${ULTRAMSG_INSTANCE_ID}/messages/chat`;
  
  const params = new URLSearchParams();
  params.append('token', ULTRAMSG_TOKEN);
  params.append('to', ADMIN_WHATSAPP);
  params.append('body', `🧪 Test #2 - Form Data Method\nTime: ${new Date().toISOString()}`);

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params.toString(),
    });

    console.log('Response Status:', response.status);
    const result = await response.json();
    console.log('API Response:', JSON.stringify(result, null, 2));

    if (result.sent === 'true' || result.sent === true) {
      console.log('\n✅ Form data method SUCCESS!');
    } else {
      console.log('\n❌ Form data method failed:', result.error || result);
    }
  } catch (error: any) {
    console.error('Form data method error:', error.message);
  }
}

// Run tests
testUltraMsg().then(() => testUltraMsgFormData());
