'use client';

import { Badge } from '@/components/ui/badge';
import { Zap, Wifi, WifiOff, Power, PowerOff } from 'lucide-react';
import { formatNaira, cn } from '@/lib/utils';
import type { UserMeter } from '@/types/iot';
import { useMeterControl } from '@/lib/hooks/use-meter-control';

interface MeterListItemProps {
  meter: UserMeter;
  className?: string;
  onMeterUpdate?: () => void;
}

export function MeterListItem({ meter, className, onMeterUpdate }: MeterListItemProps) {
  const balance = parseFloat(meter.balance) || 0;
  const isPowerConnected = meter.switchSta === 1;
  const isNetworkConnected = meter.unConnect === 0;
  const { isControlling, handleTogglePower } = useMeterControl(
    meter.meterId,
    isPowerConnected,
    isNetworkConnected,
    onMeterUpdate
  );

  return (
    <div
      className={cn(
        'flex items-center justify-between p-4 border rounded-lg hover:bg-accent/50 transition-colors',
        className
      )}
    >
      <div className="flex items-center gap-4 flex-1">
        {/* Meter Icon & Info */}
        <div className="flex items-center gap-3 min-w-[200px]">
          <div className="w-10 h-10 bg-armogrid-red/10 rounded-lg flex items-center justify-center">
            <Zap className="h-5 w-5 text-armogrid-red" />
          </div>
          <div>
            <p className="font-semibold">Meter ID: {meter.meterId}</p>
            <p className="text-sm text-muted-foreground">{meter.roomNo}</p>
          </div>
        </div>

        {/* Balance */}
        <div className="min-w-[120px]">
          <p className="text-xs text-muted-foreground">Balance</p>
          <p className="text-lg font-bold text-armogrid-navy">
            {formatNaira(balance * 100)}
          </p>
        </div>


        {/* Power Status */}
        <div className="min-w-[140px]">
          <div className="flex items-center gap-2">
            {isPowerConnected ? (
              <Power className="h-4 w-4 text-green-600" />
            ) : (
              <PowerOff className="h-4 w-4 text-red-600" />
            )}
            <Badge variant={isPowerConnected ? 'success' : 'destructive'} className="text-xs">
              {isPowerConnected ? 'Connected' : 'Disconnected'}
            </Badge>
          </div>
        </div>

        {/* Network Status */}
        <div className="min-w-[100px]">
          {isNetworkConnected ? (
            <Badge variant="success" className="flex items-center gap-1 w-fit">
              <Wifi className="h-3 w-3" />
              Online
            </Badge>
          ) : (
            <Badge variant="destructive" className="flex items-center gap-1 w-fit">
              <WifiOff className="h-3 w-3" />
              Offline
            </Badge>
          )}
        </div>

        {/* Power Control */}
        <div className="min-w-[70px] flex justify-center">
          <button
            onClick={handleTogglePower}
            disabled={!isNetworkConnected || isControlling}
            className={cn(
              "relative w-12 h-12 rounded-xl transition-all duration-300 shadow-md",
              "disabled:opacity-50 disabled:cursor-not-allowed",
              "hover:scale-105 active:scale-95",
              isPowerConnected
                ? "bg-gradient-to-br from-green-400 to-green-600 shadow-green-500/50"
                : "bg-gradient-to-br from-gray-400 to-gray-600 shadow-gray-500/50"
            )}
          >
            {isControlling ? (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-5 h-5 border-3 border-white border-t-transparent rounded-full animate-spin" />
              </div>
            ) : (
              <div className="absolute inset-0 flex items-center justify-center">
                <Power className="w-6 h-6 text-white" strokeWidth={2.5} />
              </div>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
