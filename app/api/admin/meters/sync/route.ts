import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth';
import { iotClient } from '@/lib/iot-client';
import { supabaseAdmin } from '@/lib/supabase';

// POST - Sync all linked meters or specific meter
export async function POST(request: NextRequest) {
  try {
    await requireAdmin();
    const body = await request.json();
    const { roomNo } = body; // Optional: sync specific meter

    let query = supabaseAdmin.from('meter_credentials').select('*');
    
    if (roomNo) {
      query = query.eq('room_no', roomNo);
    }

    const { data: credentials, error } = await query;

    if (error) {
      console.error('Error fetching credentials:', error);
      return NextResponse.json(
        { error: 'Failed to fetch credentials' },
        { status: 500 }
      );
    }

    if (!credentials || credentials.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No linked meters to sync',
        synced: 0,
      });
    }

    console.log(`[Sync] Syncing ${credentials.length} meters...`);

    const results = await Promise.all(
      credentials.map(async (cred: any) => {
        try {
          let token = cred.iot_token;
          const tokenExpired = !cred.token_expires_at || 
                              new Date(cred.token_expires_at) < new Date();

          // Refresh token if expired
          if (tokenExpired) {
            console.log(`[Sync] Token expired for ${cred.room_no}, refreshing...`);
            const loginResponse = await iotClient.login(
              cred.username, 
              cred.password_hash, 
              1
            );

            const isSuccess = loginResponse.success === '1' || 
                             loginResponse.code === 200 || 
                             loginResponse.code === 0;

            if (isSuccess && loginResponse.data) {
              token = loginResponse.data;
              
              // Update token in database
              const tokenExpiresAt = new Date();
              tokenExpiresAt.setHours(tokenExpiresAt.getHours() + 24);
              
              await supabaseAdmin
                .from('meter_credentials')
                .update({
                  iot_token: token,
                  token_expires_at: tokenExpiresAt.toISOString(),
                })
                .eq('room_no', cred.room_no);
            } else {
              console.error(`[Sync] Failed to refresh token for ${cred.room_no}`);
              return { roomNo: cred.room_no, success: false, error: 'Token refresh failed' };
            }
          }

          // Fetch meter info
          const meterInfoResponse = await iotClient.getMeterInfo(cred.room_no, token);
          
          const meterInfoSuccess = meterInfoResponse.success === '1' || 
                                  meterInfoResponse.code === 200 || 
                                  meterInfoResponse.code === 0;

          if (meterInfoSuccess && meterInfoResponse.data) {
            // Update meter data in database
            await supabaseAdmin
              .from('meter_credentials')
              .update({
                meter_data: meterInfoResponse.data,
                last_sync_at: new Date().toISOString(),
              })
              .eq('room_no', cred.room_no);

            return { 
              roomNo: cred.room_no, 
              success: true, 
              data: meterInfoResponse.data 
            };
          } else {
            return { 
              roomNo: cred.room_no, 
              success: false, 
              error: 'Failed to fetch meter info' 
            };
          }
        } catch (err: any) {
          console.error(`[Sync] Error syncing ${cred.room_no}:`, err);
          return { roomNo: cred.room_no, success: false, error: err.message };
        }
      })
    );

    const successCount = results.filter(r => r.success).length;
    const failedCount = results.filter(r => !r.success).length;

    console.log(`[Sync] Complete: ${successCount} synced, ${failedCount} failed`);

    return NextResponse.json({
      success: true,
      message: `Synced ${successCount} meters`,
      synced: successCount,
      failed: failedCount,
      results,
    });
  } catch (error: any) {
    console.error('Sync error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to sync meters' },
      { status: 500 }
    );
  }
}

// GET - Get all linked credentials with their meter data
export async function GET(request: NextRequest) {
  try {
    await requireAdmin();

    const { data, error } = await supabaseAdmin
      .from('meter_credentials')
      .select('room_no, project_id, project_name, username, last_sync_at, meter_data')
      .order('room_no');

    if (error) {
      console.error('Error fetching credentials:', error);
      return NextResponse.json(
        { error: 'Failed to fetch credentials' },
        { status: 500 }
      );
    }

    // Transform to a map for easy lookup
    const credentialsMap: Record<string, any> = {};
    (data || []).forEach((cred: any) => {
      credentialsMap[cred.room_no] = {
        linked: true,
        username: cred.username,
        lastSyncAt: cred.last_sync_at,
        meterData: cred.meter_data,
      };
    });

    return NextResponse.json({
      success: true,
      data: credentialsMap,
      count: data?.length || 0,
    });
  } catch (error: any) {
    console.error('Get credentials error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to get credentials' },
      { status: 500 }
    );
  }
}
