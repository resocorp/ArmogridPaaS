import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin, getAdminToken } from '@/lib/auth';
import { iotClient } from '@/lib/iot-client';
import { supabaseAdmin } from '@/lib/supabase';

interface AnalyticsData {
  // Summary metrics
  totalRevenue: number;
  totalEnergy: number;
  livePower: number;
  activeMeters: number;
  totalMeters: number;
  
  // Revenue breakdown
  revenueByDay: { date: string; revenue: number }[];
  revenueByProject: { projectId: string; projectName: string; revenue: number }[];
  
  // Energy breakdown
  energyByDay: { date: string; energy: number }[];
  energyByMeter: { meterId: string; roomNo: string; energy: number; projectName: string }[];
  
  // Power history
  powerHistory: { timestamp: string; power: number; activeMeters: number }[];
  
  // Rankings
  topConsumers: { roomNo: string; meterId: string; energy: number; projectName: string }[];
  topRevenue: { roomNo: string; revenue: number; projectName: string }[];
  
  // Alerts
  lowBalanceMeters: { roomNo: string; balance: number; meterId: string }[];
  forcedModeMeters: { roomNo: string; controlMode: string; meterId: string }[];
  offlineMeters: { roomNo: string; meterId: string }[];
  
  // Live power by meter
  livePowerByMeter: { roomNo: string; meterId: string; power: number; projectName: string }[];
}

// GET - Fetch analytics data
export async function GET(request: NextRequest) {
  try {
    await requireAdmin();
    const token = await getAdminToken();
    
    if (!token) {
      return NextResponse.json(
        { error: 'No admin token available' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('startDate') || getDefaultStartDate();
    const endDate = searchParams.get('endDate') || getDefaultEndDate();
    const projectIdsParam = searchParams.get('projectIds'); // Comma-separated project IDs
    
    // Parse project IDs filter
    const projectIdFilter = projectIdsParam 
      ? new Set(projectIdsParam.split(',').filter(Boolean))
      : null;

    console.log(`[Analytics] Fetching data from ${startDate} to ${endDate}`);
    if (projectIdFilter) {
      console.log(`[Analytics] Filtering by projects: ${Array.from(projectIdFilter).join(', ')}`);
    }

    // Fetch all linked credentials to get user tokens
    const { data: credentials, error: credError } = await supabaseAdmin
      .from('meter_credentials')
      .select('*');

    if (credError) {
      console.error('[Analytics] Error fetching credentials:', credError);
    }

    // Filter by project IDs if specified
    let linkedMeters = credentials || [];
    if (projectIdFilter && projectIdFilter.size > 0) {
      linkedMeters = linkedMeters.filter((cred: any) => 
        projectIdFilter.has(cred.project_id)
      );
    }
    console.log(`[Analytics] Processing ${linkedMeters.length} linked meters`);

    // Initialize analytics data
    const analytics: AnalyticsData = {
      totalRevenue: 0,
      totalEnergy: 0,
      livePower: 0,
      activeMeters: 0,
      totalMeters: 0,
      revenueByDay: [],
      revenueByProject: [],
      energyByDay: [],
      energyByMeter: [],
      topConsumers: [],
      topRevenue: [],
      lowBalanceMeters: [],
      forcedModeMeters: [],
      offlineMeters: [],
      livePowerByMeter: [],
      powerHistory: [],
    };

    // Maps for aggregation
    const revenueByDayMap = new Map<string, number>();
    const revenueByProjectMap = new Map<string, { projectName: string; revenue: number }>();
    const energyByDayMap = new Map<string, number>();
    const energyByMeterMap = new Map<string, { roomNo: string; energy: number; projectName: string }>();
    const revenueByMeterMap = new Map<string, { roomNo: string; revenue: number; projectName: string }>();

    // Process each linked meter
    for (const cred of linkedMeters) {
      try {
        const userToken = cred.iot_token;
        const meterData = cred.meter_data;
        const roomNo = cred.room_no;
        const projectName = cred.project_name || 'Unknown';

        if (!userToken) continue;

        analytics.totalMeters++;

        // Use cached meter data if available
        if (meterData) {
          const balance = parseFloat(meterData.balance || '0');
          const power = parseFloat(meterData.p || '0');
          const isOnline = meterData.unConnnect === 0;
          const controlMode = meterData.controlMode;

          if (isOnline) {
            analytics.activeMeters++;
            analytics.livePower += power;
            
            analytics.livePowerByMeter.push({
              roomNo,
              meterId: meterData.meterId || cred.room_no,
              power,
              projectName,
            });
          } else {
            analytics.offlineMeters.push({
              roomNo,
              meterId: meterData.meterId || cred.room_no,
            });
          }

          // Check for low balance (< ₦500)
          if (balance < 500) {
            analytics.lowBalanceMeters.push({
              roomNo,
              balance,
              meterId: meterData.meterId || cred.room_no,
            });
          }

          // Check for forced mode (controlMode '1' or '2' means not in prepaid mode)
          if (controlMode === '1' || controlMode === '2') {
            const switchSta = meterData.switchSta;
            // Determine actual forced state: switchSta '1' = ON, '0' = OFF
            const forcedState = switchSta === '1' ? 'forced_on' : 'forced_off';
            analytics.forcedModeMeters.push({
              roomNo,
              controlMode: forcedState,
              meterId: meterData.meterId || cred.room_no,
            });
          }
        }

        // Fetch sales data for this user
        try {
          const salesResponse = await iotClient.getUserSaleList(
            startDate,
            endDate,
            userToken
          );

          if (salesResponse.success === '1' && salesResponse.data) {
            for (const sale of salesResponse.data) {
              const amount = parseFloat(sale.saleMoney || '0');
              if (amount > 0 && sale.success === 1) {
                analytics.totalRevenue += amount;

                // Aggregate by day
                const saleDate = sale.createTime.split(' ')[0];
                revenueByDayMap.set(saleDate, (revenueByDayMap.get(saleDate) || 0) + amount);

                // Aggregate by project
                const projKey = cred.project_id || 'unknown';
                const existing = revenueByProjectMap.get(projKey) || { projectName, revenue: 0 };
                existing.revenue += amount;
                revenueByProjectMap.set(projKey, existing);

                // Aggregate by meter
                const meterKey = sale.roomNo;
                const meterExisting = revenueByMeterMap.get(meterKey) || { roomNo: sale.roomNo, revenue: 0, projectName };
                meterExisting.revenue += amount;
                revenueByMeterMap.set(meterKey, meterExisting);
              }
            }
          }
        } catch (e) {
          console.error(`[Analytics] Error fetching sales for ${roomNo}:`, e);
        }

        // Fetch energy data for this meter
        if (meterData?.meterId) {
          try {
            const energyResponse = await iotClient.getMeterEnergyDay(
              meterData.meterId,
              `${startDate} 00:00:00`,
              `${endDate} 23:59:59`,
              userToken
            );

            if (energyResponse.success === '1' && energyResponse.data) {
              let meterTotalEnergy = 0;
              
              for (const record of energyResponse.data) {
                const energy = parseFloat(record.powerUse || '0');
                meterTotalEnergy += energy;

                // Aggregate by day
                const energyDate = record.createTime.split(' ')[0];
                energyByDayMap.set(energyDate, (energyByDayMap.get(energyDate) || 0) + energy);
              }

              analytics.totalEnergy += meterTotalEnergy;
              energyByMeterMap.set(meterData.meterId, {
                roomNo,
                energy: meterTotalEnergy,
                projectName,
              });
            }
          } catch (e) {
            console.error(`[Analytics] Error fetching energy for ${roomNo}:`, e);
          }
        }
      } catch (e) {
        console.error(`[Analytics] Error processing meter ${cred.room_no}:`, e);
      }
    }

    // Convert maps to sorted arrays
    analytics.revenueByDay = Array.from(revenueByDayMap.entries())
      .map(([date, revenue]) => ({ date, revenue }))
      .sort((a, b) => a.date.localeCompare(b.date));

    analytics.revenueByProject = Array.from(revenueByProjectMap.entries())
      .map(([projectId, data]) => ({ projectId, ...data }))
      .sort((a, b) => b.revenue - a.revenue);

    analytics.energyByDay = Array.from(energyByDayMap.entries())
      .map(([date, energy]) => ({ date, energy }))
      .sort((a, b) => a.date.localeCompare(b.date));

    analytics.energyByMeter = Array.from(energyByMeterMap.entries())
      .map(([meterId, data]) => ({ meterId, ...data }))
      .sort((a, b) => b.energy - a.energy);

    // Top consumers (by energy)
    analytics.topConsumers = analytics.energyByMeter.slice(0, 10);

    // Top revenue generators
    analytics.topRevenue = Array.from(revenueByMeterMap.values())
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 10);

    // Sort live power by highest first
    analytics.livePowerByMeter.sort((a, b) => b.power - a.power);

    // Sort alerts
    analytics.lowBalanceMeters.sort((a, b) => a.balance - b.balance);

    // Fetch power history for the period
    try {
      const { data: powerReadings } = await supabaseAdmin
        .from('power_readings')
        .select('recorded_at, total_power, active_meters')
        .gte('recorded_at', `${startDate}T00:00:00`)
        .lte('recorded_at', `${endDate}T23:59:59`)
        .order('recorded_at', { ascending: true })
        .limit(500);

      if (powerReadings) {
        analytics.powerHistory = powerReadings.map((r: any) => ({
          timestamp: r.recorded_at,
          power: parseFloat(r.total_power) || 0,
          activeMeters: r.active_meters || 0,
        }));
      }
    } catch (e) {
      console.error('[Analytics] Error fetching power history:', e);
    }

    // Record current power reading (if we have live power data)
    if (analytics.livePower > 0 || analytics.activeMeters > 0) {
      try {
        // Build readings by project
        const projectPowerMap: Record<string, { projectName: string; power: number; meterCount: number }> = {};
        for (const meter of analytics.livePowerByMeter) {
          const key = meter.projectName;
          if (!projectPowerMap[key]) {
            projectPowerMap[key] = { projectName: key, power: 0, meterCount: 0 };
          }
          projectPowerMap[key].power += meter.power;
          projectPowerMap[key].meterCount += 1;
        }

        await supabaseAdmin
          .from('power_readings')
          .insert({
            total_power: analytics.livePower,
            active_meters: analytics.activeMeters,
            readings_by_project: projectPowerMap,
            readings_by_meter: analytics.livePowerByMeter.slice(0, 20), // Limit to top 20
          });
      } catch (e) {
        console.error('[Analytics] Error recording power reading:', e);
      }
    }

    return NextResponse.json({
      success: true,
      data: analytics,
      period: { startDate, endDate },
    });
  } catch (error: any) {
    console.error('[Analytics] Error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch analytics' },
      { status: 500 }
    );
  }
}

// Helper functions
function getDefaultStartDate(): string {
  const date = new Date();
  date.setDate(1); // First of current month
  return date.toISOString().split('T')[0];
}

function getDefaultEndDate(): string {
  return new Date().toISOString().split('T')[0];
}
