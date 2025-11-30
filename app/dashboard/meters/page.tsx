'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Gauge, Power, PowerOff, RefreshCw, Zap, Wifi, WifiOff } from 'lucide-react';
import { formatNaira } from '@/lib/utils';
import { toast } from 'sonner';
import type { UserMeter } from '@/types/iot';

export default function MetersPage() {
  const router = useRouter();
  const [meters, setMeters] = useState<UserMeter[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [controllingMeter, setControllingMeter] = useState<string | null>(null);

  useEffect(() => {
    fetchMeters();
  }, []);

  const fetchMeters = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/meters');
      const data = await response.json();
      
      if (response.status === 401 && data.tokenExpired) {
        toast.error('Session expired. Please login again.');
        router.push('/login');
        return;
      }
      
      if (data.success) {
        setMeters(data.data);
      } else {
        toast.error(data.error || 'Failed to fetch meters');
      }
    } catch (error) {
      toast.error('Failed to fetch meters');
    } finally {
      setIsLoading(false);
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
        <Button onClick={fetchMeters} variant="outline" disabled={isLoading}>
          <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
          Refresh
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
            const balance = parseFloat(meter.balance) || 0;
            const epi = parseFloat(meter.epi) || 0;
            const isPowerConnected = meter.switchSta === 1;
            const isNetworkConnected = meter.unConnect === 0;
            
            return (
              <Card key={meter.meterId}>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span className="flex items-center gap-2">
                      <Zap className="w-5 h-5 text-armogrid-red" />
                      Meter ID: {meter.meterId}
                    </span>
                    {isNetworkConnected ? (
                      <Badge variant="success" className="flex items-center gap-1">
                        <Wifi className="h-3 w-3" />
                        Online
                      </Badge>
                    ) : (
                      <Badge variant="destructive" className="flex items-center gap-1">
                        <WifiOff className="h-3 w-3" />
                        Offline
                      </Badge>
                    )}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Room</p>
                    <p className="font-medium">{meter.roomNo}</p>
                  </div>

                  <div>
                    <p className="text-sm text-muted-foreground">Balance</p>
                    <p className="text-2xl font-bold text-primary">
                      {formatNaira(balance * 100)}
                    </p>
                  </div>

                  {/* Power Status */}
                  <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                    <div className="flex items-center gap-2">
                      {isPowerConnected ? (
                        <Power className="h-5 w-5 text-green-600" />
                      ) : (
                        <PowerOff className="h-5 w-5 text-red-600" />
                      )}
                      <span className="text-sm font-medium">Power Status</span>
                    </div>
                    <Badge variant={isPowerConnected ? 'success' : 'destructive'}>
                      {isPowerConnected ? 'Connected' : 'Disconnected'}
                    </Badge>
                  </div>


                  {/* Network Warning */}
                  {!isNetworkConnected && (
                    <div className="text-xs text-amber-600 bg-amber-50 dark:bg-amber-950/20 p-2 rounded">
                      ⚠️ No network connection. Control unavailable.
                    </div>
                  )}

                  {/* Power Control */}
                  <div className="pt-2 border-t">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium">Power Control</p>
                      <button
                        onClick={() => controlMeter(
                          meter.meterId,
                          isPowerConnected ? 0 : 2,
                          meter
                        )}
                        disabled={!isNetworkConnected || controllingMeter === meter.meterId}
                        className={`
                          relative w-14 h-14 rounded-2xl transition-all duration-300 shadow-lg
                          disabled:opacity-50 disabled:cursor-not-allowed
                          hover:scale-105 active:scale-95
                          ${isPowerConnected
                            ? 'bg-gradient-to-br from-green-400 to-green-600 shadow-green-500/50'
                            : 'bg-gradient-to-br from-gray-400 to-gray-600 shadow-gray-500/50'
                          }
                        `}
                      >
                        {controllingMeter === meter.meterId ? (
                          <div className="absolute inset-0 flex items-center justify-center">
                            <div className="w-6 h-6 border-3 border-white border-t-transparent rounded-full animate-spin" />
                          </div>
                        ) : (
                          <div className="absolute inset-0 flex items-center justify-center">
                            <Power className="w-7 h-7 text-white" strokeWidth={2.5} />
                          </div>
                        )}
                      </button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
