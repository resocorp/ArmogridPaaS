'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Gauge, Power, PowerOff, RefreshCw, Zap } from 'lucide-react';
import { formatNaira } from '@/lib/utils';
import { toast } from 'sonner';

export default function MetersPage() {
  const [meters, setMeters] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [controllingMeter, setControllingMeter] = useState<string | null>(null);

  useEffect(() => {
    fetchMeters();
  }, []);

  const fetchMeters = async () => {
    try {
      const response = await fetch('/api/meters');
      const data = await response.json();
      if (data.success) {
        setMeters(data.data);
      }
    } catch (error) {
      toast.error('Failed to fetch meters');
    } finally {
      setIsLoading(false);
    }
  };

  const controlMeter = async (meterId: string, type: 0 | 1 | 2) => {
    setControllingMeter(meterId);
    try {
      const response = await fetch(`/api/meters/${meterId}/control`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type }),
      });

      const data = await response.json();
      if (data.success) {
        toast.success('Meter control command sent successfully');
        fetchMeters();
      } else {
        throw new Error(data.error);
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to control meter');
    } finally {
      setControllingMeter(null);
    }
  };

  const getControlLabel = (type: number) => {
    switch (type) {
      case 0: return 'Turn Off';
      case 1: return 'Turn On';
      case 2: return 'Prepaid Mode';
      default: return 'Unknown';
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
          {meters.map((meter) => (
            <Card key={meter.meterId}>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <Zap className="w-5 h-5" />
                    Meter {meter.meterId}
                  </span>
                  <span className={`text-xs px-2 py-1 rounded-full ${
                    meter.status === 'online' 
                      ? 'bg-green-500/10 text-green-500' 
                      : 'bg-gray-500/10 text-gray-500'
                  }`}>
                    {meter.status || 'unknown'}
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <p className="text-sm text-muted-foreground">Room</p>
                  <p className="font-medium">{meter.roomNo || 'N/A'}</p>
                </div>

                <div>
                  <p className="text-sm text-muted-foreground">Balance</p>
                  <p className="text-2xl font-bold text-primary">
                    {formatNaira((meter.balance || 0) * 100)}
                  </p>
                </div>

                <div className="pt-2 space-y-2">
                  <p className="text-sm font-medium">Controls</p>
                  <div className="grid grid-cols-3 gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => controlMeter(meter.meterId, 0)}
                      disabled={controllingMeter === meter.meterId}
                      className="text-xs"
                    >
                      <PowerOff className="w-3 h-3 mr-1" />
                      Off
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => controlMeter(meter.meterId, 1)}
                      disabled={controllingMeter === meter.meterId}
                      className="text-xs"
                    >
                      <Power className="w-3 h-3 mr-1" />
                      On
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => controlMeter(meter.meterId, 2)}
                      disabled={controllingMeter === meter.meterId}
                      className="text-xs"
                    >
                      <Zap className="w-3 h-3 mr-1" />
                      Prepaid
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
