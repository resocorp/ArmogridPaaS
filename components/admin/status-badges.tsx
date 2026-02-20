'use client';

import { Badge } from '@/components/ui/badge';
import { Power, PowerOff, WifiOff } from 'lucide-react';

export function getStatusBadge(status: string) {
  switch (status) {
    case 'success':
      return <Badge className="bg-green-500/10 text-green-500 border-green-500/20">Success</Badge>;
    case 'pending':
      return <Badge className="bg-yellow-500/10 text-yellow-500 border-yellow-500/20">Pending</Badge>;
    case 'failed':
      return <Badge className="bg-red-500/10 text-red-500 border-red-500/20">Failed</Badge>;
    default:
      return <Badge variant="secondary">{status}</Badge>;
  }
}

export function getMeterStatusBadge(meter: {
  switchSta?: number | string;
  unConnect?: number;
  controlMode?: string;
}) {
  const isOnline = meter.unConnect === 0;
  const isPowered = meter.switchSta === 1 || meter.switchSta === '1';
  const isForced = meter.controlMode === '1' || meter.controlMode === '2';

  if (!isOnline) {
    return (
      <Badge className="bg-gray-500/10 text-gray-500 border-gray-500/20">
        <WifiOff className="w-3 h-3 mr-1" />Offline
      </Badge>
    );
  }

  if (isForced) {
    return isPowered ? (
      <Badge className="bg-orange-500/10 text-orange-500 border-orange-500/20">
        <Power className="w-3 h-3 mr-1" />Forced ON
      </Badge>
    ) : (
      <Badge className="bg-purple-500/10 text-purple-500 border-purple-500/20">
        <PowerOff className="w-3 h-3 mr-1" />Forced OFF
      </Badge>
    );
  }

  return isPowered ? (
    <Badge className="bg-green-500/10 text-green-500 border-green-500/20">
      <Power className="w-3 h-3 mr-1" />On
    </Badge>
  ) : (
    <Badge className="bg-red-500/10 text-red-500 border-red-500/20">
      <PowerOff className="w-3 h-3 mr-1" />Off
    </Badge>
  );
}
