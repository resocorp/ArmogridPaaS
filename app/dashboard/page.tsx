'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Zap, Activity, TrendingUp, CreditCard } from 'lucide-react';
import { formatNaira } from '@/lib/utils';

export default function DashboardPage() {
  const [meters, setMeters] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

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
      console.error('Failed to fetch meters:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const totalBalance = meters.reduce((sum, meter) => sum + (meter.balance || 0), 0);
  const activeMeters = meters.filter((m) => m.status === 'online').length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground">Welcome back! Here's your overview.</p>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Meters</CardTitle>
            <Zap className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{meters.length}</div>
            <p className="text-xs text-muted-foreground">
              {activeMeters} active
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Balance</CardTitle>
            <CreditCard className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatNaira(totalBalance * 100)}</div>
            <p className="text-xs text-muted-foreground">
              Across all meters
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Meters</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activeMeters}</div>
            <p className="text-xs text-muted-foreground">
              Online and running
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg. Balance</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {meters.length > 0 ? formatNaira((totalBalance / meters.length) * 100) : '₦0.00'}
            </div>
            <p className="text-xs text-muted-foreground">
              Per meter
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Recent Meters */}
      <Card>
        <CardHeader>
          <CardTitle>Your Meters</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">Loading meters...</div>
          ) : meters.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No meters found. Contact your administrator.
            </div>
          ) : (
            <div className="space-y-3">
              {meters.map((meter) => (
                <div
                  key={meter.meterId}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent/50 transition-colors"
                >
                  <div>
                    <p className="font-medium">Meter {meter.meterId}</p>
                    <p className="text-sm text-muted-foreground">{meter.roomNo || 'N/A'}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold">{formatNaira((meter.balance || 0) * 100)}</p>
                    <p className="text-sm text-muted-foreground capitalize">{meter.status || 'unknown'}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
