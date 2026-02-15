import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin, getAdminToken, getUserToken } from '@/lib/auth';
import { iotClient } from '@/lib/iot-client';
import { supabaseAdmin } from '@/lib/supabase';

interface MeterStatus {
  normal: number;
  offline: number;
  alarm: number;
  total: number;
}

interface AnalyticsData {
  totalRevenue: number;
  totalEnergy: number;
  livePower: number;
  meterStatus: MeterStatus;
  revenueByDay: { date: string; revenue: number }[];
  revenueByProject: { projectId: string; projectName: string; revenue: number }[];
  energyByDay: { date: string; energy: number }[];
  energyByMeter: { meterId: string; roomNo: string; energy: number; projectName: string }[];
  powerHistory: { timestamp: string; power: number; activeMeters: number }[];
  topConsumers: { roomNo: string; meterId: string; energy: number; projectName: string }[];
  topRevenue: { roomNo: string; revenue: number; projectName: string; meterId: string }[];
  lowBalanceMeters: { roomNo: string; balance: number; meterId: string; alarmThreshold: number }[];
  forcedModeMeters: { roomNo: string; controlMode: string; meterId: string }[];
  offlineMeters: { roomNo: string; meterId: string }[];
  livePowerByMeter: { roomNo: string; meterId: string; power: number; projectName: string }[];
}

interface MeterInfo {
  meterId: string;
  roomNo: string;
  projectId: string;
  projectName: string;
  balance: number;
  power: number;
  isOnline: boolean;
  isAlarm: boolean;
  alarmA: number;
  controlMode: string;
  switchSta: string;
}

// Helper to process meter data from appProjectMeterList response
function processMeterFromList(
  meter: any,
  adminToken: string,
  startDate: string,
  endDate: string
): { meterInfo: any; salesPromise: Promise<any>; energyPromise: Promise<any> } {
  const meterId = String(meter.id || '');
  const roomNo = meter.roomNo || meter.meterName || meter.meterSn || '';
  const projectId = String(meter.projectId || '');
  const projectName = meter.projectName || 'Unknown';
  
  // Extract meter data directly from appProjectMeterList response
  const balance = parseFloat(meter.balance || '0');
  const alarmA = parseFloat(meter.alarmA || '100');
  // unConnect: 0 = online, 1 = offline (note: single 'n' in API response)
  const isOnline = meter.unConnect === 0 || meter.unConnect === '0';
  const isAlarm = balance > 0 && alarmA > 0 && balance < alarmA;
  
  const meterInfo = {
    roomNo,
    meterId,
    meterSn: meter.meterSn || '',
    projectId,
    projectName,
    balance,
    power: 0, // Will be updated from energy data if available
    alarmA,
    isOnline,
    isAlarm,
    controlMode: meter.prepaidType,
    switchSta: meter.switchSta,
    status: !isOnline ? 'offline' as const : isAlarm ? 'alarm' as const : 'normal' as const,
    EPI: parseFloat(meter.EPI || '0'),
  };

  // Create promises for sales and energy data
  const salesPromise = meterId 
    ? iotClient.getSaleInfoByMeterId(meterId, startDate, endDate, adminToken).catch(() => null)
    : Promise.resolve(null);
  const energyPromise = meterId
    ? iotClient.getMeterEnergyDay(meterId, `${startDate} 00:00:00`, `${endDate} 23:59:59`, adminToken).catch(() => null)
    : Promise.resolve(null);

  return { meterInfo, salesPromise, energyPromise };
}

// GET - Fetch analytics data with live IoT data (OPTIMIZED with parallel processing)
export async function GET(request: NextRequest) {
  try {
    await requireAdmin();
    const adminToken = await getAdminToken();
    
    if (!adminToken) {
      return NextResponse.json(
        { error: 'No admin token available' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('startDate') || getDefaultStartDate();
    const endDate = searchParams.get('endDate') || getDefaultEndDate();
    const projectIdsParam = searchParams.get('projectIds');
    
    const projectIdFilter = projectIdsParam 
      ? new Set(projectIdsParam.split(',').filter(Boolean))
      : null;

    console.log(`[Analytics] Fetching live data from ${startDate} to ${endDate}`);
    const startTime = Date.now();

    // Get user token for APIs that require user authentication
    let userToken: string;
    try {
      userToken = await getUserToken();
    } catch (e) {
      console.error('[Analytics] Failed to get user token, falling back to admin token');
      userToken = adminToken;
    }

    // Step 1: Fetch all projects
    const projectsResponse = await iotClient.getProjectList('', 100, 1, adminToken);
    if (projectsResponse.success !== '1') {
      console.error('[Analytics] Failed to fetch projects:', projectsResponse.errorMsg);
      return NextResponse.json(
        { error: 'Failed to fetch projects' },
        { status: 500 }
      );
    }

    let projects = projectsResponse.data?.list || [];
    if (projectIdFilter && projectIdFilter.size > 0) {
      projects = projects.filter((p: any) => projectIdFilter.has(String(p.id)));
    }

    console.log(`[Analytics] Processing ${projects.length} projects`);

    // Step 2: Fetch all meters for all projects using appProjectMeterList (more reliable)
    const projectMeterPromises = projects.map(async (project: any) => {
      const projectId = String(project.id);
      const projectName = project.projectName || 'Unknown';
      try {
        const meterListResponse = await iotClient.getProjectMeterList(projectId, userToken);
        if (meterListResponse.success === '1' && meterListResponse.data?.list) {
          return { projectId, projectName, meters: meterListResponse.data.list };
        }
      } catch (e) {
        console.error(`[Analytics] Failed to get meter list for project ${projectId}:`, e);
      }
      return { projectId, projectName, meters: [] };
    });

    const projectMeters = await Promise.all(projectMeterPromises);
    
    // Log meter counts per project for debugging
    let totalMeterCount = 0;
    for (const { projectId, projectName, meters } of projectMeters) {
      console.log(`[Analytics] Project "${projectName}" (${projectId}): ${meters.length} meters`);
      totalMeterCount += meters.length;
    }
    console.log(`[Analytics] Total meters to process: ${totalMeterCount}`);
    
    // Step 3: Process all meters - extract info and create sales/energy promises
    const meterResults: any[] = [];
    const salesEnergyPromises: { meterInfo: any; salesPromise: Promise<any>; energyPromise: Promise<any> }[] = [];
    
    for (const { meters } of projectMeters) {
      for (const meter of meters) {
        const processed = processMeterFromList(meter, adminToken, startDate, endDate);
        salesEnergyPromises.push(processed);
        meterResults.push(processed.meterInfo);
      }
    }

    // Fetch sales and energy data in parallel batches
    const BATCH_SIZE = 10;
    for (let i = 0; i < salesEnergyPromises.length; i += BATCH_SIZE) {
      const batch = salesEnergyPromises.slice(i, i + BATCH_SIZE);
      const salesResults = await Promise.all(batch.map(b => b.salesPromise));
      const energyResults = await Promise.all(batch.map(b => b.energyPromise));
      
      // Attach results to meter info
      for (let j = 0; j < batch.length; j++) {
        const meterIndex = i + j;
        if (meterIndex < meterResults.length) {
          meterResults[meterIndex].sales = salesResults[j];
          meterResults[meterIndex].energy = energyResults[j];
        }
      }
    }

    console.log(`[Analytics] Processed ${meterResults.length} meter results`);
    
    // Debug: Log status breakdown before aggregation
    const statusBreakdown = { normal: 0, offline: 0, alarm: 0 };
    for (const m of meterResults) {
      if (m.status === 'offline') statusBreakdown.offline++;
      else if (m.status === 'alarm') statusBreakdown.alarm++;
      else if (m.status === 'normal') statusBreakdown.normal++;
    }
    console.log(`[Analytics] Pre-aggregation status: Normal=${statusBreakdown.normal}, Offline=${statusBreakdown.offline}, Alarm=${statusBreakdown.alarm}`);

    // Initialize analytics data
    const analytics: AnalyticsData = {
      totalRevenue: 0,
      totalEnergy: 0,
      livePower: 0,
      meterStatus: { normal: 0, offline: 0, alarm: 0, total: 0 },
      revenueByDay: [],
      revenueByProject: [],
      energyByDay: [],
      energyByMeter: [],
      powerHistory: [],
      topConsumers: [],
      topRevenue: [],
      lowBalanceMeters: [],
      forcedModeMeters: [],
      offlineMeters: [],
      livePowerByMeter: [],
    };

    // Aggregation maps
    const revenueByDayMap = new Map<string, number>();
    const revenueByProjectMap = new Map<string, { projectName: string; revenue: number }>();
    const energyByDayMap = new Map<string, number>();
    const energyByMeterMap = new Map<string, { roomNo: string; energy: number; projectName: string }>();
    const revenueByMeterMap = new Map<string, { roomNo: string; revenue: number; projectName: string }>();

    // Process all meter results
    for (const meter of meterResults) {
      analytics.meterStatus.total++;

      if (meter.status === 'offline') {
        analytics.meterStatus.offline++;
        analytics.offlineMeters.push({ roomNo: meter.roomNo, meterId: meter.meterId });
        continue;
      }

      if (meter.status === 'alarm') {
        analytics.meterStatus.alarm++;
        analytics.lowBalanceMeters.push({
          roomNo: meter.roomNo,
          balance: meter.balance,
          meterId: meter.meterId,
          alarmThreshold: meter.alarmA,
        });
      } else {
        analytics.meterStatus.normal++;
      }

      // Track live power
      if (meter.isOnline && meter.power > 0) {
        analytics.livePower += meter.power;
        analytics.livePowerByMeter.push({
          roomNo: meter.roomNo,
          meterId: meter.meterId,
          power: meter.power,
          projectName: meter.projectName,
        });
      }

      // Check for forced mode
      if (meter.controlMode === '1' || meter.controlMode === '2') {
        analytics.forcedModeMeters.push({
          roomNo: meter.roomNo,
          controlMode: meter.switchSta === '1' ? 'forced_on' : 'forced_off',
          meterId: meter.meterId,
        });
      }

      // Process sales data
      if (meter.sales && (meter.sales as any).success === '1' && meter.sales.data) {
        for (const sale of meter.sales.data) {
          const amount = parseFloat(sale.saleMoney || sale.money || '0');
          if (amount > 0) {
            analytics.totalRevenue += amount;
            const saleDate = (sale.createTime || sale.saleDate || '').split(' ')[0];
            if (saleDate) {
              revenueByDayMap.set(saleDate, (revenueByDayMap.get(saleDate) || 0) + amount);
            }
            const existing = revenueByProjectMap.get(meter.projectId) || { projectName: meter.projectName, revenue: 0 };
            existing.revenue += amount;
            revenueByProjectMap.set(meter.projectId, existing);
            const meterExisting = revenueByMeterMap.get(meter.meterId) || { roomNo: meter.roomNo, revenue: 0, projectName: meter.projectName };
            meterExisting.revenue += amount;
            revenueByMeterMap.set(meter.meterId, meterExisting);
          }
        }
      }

      // Process energy data
      if (meter.energy && meter.energy.success === '1' && meter.energy.data) {
        let meterTotalEnergy = 0;
        for (const record of meter.energy.data) {
          const energy = parseFloat(record.powerUse || '0');
          meterTotalEnergy += energy;
          const energyDate = record.createTime.split(' ')[0];
          energyByDayMap.set(energyDate, (energyByDayMap.get(energyDate) || 0) + energy);
        }
        if (meterTotalEnergy > 0) {
          analytics.totalEnergy += meterTotalEnergy;
          energyByMeterMap.set(meter.meterId, {
            roomNo: meter.roomNo,
            energy: meterTotalEnergy,
            projectName: meter.projectName,
          });
        }
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
    analytics.topRevenue = Array.from(revenueByMeterMap.entries())
      .map(([meterId, data]) => ({ meterId, ...data }))
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

    // Record current power reading
    if (analytics.livePower > 0 || analytics.meterStatus.normal > 0) {
      try {
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
            recorded_at: new Date().toISOString(),
            total_power: analytics.livePower,
            active_meters: analytics.meterStatus.normal,
            readings_by_project: projectPowerMap,
            readings_by_meter: analytics.livePowerByMeter.slice(0, 20),
          });
      } catch (e) {
        console.error('[Analytics] Error recording power reading:', e);
      }
    }

    const loadTime = Date.now() - startTime;
    console.log(`[Analytics] Complete in ${loadTime}ms - Revenue: ${analytics.totalRevenue}, Energy: ${analytics.totalEnergy}, Power: ${analytics.livePower}`);
    console.log(`[Analytics] Meter Status - Normal: ${analytics.meterStatus.normal}, Offline: ${analytics.meterStatus.offline}, Alarm: ${analytics.meterStatus.alarm}`);

    return NextResponse.json({
      success: true,
      data: analytics,
      period: { startDate, endDate },
      loadTimeMs: loadTime,
    });
  } catch (error: any) {
    console.error('[Analytics] Error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch analytics' },
      { status: 500 }
    );
  }
}

function getDefaultStartDate(): string {
  const date = new Date();
  date.setDate(1);
  return date.toISOString().split('T')[0];
}

function getDefaultEndDate(): string {
  return new Date().toISOString().split('T')[0];
}
