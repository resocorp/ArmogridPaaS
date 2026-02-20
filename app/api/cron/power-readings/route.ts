import { NextRequest, NextResponse } from 'next/server';
import { getAdminToken } from '@/lib/auth';
import { iotClient } from '@/lib/iot-client';
import { supabaseAdmin } from '@/lib/supabase';

// This endpoint is designed to be called by a cron job (e.g., Vercel Cron)
// It records power readings from all meters periodically

export async function GET(request: NextRequest) {
  try {
    // Verify cron secret for security (optional but recommended)
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;
    
    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      console.log('[Cron] Unauthorized cron request');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log('[Cron] Starting power readings collection...');
    
    const adminToken = await getAdminToken();
    
    if (!adminToken) {
      console.error('[Cron] No admin token available');
      return NextResponse.json({ error: 'No admin token' }, { status: 500 });
    }

    // Load per-meter credentials from Supabase
    const credentialsMap = new Map<string, string>(); // roomNo -> iot_token
    try {
      const { data: allCreds } = await supabaseAdmin
        .from('meter_credentials')
        .select('room_no, iot_token, token_expires_at, username, password_hash');

      if (allCreds) {
        for (const cred of allCreds) {
          let token = cred.iot_token;
          const tokenExpired = !cred.token_expires_at || new Date(cred.token_expires_at) < new Date();
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
              console.error(`[Cron] Failed to refresh token for ${cred.room_no}:`, e);
            }
          }
          if (token) credentialsMap.set(cred.room_no, token);
        }
        console.log(`[Cron] Loaded ${credentialsMap.size} per-meter tokens from meter_credentials`);
      }
    } catch (e) {
      console.error('[Cron] Failed to load meter credentials:', e);
    }

    // Fetch all projects
    const projectsResponse = await iotClient.getProjectList('', 100, 1, adminToken);
    if (projectsResponse.success !== '1') {
      console.error('[Cron] Failed to fetch projects');
      return NextResponse.json({ error: 'Failed to fetch projects' }, { status: 500 });
    }

    const projects = projectsResponse.data?.list || [];
    
    let totalPower = 0;
    let normalMeters = 0;
    let offlineMeters = 0;
    let alarmMeters = 0;
    const readingsByProject: Record<string, { projectName: string; power: number; meterCount: number }> = {};
    const readingsByMeter: Array<{ meterId: string; roomNo: string; power: number; projectName: string }> = [];

    // Process each project
    for (const project of projects) {
      const projectId = String(project.id);
      const projectName = project.projectName || 'Unknown';

      try {
        const roomResponse = await iotClient.getProjectRoomInfo(projectId, adminToken);
        
        if (roomResponse.success !== '1' && roomResponse.code !== 200 && roomResponse.code !== 0) {
          continue;
        }

        const rooms = roomResponse.data || [];

        for (const room of rooms) {
          const roomNo = room.name || room.roomNo || '';
          if (!roomNo) continue;

          const meterToken = credentialsMap.get(roomNo);
          if (!meterToken) {
            // No credential stored for this room — skip getMeterInfo
            continue;
          }
          
          try {
            const meterInfoResponse = await iotClient.getMeterInfo(roomNo, meterToken);
            const meterSuccess = meterInfoResponse.success === '1' || 
                                meterInfoResponse.code === 200 || 
                                meterInfoResponse.code === 0;

            if (!meterSuccess || !meterInfoResponse.data) {
              offlineMeters++;
              continue;
            }

            const meterData = meterInfoResponse.data;
            const meterId = String(meterData.meterId);
            const balance = parseFloat(meterData.balance || '0');
            const power = parseFloat(meterData.p || '0');
            const alarmA = parseFloat(meterData.alarmA || '100');
            const isOnline = meterData.unConnnect === 0;
            const isAlarm = balance < alarmA;

            if (!isOnline) {
              offlineMeters++;
            } else if (isAlarm) {
              alarmMeters++;
            } else {
              normalMeters++;
            }

            if (isOnline && power > 0) {
              totalPower += power;
              
              // Track by project
              if (!readingsByProject[projectName]) {
                readingsByProject[projectName] = { projectName, power: 0, meterCount: 0 };
              }
              readingsByProject[projectName].power += power;
              readingsByProject[projectName].meterCount += 1;

              // Track by meter (limit to top 20)
              if (readingsByMeter.length < 20) {
                readingsByMeter.push({ meterId, roomNo, power, projectName });
              }
            }
          } catch (e) {
            console.error(`[Cron] Error fetching meter ${roomNo}:`, e);
            offlineMeters++;
          }
        }
      } catch (e) {
        console.error(`[Cron] Error processing project ${projectId}:`, e);
      }
    }

    // Sort readings by power descending
    readingsByMeter.sort((a, b) => b.power - a.power);

    // Insert power reading into database
    const { error: insertError } = await supabaseAdmin
      .from('power_readings')
      .insert({
        recorded_at: new Date().toISOString(),
        total_power: totalPower,
        active_meters: normalMeters,
        readings_by_project: readingsByProject,
        readings_by_meter: readingsByMeter,
      });

    if (insertError) {
      console.error('[Cron] Error inserting power reading:', insertError);
      return NextResponse.json({ error: 'Failed to save reading' }, { status: 500 });
    }

    const result = {
      success: true,
      timestamp: new Date().toISOString(),
      totalPower: totalPower.toFixed(3),
      meterStatus: {
        normal: normalMeters,
        offline: offlineMeters,
        alarm: alarmMeters,
        total: normalMeters + offlineMeters + alarmMeters,
      },
      projectsProcessed: projects.length,
    };

    console.log('[Cron] Power reading recorded:', result);

    return NextResponse.json(result);
  } catch (error: any) {
    console.error('[Cron] Error:', error);
    return NextResponse.json(
      { error: error.message || 'Cron job failed' },
      { status: 500 }
    );
  }
}

// Also support POST for manual triggering
export async function POST(request: NextRequest) {
  return GET(request);
}
