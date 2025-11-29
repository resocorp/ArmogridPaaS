'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts';
import { formatEnergy } from '@/lib/utils';

export default function AnalyticsPage() {
  const [meters, setMeters] = useState<any[]>([]);
  const [selectedMeter, setSelectedMeter] = useState<string>('');
  const [energyData, setEnergyData] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [period, setPeriod] = useState<'day' | 'month'>('day');

  useEffect(() => {
    fetchMeters();
  }, []);

  useEffect(() => {
    if (selectedMeter) {
      fetchEnergyData();
    }
  }, [selectedMeter, period]);

  const fetchMeters = async () => {
    try {
      const response = await fetch('/api/meters');
      const data = await response.json();
      if (data.success && data.data.length > 0) {
        setMeters(data.data);
        setSelectedMeter(data.data[0].meterId);
      }
    } catch (error) {
      toast.error('Failed to fetch meters');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchEnergyData = async () => {
    try {
      const response = await fetch(`/api/meters/${selectedMeter}/energy?period=${period}&days=30`);
      const data = await response.json();
      if (data.success) {
        setEnergyData(data.data);
      }
    } catch (error) {
      toast.error('Failed to fetch energy data');
    }
  };

  const totalEnergy = energyData.reduce((sum, item) => sum + (item.energy || 0), 0);
  const avgEnergy = energyData.length > 0 ? totalEnergy / energyData.length : 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Analytics</h1>
        <p className="text-muted-foreground">Track your energy consumption</p>
      </div>

      {isLoading ? (
        <div className="text-center py-12">
          <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      ) : meters.length === 0 ? (
        <Card>
          <CardContent className="text-center py-12">
            <p className="text-muted-foreground">No meters available for analytics</p>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Filters */}
          <Card>
            <CardContent className="pt-6">
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Select Meter</Label>
                  <select
                    className="w-full h-10 rounded-md border border-input bg-background px-3 py-2"
                    value={selectedMeter}
                    onChange={(e) => setSelectedMeter(e.target.value)}
                  >
                    {meters.map((meter) => (
                      <option key={meter.meterId} value={meter.meterId}>
                        Meter {meter.meterId} - {meter.roomNo || 'N/A'}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-2">
                  <Label>Period</Label>
                  <select
                    className="w-full h-10 rounded-md border border-input bg-background px-3 py-2"
                    value={period}
                    onChange={(e) => setPeriod(e.target.value as 'day' | 'month')}
                  >
                    <option value="day">Daily</option>
                    <option value="month">Monthly</option>
                  </select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Stats */}
          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Total Consumption</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatEnergy(totalEnergy)}</div>
                <p className="text-xs text-muted-foreground">Last 30 days</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Average</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatEnergy(avgEnergy)}</div>
                <p className="text-xs text-muted-foreground">Per {period}</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Data Points</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{energyData.length}</div>
                <p className="text-xs text-muted-foreground">Records</p>
              </CardContent>
            </Card>
          </div>

          {/* Charts */}
          <Card>
            <CardHeader>
              <CardTitle>Energy Consumption Trend</CardTitle>
            </CardHeader>
            <CardContent>
              {energyData.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  No data available for the selected period
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={energyData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip />
                    <Line type="monotone" dataKey="energy" stroke="#FF3D00" strokeWidth={2} />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Consumption by {period === 'day' ? 'Day' : 'Month'}</CardTitle>
            </CardHeader>
            <CardContent>
              {energyData.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  No data available
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={energyData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="energy" fill="#001F54" />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
