import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { sendMeterOfflineAlert, sendBulkOfflineAlert } from '@/lib/sms';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

/**
 * GET /api/cron/monitor-meters
 * Cron job to monitor meter status and send offline alerts
 * Should be called periodically (e.g., every 15 minutes)
 */
export async function GET(request: NextRequest) {
  try {
    // Verify cron secret if configured
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;
    
    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log('[Monitor] Starting meter monitoring check...');

    // Get SMS meter offline alert setting
    const { data: settingData } = await supabaseAdmin
      .from('admin_settings')
      .select('value')
      .eq('key', 'sms_meter_offline_enabled')
      .single();

    if (settingData?.value !== 'true') {
      console.log('[Monitor] Meter offline alerts are disabled');
      return NextResponse.json({ 
        success: true, 
        message: 'Meter offline alerts are disabled' 
      });
    }

    // Get all meter credentials with cached data
    const { data: credentials, error } = await supabaseAdmin
      .from('meter_credentials')
      .select('*')
      .not('meter_data', 'is', null);

    if (error || !credentials) {
      console.error('[Monitor] Failed to fetch meter credentials:', error);
      return NextResponse.json({ error: 'Failed to fetch meters' }, { status: 500 });
    }

    console.log(`[Monitor] Checking ${credentials.length} meters...`);

    // Track offline meters
    const offlineMeters: Array<{
      meterId: string;
      roomNo: string;
      projectName: string;
      lastSeen?: string;
    }> = [];

    // Get stored offline state
    const { data: offlineState } = await supabaseAdmin
      .from('admin_settings')
      .select('value')
      .eq('key', 'offline_meters_state')
      .single();

    const previousOffline: string[] = offlineState?.value 
      ? JSON.parse(offlineState.value) 
      : [];

    // Check each meter
    for (const cred of credentials) {
      const meterData = cred.meter_data as any;
      
      // Check if meter is offline (unConnnect = 1 means offline)
      if (meterData && (meterData.unConnnect === 1 || meterData.unConnnect === '1')) {
        offlineMeters.push({
          meterId: meterData.meterId || cred.room_no,
          roomNo: cred.room_no,
          projectName: cred.project_name || 'Unknown',
          lastSeen: cred.last_sync_at,
        });
      }
    }

    console.log(`[Monitor] Found ${offlineMeters.length} offline meters`);

    // Find newly offline meters (weren't offline before)
    const newlyOffline = offlineMeters.filter(
      m => !previousOffline.includes(m.meterId)
    );

    let alertsSent = 0;

    if (newlyOffline.length > 0) {
      console.log(`[Monitor] ${newlyOffline.length} meters newly went offline`);

      // If more than 5 meters went offline, send bulk alert
      if (newlyOffline.length > 5) {
        await sendBulkOfflineAlert(newlyOffline.length);
        alertsSent = 1;
      } else {
        // Send individual alerts
        for (const meter of newlyOffline) {
          try {
            await sendMeterOfflineAlert({
              meterId: meter.meterId,
              roomNumber: meter.roomNo,
              projectName: meter.projectName,
            });
            alertsSent++;
          } catch (err) {
            console.error(`[Monitor] Failed to send alert for ${meter.meterId}:`, err);
          }
        }
      }
    }

    // Update stored offline state
    const currentOfflineIds = offlineMeters.map(m => m.meterId);
    await supabaseAdmin
      .from('admin_settings')
      .upsert({
        key: 'offline_meters_state',
        value: JSON.stringify(currentOfflineIds),
        updated_at: new Date().toISOString(),
      }, { onConflict: 'key' });

    console.log(`[Monitor] Monitoring complete. Alerts sent: ${alertsSent}`);

    return NextResponse.json({
      success: true,
      checked: credentials.length,
      offline: offlineMeters.length,
      newlyOffline: newlyOffline.length,
      alertsSent,
    });
  } catch (error: any) {
    console.error('[Monitor] Meter monitoring failed:', error);
    return NextResponse.json(
      { error: 'Monitoring failed', message: error.message },
      { status: 500 }
    );
  }
}
