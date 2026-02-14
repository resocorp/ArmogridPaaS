import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase';
import { testSmsConfig, getSmsConfig, sendSms } from '@/lib/sms';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

/**
 * GET /api/admin/sms - Get SMS configuration and logs
 */
export async function GET(request: NextRequest) {
  try {
    await requireAdmin();

    const searchParams = request.nextUrl.searchParams;
    const action = searchParams.get('action') || 'config';

    if (action === 'logs') {
      // Get SMS logs
      const limit = parseInt(searchParams.get('limit') || '50');
      const status = searchParams.get('status');
      const type = searchParams.get('type');

      let query = supabaseAdmin
        .from('sms_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(limit);

      if (status) {
        query = query.eq('status', status);
      }
      if (type) {
        query = query.eq('notification_type', type);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Failed to fetch SMS logs:', error);
        return NextResponse.json({ error: 'Failed to fetch logs' }, { status: 500 });
      }

      // Get summary counts
      const { data: summary } = await supabaseAdmin
        .from('sms_logs')
        .select('status')
        .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());

      const counts = {
        total: summary?.length || 0,
        sent: summary?.filter((s: any) => s.status === 'sent').length || 0,
        failed: summary?.filter((s: any) => s.status === 'failed').length || 0,
        pending: summary?.filter((s: any) => s.status === 'pending').length || 0,
      };

      return NextResponse.json({
        success: true,
        data: data || [],
        counts,
      });
    }

    if (action === 'templates') {
      // Get notification templates
      const { data, error } = await supabaseAdmin
        .from('notification_templates')
        .select('*')
        .eq('type', 'sms')
        .order('name');

      if (error) {
        console.error('Failed to fetch templates:', error);
        return NextResponse.json({ error: 'Failed to fetch templates' }, { status: 500 });
      }

      return NextResponse.json({
        success: true,
        data: data || [],
      });
    }

    // Default: Get SMS configuration
    const config = await getSmsConfig();
    
    // Get additional settings
    const { data: settings } = await supabaseAdmin
      .from('admin_settings')
      .select('key, value')
      .in('key', [
        'admin_phone',
        'admin_phone_2',
        'admin_phone_3',
        'low_credit_threshold',
        'sms_welcome_enabled',
        'sms_payment_enabled',
        'sms_low_credit_enabled',
        'sms_meter_offline_enabled',
      ]);

    const allSettings: Record<string, string> = {};
    settings?.forEach((s: any) => {
      allSettings[s.key] = s.value;
    });

    return NextResponse.json({
      success: true,
      config: {
        ...config,
        password: config.password ? '********' : '', // Mask password
      },
      settings: allSettings,
    });
  } catch (error: any) {
    console.error('Get SMS config error:', error);
    
    if (error.message === 'Unauthorized' || error.message.includes('Admin')) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    return NextResponse.json({ error: 'Failed to fetch SMS configuration' }, { status: 500 });
  }
}

/**
 * POST /api/admin/sms - Test SMS or send custom SMS
 */
export async function POST(request: NextRequest) {
  try {
    await requireAdmin();

    const body = await request.json();
    const { action, phoneNumber, message } = body;

    if (action === 'test') {
      // Test SMS configuration
      if (!phoneNumber) {
        return NextResponse.json({ error: 'Phone number is required' }, { status: 400 });
      }

      const result = await testSmsConfig(phoneNumber);

      return NextResponse.json({
        success: result.success,
        message: result.success ? 'Test SMS sent successfully' : 'Failed to send test SMS',
        error: result.error,
        response: result.response,
      });
    }

    if (action === 'send') {
      // Send custom SMS
      if (!phoneNumber || !message) {
        return NextResponse.json(
          { error: 'Phone number and message are required' },
          { status: 400 }
        );
      }

      const result = await sendSms(phoneNumber, message, 'custom');

      return NextResponse.json({
        success: result.success,
        message: result.success ? 'SMS sent successfully' : 'Failed to send SMS',
        error: result.error,
      });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error: any) {
    console.error('SMS action error:', error);
    
    if (error.message === 'Unauthorized' || error.message.includes('Admin')) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    return NextResponse.json({ error: 'SMS action failed' }, { status: 500 });
  }
}

/**
 * PUT /api/admin/sms - Update SMS configuration
 */
export async function PUT(request: NextRequest) {
  try {
    await requireAdmin();

    const body = await request.json();
    const { settings } = body;

    if (!settings || typeof settings !== 'object') {
      return NextResponse.json({ error: 'Settings object is required' }, { status: 400 });
    }

    // Validate settings keys
    const allowedKeys = [
      'sms_enabled',
      'sms_server_url',
      'sms_username',
      'sms_password',
      'sms_goip_provider',
      'sms_goip_line',
      'admin_phone',
      'admin_phone_2',
      'admin_phone_3',
      'low_credit_threshold',
      'sms_welcome_enabled',
      'sms_payment_enabled',
      'sms_low_credit_enabled',
      'sms_meter_offline_enabled',
    ];

    const updates = Object.entries(settings)
      .filter(([key]) => allowedKeys.includes(key))
      .map(([key, value]) => ({
        key,
        value: String(value),
        updated_at: new Date().toISOString(),
      }));

    if (updates.length === 0) {
      return NextResponse.json({ error: 'No valid settings provided' }, { status: 400 });
    }

    const { error } = await supabaseAdmin
      .from('admin_settings')
      .upsert(updates, { onConflict: 'key' });

    if (error) {
      console.error('Failed to update SMS settings:', error);
      return NextResponse.json({ error: 'Failed to update settings' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: 'SMS settings updated successfully',
    });
  } catch (error: any) {
    console.error('Update SMS settings error:', error);
    
    if (error.message === 'Unauthorized' || error.message.includes('Admin')) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    return NextResponse.json({ error: 'Failed to update SMS settings' }, { status: 500 });
  }
}
