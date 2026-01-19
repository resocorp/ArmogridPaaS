import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

/**
 * Test endpoint for UltraMsg WhatsApp API
 * GET /api/test/ultramsg - Tests sending a message to admin
 */
export async function GET(request: NextRequest) {
  try {
    console.log('[Test UltraMsg] Starting test...');
    
    // Get settings from database
    const { data: settings } = await supabaseAdmin
      .from('admin_settings')
      .select('key, value')
      .in('key', ['admin_whatsapp', 'ultramsg_instance_id', 'ultramsg_token']);

    const config: Record<string, string> = {};
    settings?.forEach((s: any) => {
      config[s.key] = s.value;
    });

    console.log('[Test UltraMsg] Config loaded:', {
      instance: config.ultramsg_instance_id,
      token: config.ultramsg_token ? '****' + config.ultramsg_token.slice(-4) : 'missing',
      admin: config.admin_whatsapp,
    });

    if (!config.ultramsg_instance_id || !config.ultramsg_token || !config.admin_whatsapp) {
      return NextResponse.json({
        success: false,
        error: 'Missing UltraMsg configuration',
        config: {
          hasInstance: !!config.ultramsg_instance_id,
          hasToken: !!config.ultramsg_token,
          hasAdminNumber: !!config.admin_whatsapp,
        },
      });
    }

    // Send test message using form-urlencoded (correct format)
    const url = `https://api.ultramsg.com/${config.ultramsg_instance_id}/messages/chat`;
    
    const params = new URLSearchParams();
    params.append('token', config.ultramsg_token);
    params.append('to', config.admin_whatsapp);
    params.append('body', `🧪 *ArmogridSolar Test Message*\n\nThis is a test message to verify WhatsApp notifications are working.\n\nTime: ${new Date().toISOString()}\n\n✅ If you see this, notifications are configured correctly!`);
    params.append('priority', '1');

    console.log('[Test UltraMsg] Sending to:', url);
    console.log('[Test UltraMsg] Target:', config.admin_whatsapp);

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params.toString(),
    });

    const result = await response.json();
    console.log('[Test UltraMsg] API Response:', JSON.stringify(result, null, 2));

    const success = result.sent === 'true' || result.sent === true || !!result.id;

    return NextResponse.json({
      success,
      message: success ? 'Test message sent successfully!' : 'Failed to send test message',
      apiResponse: result,
      config: {
        instance: config.ultramsg_instance_id,
        adminNumber: config.admin_whatsapp,
      },
    });
  } catch (error: any) {
    console.error('[Test UltraMsg] Error:', error);
    return NextResponse.json({
      success: false,
      error: error.message,
    }, { status: 500 });
  }
}
