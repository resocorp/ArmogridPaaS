'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Zap, Wifi, WifiOff, Power, PowerOff } from 'lucide-react';
import { formatNaira } from '@/lib/utils';
import type { UserMeter } from '@/types/iot';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface MeterCardProps {
  meter: UserMeter;
  className?: string;
  onMeterUpdate?: () => void;
}

export function MeterCard({ meter, className, onMeterUpdate }: MeterCardProps) {
  const balance = parseFloat(meter.balance) || 0;
  const epi = parseFloat(meter.epi) || 0;
  const isPowerConnected = meter.switchSta === 1;
  const isNetworkConnected = meter.unConnect === 0;
  const [isControlling, setIsControlling] = useState(false);

  const handleTogglePower = async () => {
    if (!isNetworkConnected) {
      toast.error('Cannot control meter - No network connection');
      return;
    }

    setIsControlling(true);
    try {
      // Toggle: if ON (1), turn OFF (0), if OFF, turn to Prepaid mode (2)
      const controlType = isPowerConnected ? 0 : 2;
      
      const response = await fetch(`/api/meters/${meter.meterId}/control`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: controlType }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to control meter');
      }

      toast.success(isPowerConnected ? 'Meter turned OFF' : 'Meter turned ON');
      
      // Refresh meter data immediately to get updated state
      if (onMeterUpdate) {
        setTimeout(onMeterUpdate, 500);
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to control meter');
    } finally {
      setIsControlling(false);
    }
  };

  return (
    <Card className={cn('hover:shadow-lg transition-shadow', className)}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="text-lg flex items-center gap-2">
              <Zap className="h-5 w-5 text-armogrid-red" />
              Meter ID: {meter.meterId}
            </CardTitle>
            <p className="text-sm text-muted-foreground mt-1">{meter.roomNo}</p>
          </div>
          
          {/* Network Status Badge */}
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
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Balance */}
        <div>
          <p className="text-sm text-muted-foreground">Balance</p>
          <p className="text-2xl font-bold text-armogrid-navy">
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
            ⚠️ No network connection. Recharge and control unavailable.
          </div>
        )}

        {/* Power Control Toggle */}
        <div className="pt-2 border-t">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Power Control</span>
            <button
              onClick={handleTogglePower}
              disabled={!isNetworkConnected || isControlling}
              className={cn(
                "relative w-14 h-14 rounded-2xl transition-all duration-300 shadow-lg",
                "disabled:opacity-50 disabled:cursor-not-allowed",
                "hover:scale-105 active:scale-95",
                isPowerConnected
                  ? "bg-gradient-to-br from-green-400 to-green-600 shadow-green-500/50"
                  : "bg-gradient-to-br from-gray-400 to-gray-600 shadow-gray-500/50"
              )}
            >
              {isControlling ? (
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
}
