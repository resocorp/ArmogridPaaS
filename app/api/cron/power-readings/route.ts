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

    // Process each project using appProjectMeterList (returns meterId directly)
    for (const project of projects) {
      const projectId = String(project.id);
      const projectName = project.projectName || 'Unknown';

      try {
        const meterListResponse = await iotClient.getProjectMeterList(projectId, adminToken);

        if (meterListResponse.success !== '1') {
          console.error(`[Cron] Failed to get meter list for project ${projectId}`);
          continue;
        }

        const meters = meterListResponse.data?.list || [];

        // Fetch live power for all online meters in parallel using getMeterInfoById + admin token
        const onlineMeters = meters.filter((m: any) => m.unConnect === 0 || m.unConnect === '0');
        const offlineMeterCount = meters.length - onlineMeters.length;
        offlineMeters += offlineMeterCount;

        const powerFetches = onlineMeters.map(async (meter: any) => {
          const meterId = String(meter.id || '');
          const roomNo = meter.roomNo || meter.meterName || meter.meterSn || '';
          const balance = parseFloat(meter.balance || '0');
          const alarmA = parseFloat(meter.alarmA || '100');
          const isAlarm = balance > 0 && alarmA > 0 && balance < alarmA;

          if (!meterId) return;

          try {
            const meterInfoResponse = await iotClient.getMeterInfoById(meterId, adminToken);
            const meterSuccess = meterInfoResponse.success === '1' ||
                                 meterInfoResponse.code === 200 ||
                                 meterInfoResponse.code === 0;

            if (!meterSuccess || !meterInfoResponse.data) {
              offlineMeters++;
              return;
            }

            const power = parseFloat(meterInfoResponse.data.p || '0');

            if (isAlarm) {
              alarmMeters++;
            } else {
              normalMeters++;
            }

            if (power > 0) {
              totalPower += power;

              if (!readingsByProject[projectName]) {
                readingsByProject[projectName] = { projectName, power: 0, meterCount: 0 };
              }
              readingsByProject[projectName].power += power;
              readingsByProject[projectName].meterCount += 1;

              if (readingsByMeter.length < 20) {
                readingsByMeter.push({ meterId, roomNo, power, projectName });
              }
            }
          } catch (e) {
            console.error(`[Cron] Error fetching meter ${meterId}:`, e);
            offlineMeters++;
          }
        });

        await Promise.all(powerFetches);
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
