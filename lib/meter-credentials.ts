import { supabaseAdmin } from './supabase';
import { iotClient } from './iot-client';

/**
 * Loads all meter credentials from Supabase, refreshing expired tokens as needed.
 * Returns a map of roomNo -> iot_token for use in IoT API calls.
 *
 * This is the single source of truth for per-meter token management,
 * replacing duplicated logic in analytics/route.ts and cron/power-readings/route.ts.
 */
export async function loadMeterCredentials(): Promise<Map<string, string>> {
  const credentialsMap = new Map<string, string>();

  const { data: allCreds, error } = await supabaseAdmin
    .from('meter_credentials')
    .select('room_no, iot_token, token_expires_at, username, password_hash');

  if (error || !allCreds) return credentialsMap;

  const refreshPromises = allCreds.map(async (cred) => {
    let token = cred.iot_token;
    const tokenExpired =
      !cred.token_expires_at || new Date(cred.token_expires_at) < new Date();

    if (tokenExpired && cred.username && cred.password_hash) {
      try {
        const loginResp = await iotClient.login(cred.username, cred.password_hash, 1);
        if ((loginResp.success === '1' || loginResp.code === 200) && loginResp.data) {
          token = loginResp.data;
          const tokenExpiresAt = new Date();
          tokenExpiresAt.setHours(tokenExpiresAt.getHours() + 24);
          await supabaseAdmin
            .from('meter_credentials')
            .update({ iot_token: token, token_expires_at: tokenExpiresAt.toISOString() })
            .eq('room_no', cred.room_no);
        }
      } catch (e) {
        console.error(`[MeterCredentials] Failed to refresh token for ${cred.room_no}:`, e);
      }
    }

    return { roomNo: cred.room_no, token };
  });

  const results = await Promise.all(refreshPromises);
  for (const { roomNo, token } of results) {
    if (token) credentialsMap.set(roomNo, token);
  }

  return credentialsMap;
}
