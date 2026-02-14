import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { sendLowCreditSms } from '@/lib/sms';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

/**
 * GET /api/cron/low-credit-alerts
 * Cron job to check for low credit meters and send alerts
 * Should be called periodically (e.g., daily)
 */
export async function GET(request: NextRequest) {
  try {
    // Verify cron secret if configured
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;
    
    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log('[LowCredit] Starting low credit check...');

    // Get SMS low credit alert setting
    const { data: settings } = await supabaseAdmin
      .from('admin_settings')
      .select('key, value')
      .in('key', ['sms_low_credit_enabled', 'low_credit_threshold']);

    const settingsMap: Record<string, string> = {};
    settings?.forEach((s: any) => {
      settingsMap[s.key] = s.value;
    });

    if (settingsMap.sms_low_credit_enabled !== 'true') {
      console.log('[LowCredit] Low credit alerts are disabled');
      return NextResponse.json({ 
        success: true, 
        message: 'Low credit alerts are disabled' 
      });
    }

    const threshold = parseFloat(settingsMap.low_credit_threshold || '500');
    console.log(`[LowCredit] Using threshold: ₦${threshold}`);

    // Get all meter credentials with cached data
    const { data: credentials, error } = await supabaseAdmin
      .from('meter_credentials')
      .select('*')
      .not('meter_data', 'is', null);

    if (error || !credentials) {
      console.error('[LowCredit] Failed to fetch meter credentials:', error);
      return NextResponse.json({ error: 'Failed to fetch meters' }, { status: 500 });
    }

    console.log(`[LowCredit] Checking ${credentials.length} meters...`);

    // Get last alert timestamps to avoid spamming
    const { data: lastAlerts } = await supabaseAdmin
      .from('admin_settings')
      .select('value')
      .eq('key', 'low_credit_last_alerts')
      .single();

    const lastAlertTimes: Record<string, string> = lastAlerts?.value 
      ? JSON.parse(lastAlerts.value) 
      : {};

    const now = new Date();
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    
    let alertsSent = 0;
    const newAlertTimes: Record<string, string> = { ...lastAlertTimes };

    for (const cred of credentials) {
      const meterData = cred.meter_data as any;
      if (!meterData) continue;

      const balance = parseFloat(meterData.balance || '0');
      
      // Check if balance is below threshold
      if (balance < threshold && balance >= 0) {
        // Check if we already sent an alert in the last 24 hours
        const lastAlert = lastAlertTimes[cred.room_no];
        if (lastAlert && new Date(lastAlert) > oneDayAgo) {
          console.log(`[LowCredit] Skipping ${cred.room_no} - already alerted recently`);
          continue;
        }

        // We need customer phone - try to get from registrations
        const { data: registration } = await supabaseAdmin
          .from('customer_registrations')
          .select('name, phone')
          .eq('room_number', cred.room_no)
          .eq('payment_status', 'success')
          .single();

        if (registration?.phone) {
          try {
            await sendLowCreditSms({
              name: registration.name,
              phone: registration.phone,
              meterId: meterData.meterId || cred.room_no,
              locationName: cred.project_name || 'Your Location',
              balance: balance,
            });
            
            newAlertTimes[cred.room_no] = now.toISOString();
            alertsSent++;
            console.log(`[LowCredit] Alert sent for ${cred.room_no} (balance: ₦${balance})`);
          } catch (err) {
            console.error(`[LowCredit] Failed to send alert for ${cred.room_no}:`, err);
          }
        } else {
          console.log(`[LowCredit] No phone found for ${cred.room_no}`);
        }
      }
    }

    // Update last alert timestamps
    await supabaseAdmin
      .from('admin_settings')
      .upsert({
        key: 'low_credit_last_alerts',
        value: JSON.stringify(newAlertTimes),
        updated_at: new Date().toISOString(),
      }, { onConflict: 'key' });

    console.log(`[LowCredit] Check complete. Alerts sent: ${alertsSent}`);

    return NextResponse.json({
      success: true,
      checked: credentials.length,
      threshold,
      alertsSent,
    });
  } catch (error: any) {
    console.error('[LowCredit] Low credit check failed:', error);
    return NextResponse.json(
      { error: 'Check failed', message: error.message },
      { status: 500 }
    );
  }
}
