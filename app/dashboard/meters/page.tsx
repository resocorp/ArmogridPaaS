"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Gauge, Info, Power, PowerOff, RefreshCw, Zap, Wifi, WifiOff } from 'lucide-react';
import { formatNaira, isValidMeterId, cn } from '@/lib/utils';
import { MIN_RECHARGE_AMOUNT, MAX_RECHARGE_AMOUNT, PAYSTACK_FEE } from '@/lib/constants';
import { toast } from 'sonner';
import type { UserMeter, MeterDetailedInfo } from '@/types/iot';

// Auto-refresh interval: 10 minutes
const REFRESH_INTERVAL = 10 * 60 * 1000;

// Usage level thresholds (in watts)
const getUsageLevel = (powerWatts: number) => {
  if (powerWatts < 200) return { color: 'emerald', bgClass: 'bg-emerald-50', textClass: 'text-emerald-600', borderClass: 'border-emerald-200', label: 'Low' };
  if (powerWatts < 800) return { color: 'amber', bgClass: 'bg-amber-50', textClass: 'text-amber-600', borderClass: 'border-amber-200', label: 'Moderate' };
  return { color: 'red', bgClass: 'bg-red-50', textClass: 'text-red-600', borderClass: 'border-red-200', label: 'High' };
};

export default function MetersPage() {
  const router = useRouter();
  const [meters, setMeters] = useState<UserMeter[]>([]);
  const [meterDetails, setMeterDetails] = useState<Record<string, MeterDetailedInfo>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [controllingMeter, setControllingMeter] = useState<string | null>(null);
  const [rechargeMeterId, setRechargeMeterId] = useState<string | null>(null);
  const [rechargeAmount, setRechargeAmount] = useState('');
  const [rechargeEmail, setRechargeEmail] = useState('');
  const [isRechargeLoading, setIsRechargeLoading] = useState(false);
  const [pulseOn, setPulseOn] = useState(true);

  // Pulsing effect for live indicator
  useEffect(() => {
    const interval = setInterval(() => setPulseOn(p => !p), 1500);
    return () => clearInterval(interval);
  }, []);

  // Auto-refresh every 10 minutes
  useEffect(() => {
    fetchMeters();
    
    const refreshInterval = setInterval(() => {
      fetchMeters(true);
    }, REFRESH_INTERVAL);
    
    return () => clearInterval(refreshInterval);
  }, []);

  // Fetch detailed info for a single meter
  const fetchMeterDetails = async (roomNo: string): Promise<MeterDetailedInfo | null> => {
    try {
      const response = await fetch('/api/meters/info', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ roomNo }),
      });
      const data = await response.json();
      if (data.success) {
        return data.data;
      }
      return null;
    } catch (error) {
      console.error(`Failed to fetch details for ${roomNo}:`, error);
      return null;
    }
  };

  const fetchMeters = async (silent = false) => {
    if (!silent) {
      setIsLoading(true);
    } else {
      setIsRefreshing(true);
    }
    
    try {
      const response = await fetch('/api/meters');
      const data = await response.json();
      
      if (response.status === 401 && data.tokenExpired) {
        toast.error('Session expired. Please login again.');
        router.push('/login');
        return;
      }
      
      if (data.success) {
        const meterList: UserMeter[] = data.data;
        setMeters(meterList);
        
        // Fetch detailed info for all meters in parallel
        const detailsPromises = meterList.map(async (meter) => {
          const details = await fetchMeterDetails(meter.roomNo);
          return { meterId: meter.meterId, details };
        });
        
        const detailsResults = await Promise.all(detailsPromises);
        const newDetails: Record<string, MeterDetailedInfo> = {};
        
        detailsResults.forEach(({ meterId, details }) => {
          if (details) {
            newDetails[meterId] = details;
          }
        });
        
        setMeterDetails(newDetails);
      } else {
        toast.error(data.error || 'Failed to fetch meters');
      }
    } catch (error) {
      toast.error('Failed to fetch meters');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  const feeCalculation = useMemo(() => {
    const amountNum = parseFloat(rechargeAmount);
    if (isNaN(amountNum) || amountNum <= 0) {
      return null;
    }

    const percentageFee = Math.ceil(amountNum * PAYSTACK_FEE.LOCAL_PERCENTAGE);
    const flatFee = amountNum >= PAYSTACK_FEE.LOCAL_FLAT_THRESHOLD ? PAYSTACK_FEE.LOCAL_FLAT : 0;

    let fee = percentageFee + flatFee;
    fee = Math.min(fee, PAYSTACK_FEE.LOCAL_CAP);

    const totalAmount = amountNum + fee;

    let feeDescription: string;
    if (amountNum < PAYSTACK_FEE.LOCAL_FLAT_THRESHOLD) {
      feeDescription = '1.5% (₦100 fee waived)';
    } else {
      feeDescription = '1.5% + ₦100';
    }

    return {
      rechargeAmount: amountNum,
      fee,
      totalAmount,
      feeDescription,
    };
  }, [rechargeAmount]);

  const startRecharge = (meterId: string) => {
    setRechargeMeterId(meterId);
    setRechargeAmount('');
    setRechargeEmail('');
  };

  const handleRecharge = async (e: React.FormEvent, meterId: string) => {
    e.preventDefault();

    if (!isValidMeterId(meterId)) {
      toast.error('Invalid meter ID');
      return;
    }

    const amountNum = parseFloat(rechargeAmount);
    if (isNaN(amountNum) || amountNum < MIN_RECHARGE_AMOUNT || amountNum > MAX_RECHARGE_AMOUNT) {
      toast.error(
        `Amount must be between ${formatNaira(MIN_RECHARGE_AMOUNT * 100)} and ${formatNaira(
          MAX_RECHARGE_AMOUNT * 100
        )}`
      );
      return;
    }

    if (!rechargeEmail || !rechargeEmail.includes('@')) {
      toast.error('Please enter a valid email address');
      return;
    }

    setIsRechargeLoading(true);

    try {
      const response = await fetch('/api/payment/initialize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          meterId,
          amount: amountNum,
          email: rechargeEmail,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to initialize payment');
      }

      window.location.href = data.data.authorization_url;
    } catch (error: any) {
      toast.error(error.message || 'Failed to initialize payment');
      setIsRechargeLoading(false);
    }
  };

  const controlMeter = async (meterId: string, type: 0 | 2, meter: UserMeter) => {
    if (meter.unConnect === 1) {
      toast.error('Cannot control meter - No network connection');
      return;
    }

    setControllingMeter(meterId);
    try {
      const response = await fetch(`/api/meters/${meterId}/control`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type }),
      });

      const data = await response.json();
      if (data.success) {
        toast.success(type === 0 ? 'Meter turned OFF' : 'Meter turned ON (Prepaid mode)');
        setTimeout(fetchMeters, 500);
      } else {
        throw new Error(data.error);
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to control meter');
    } finally {
      setControllingMeter(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Meters</h1>
          <p className="text-muted-foreground">Manage and control your meters</p>
        </div>
        <Button onClick={() => fetchMeters()} variant="outline" disabled={isLoading || isRefreshing}>
          <RefreshCw className={`w-4 h-4 mr-2 ${isLoading || isRefreshing ? 'animate-spin' : ''}`} />
          {isRefreshing ? 'Refreshing...' : 'Refresh'}
        </Button>
      </div>

      {isLoading ? (
        <div className="text-center py-12">
          <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading meters...</p>
        </div>
      ) : meters.length === 0 ? (
        <Card>
          <CardContent className="text-center py-12">
            <Gauge className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">No meters found</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {meters.map((meter) => {
            const details = meterDetails[meter.meterId];
            const balance = details ? parseFloat(details.balance) : parseFloat(meter.balance) || 0;
            const power = details ? parseFloat(details.p) || 0 : 0;
            const voltage = details?.ua || '0';
            const current = details?.ia || '0';
            const totalEnergy = details?.epi || meter.epi || '0';
            const rate = details?.priceFlat || 0;
            const isPowerConnected = details ? details.switchSta === "1" : meter.switchSta === 1;
            const isNetworkConnected = details ? details.unConnnect === 0 : meter.unConnect === 0;
            const powerWatts = power * 1000; // Convert kW to watts
            const usageLevel = getUsageLevel(powerWatts);
            
            return (
              <Card key={meter.meterId} className="overflow-hidden">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 bg-gradient-to-br from-teal-500 to-teal-600 rounded-xl flex items-center justify-center shadow-sm">
                        <Zap className="w-5 h-5 text-white" />
                      </div>
                      <div>
                        <CardTitle className="text-base">Meter ID: {meter.meterId}</CardTitle>
                        <p className="text-sm text-muted-foreground">{meter.roomNo}</p>
                      </div>
                    </div>
                    {isNetworkConnected ? (
                      <Badge variant="success" className="flex items-center gap-1.5 px-2.5 py-1">
                        <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
                        Online
                      </Badge>
                    ) : (
                      <Badge variant="destructive" className="flex items-center gap-1.5 px-2.5 py-1">
                        <WifiOff className="h-3 w-3" />
                        Offline
                      </Badge>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="space-y-4 pt-0">
                  {/* Live Usage Section */}
                  <div className={cn(
                    "rounded-xl p-4 border",
                    usageLevel.bgClass,
                    usageLevel.borderClass,
                    "dark:bg-opacity-20"
                  )}>
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span 
                          className={cn(
                            "w-2 h-2 rounded-full transition-opacity duration-300",
                            usageLevel.textClass.replace('text-', 'bg-'),
                            pulseOn ? "opacity-100" : "opacity-40"
                          )} 
                        />
                        <span className="text-sm text-muted-foreground font-medium">Using Now</span>
                      </div>
                      <span className={cn(
                        "text-xs font-semibold px-2 py-0.5 rounded-full",
                        usageLevel.bgClass,
                        usageLevel.textClass
                      )}>
                        {usageLevel.label}
                      </span>
                    </div>
                    <div className="flex items-baseline gap-1">
                      <span className="text-3xl font-bold text-foreground">{Math.round(powerWatts).toLocaleString()}</span>
                      <span className="text-base text-muted-foreground font-medium">watts</span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      Rate: ₦{rate}/kWh
                    </p>
                    
                    {/* Mini Stats Row */}
                    <div className="flex gap-4 mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
                      <div>
                        <p className="text-xs text-muted-foreground">Voltage</p>
                        <p className="text-sm font-semibold">{voltage}V</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Current</p>
                        <p className="text-sm font-semibold">{current}A</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Total Used</p>
                        <p className="text-sm font-semibold">{totalEnergy} kWh</p>
                      </div>
                    </div>
                  </div>

                  {/* Balance Section */}
                  <div className="flex items-center justify-between gap-4 p-4 bg-muted/30 rounded-xl">
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Balance</p>
                      <p className="text-2xl font-bold text-foreground">
                        {formatNaira(balance * 100)}
                      </p>
                    </div>
                    <Button size="sm" className="bg-gray-900 hover:bg-gray-800 text-white" onClick={() => startRecharge(meter.meterId)}>
                      Buy Credit
                    </Button>
                  </div>

                  {/* Power Status & Control */}
                  <div className={cn(
                    "flex items-center justify-between p-3 rounded-xl border",
                    isPowerConnected 
                      ? "bg-emerald-50/50 border-emerald-200 dark:bg-emerald-950/20 dark:border-emerald-900" 
                      : "bg-red-50/50 border-red-200 dark:bg-red-950/20 dark:border-red-900"
                  )}>
                    <div className="flex items-center gap-3">
                      <Power className={cn(
                        "h-5 w-5",
                        isPowerConnected ? "text-emerald-600" : "text-red-500"
                      )} />
                      <div>
                        <p className="text-sm text-muted-foreground">Power Status</p>
                        <p className={cn(
                          "text-sm font-semibold",
                          isPowerConnected ? "text-emerald-600" : "text-red-600"
                        )}>
                          {isPowerConnected ? 'Connected' : 'Disconnected'}
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => {
                        if (isPowerConnected) {
                          if (window.confirm('Are you sure you want to turn off the meter? This will disconnect power to the meter.')) {
                            controlMeter(meter.meterId, 0, meter);
                          }
                        } else {
                          controlMeter(meter.meterId, 2, meter);
                        }
                      }}
                      disabled={!isNetworkConnected || controllingMeter === meter.meterId}
                      className={cn(
                        "w-12 h-12 rounded-full flex items-center justify-center transition-all duration-200",
                        "disabled:opacity-50 disabled:cursor-not-allowed",
                        "hover:scale-105 active:scale-95",
                        isPowerConnected
                          ? "bg-emerald-500 shadow-lg shadow-emerald-500/40"
                          : "bg-gray-400 shadow-lg shadow-gray-400/40"
                      )}
                    >
                      {controllingMeter === meter.meterId ? (
                        <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <Power className="w-5 h-5 text-white" strokeWidth={2.5} />
                      )}
                    </button>
                  </div>

                  {/* Network Warning */}
                  {!isNetworkConnected && (
                    <div className="text-xs text-amber-600 bg-amber-50 dark:bg-amber-950/20 p-2 rounded-lg border border-amber-200 dark:border-amber-900">
                      ⚠️ No network connection. Control unavailable.
                    </div>
                  )}

                  {/* Buy Credit Form */}
                  {rechargeMeterId === meter.meterId && (
                    <div className="pt-4 mt-2 border-t space-y-3">
                      <p className="text-sm font-medium">Buy Credit</p>
                      <form
                        className="space-y-3"
                        onSubmit={(e) => handleRecharge(e, meter.meterId)}
                      >
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          <div className="space-y-1">
                            <Label htmlFor={`amount-${meter.meterId}`}>Amount (₦)</Label>
                            <Input
                              id={`amount-${meter.meterId}`}
                              type="number"
                              value={rechargeAmount}
                              onChange={(event) => setRechargeAmount(event.target.value)}
                              min={MIN_RECHARGE_AMOUNT}
                              max={MAX_RECHARGE_AMOUNT}
                              step="100"
                              required
                            />
                                                      </div>
                          <div className="space-y-1">
                            <Label htmlFor={`email-${meter.meterId}`}>Email</Label>
                            <Input
                              id={`email-${meter.meterId}`}
                              type="email"
                              value={rechargeEmail}
                              onChange={(event) => setRechargeEmail(event.target.value)}
                              required
                            />
                            <p className="text-[10px] text-muted-foreground">
                              Used for payment confirmation and receipt
                            </p>
                          </div>
                        </div>

                        {feeCalculation && (
                          <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900 rounded-md p-3 space-y-1">
                            <div className="flex items-start gap-2">
                              <Info className="w-4 h-4 text-blue-600 dark:text-blue-400 mt-0.5" />
                              <div className="flex-1 text-xs space-y-1">
                                <p className="font-medium text-blue-900 dark:text-blue-100">
                                  Payment Breakdown
                                </p>
                                <div className="flex justify-between">
                                  <span className="text-blue-900/80 dark:text-blue-100/80">
                                    Recharge amount:
                                  </span>
                                  <span className="font-semibold">
                                    ₦{feeCalculation.rechargeAmount.toLocaleString()}
                                  </span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-blue-900/80 dark:text-blue-100/80">
                                    Paystack fee ({feeCalculation.feeDescription}):
                                  </span>
                                  <span className="font-semibold">
                                    ₦{feeCalculation.fee.toLocaleString()}
                                  </span>
                                </div>
                                <div className="flex justify-between border-t border-blue-200 dark:border-blue-800 pt-1 mt-1">
                                  <span className="font-semibold">Total to pay:</span>
                                  <span className="font-bold">
                                    ₦{feeCalculation.totalAmount.toLocaleString()}
                                  </span>
                                </div>
                              </div>
                            </div>
                          </div>
                        )}

                        <div className="flex items-center justify-end gap-2 pt-1">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => setRechargeMeterId(null)}
                            disabled={isRechargeLoading}
                          >
                            Cancel
                          </Button>
                          <Button
                            type="submit"
                            size="sm"
                            disabled={isRechargeLoading}
                          >
                            {isRechargeLoading && rechargeMeterId === meter.meterId
                              ? 'Processing...'
                              : feeCalculation
                              ? `Pay ₦${feeCalculation.totalAmount.toLocaleString()}`
                              : 'Pay'}
                          </Button>
                        </div>
                      </form>
                    </div>
                  )}

                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
