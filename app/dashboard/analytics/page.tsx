'use client';

import { useEffect, useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, ReferenceLine, Cell } from 'recharts';
import { formatEnergy, formatNaira } from '@/lib/utils';
import { format, subDays, startOfMonth, endOfMonth, subMonths, parseISO, startOfWeek, endOfWeek, subWeeks } from 'date-fns';
import { Calendar, Filter, Zap, TrendingUp, TrendingDown, AlertTriangle, BarChart3 } from 'lucide-react';
import type { EnergyDataRecord } from '@/types/iot';

type DatePreset = '7days' | '30days' | '90days' | 'thisMonth' | 'lastMonth' | 'custom';

interface ProcessedEnergyData {
  date: string;
  fullDate: string;
  energy: number;
  cost: number;
  isPeak: boolean;
}

interface MeterInfo {
  meterId: string;
  roomNo: string;
  priceFlat?: number;
  balance?: string;
}

export default function AnalyticsPage() {
  const [meters, setMeters] = useState<MeterInfo[]>([]);
  const [selectedMeter, setSelectedMeter] = useState<string>('');
  const [meterDetails, setMeterDetails] = useState<any>(null);
  const [rawEnergyData, setRawEnergyData] = useState<EnergyDataRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingEnergy, setIsLoadingEnergy] = useState(false);
  
  // Date filters
  const [datePreset, setDatePreset] = useState<DatePreset>('30days');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');

  // Calculate date range based on preset
  const getDateRange = () => {
    const today = new Date();
    switch (datePreset) {
      case '7days':
        return { start: format(subDays(today, 7), 'yyyy-MM-dd'), end: format(today, 'yyyy-MM-dd') };
      case '30days':
        return { start: format(subDays(today, 30), 'yyyy-MM-dd'), end: format(today, 'yyyy-MM-dd') };
      case '90days':
        return { start: format(subDays(today, 90), 'yyyy-MM-dd'), end: format(today, 'yyyy-MM-dd') };
      case 'thisMonth':
        return { start: format(startOfMonth(today), 'yyyy-MM-dd'), end: format(endOfMonth(today), 'yyyy-MM-dd') };
      case 'lastMonth':
        const lastMonth = subMonths(today, 1);
        return { start: format(startOfMonth(lastMonth), 'yyyy-MM-dd'), end: format(endOfMonth(lastMonth), 'yyyy-MM-dd') };
      case 'custom':
        return { start: customStartDate, end: customEndDate };
      default:
        return { start: format(subDays(today, 30), 'yyyy-MM-dd'), end: format(today, 'yyyy-MM-dd') };
    }
  };

  useEffect(() => {
    fetchMeters();
  }, []);

  useEffect(() => {
    if (selectedMeter) {
      fetchMeterDetails();
    }
  }, [selectedMeter]);

  useEffect(() => {
    if (selectedMeter && (datePreset !== 'custom' || (customStartDate && customEndDate))) {
      fetchEnergyData();
    }
  }, [selectedMeter, datePreset]);

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

  const fetchMeterDetails = async () => {
    try {
      const meter = meters.find(m => m.meterId === selectedMeter);
      if (meter?.roomNo) {
        const response = await fetch('/api/meters/info', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ roomNo: meter.roomNo }),
        });
        const data = await response.json();
        if (data.success) {
          setMeterDetails(data.data);
        }
      }
    } catch (error) {
      console.error('Failed to fetch meter details:', error);
    }
  };

  const fetchEnergyData = async () => {
    setIsLoadingEnergy(true);
    try {
      const { start, end } = getDateRange();
      if (!start || !end) {
        toast.error('Please select both start and end dates');
        setIsLoadingEnergy(false);
        return;
      }

      const response = await fetch(
        `/api/meters/${selectedMeter}/energy?period=day&startDate=${start}&endDate=${end}`
      );
      const data = await response.json();
      if (data.success) {
        setRawEnergyData(data.data || []);
      } else {
        toast.error(data.error || 'Failed to fetch energy data');
      }
    } catch (error) {
      toast.error('Failed to fetch energy data');
    } finally {
      setIsLoadingEnergy(false);
    }
  };

  // Get price per kWh from meter details
  const pricePerKwh = meterDetails?.priceFlat || 250; // Default to 250 if not available

  // Process energy data for charts
  const processedData = useMemo((): ProcessedEnergyData[] => {
    if (!rawEnergyData.length) return [];

    // Calculate average to determine peak threshold (1.5x average)
    const energyValues = rawEnergyData.map(d => parseFloat(d.powerUse || '0'));
    const avgEnergy = energyValues.reduce((a, b) => a + b, 0) / energyValues.length;
    const peakThreshold = avgEnergy * 1.5;

    return rawEnergyData.map(record => {
      const energy = parseFloat(record.powerUse || '0');
      const dateObj = parseISO(record.createTime.split(' ')[0]);
      return {
        date: format(dateObj, 'MMM dd'),
        fullDate: record.createTime.split(' ')[0],
        energy,
        cost: energy * pricePerKwh,
        isPeak: energy > peakThreshold && energy > 0,
      };
    });
  }, [rawEnergyData, pricePerKwh]);

  // Calculate statistics
  const stats = useMemo(() => {
    if (!processedData.length) {
      return { total: 0, average: 0, peak: 0, peakDate: '', cost: 0, peakCount: 0 };
    }

    const total = processedData.reduce((sum, d) => sum + d.energy, 0);
    const average = total / processedData.length;
    const peakRecord = processedData.reduce((max, d) => d.energy > max.energy ? d : max, processedData[0]);
    const peakCount = processedData.filter(d => d.isPeak).length;
    const cost = total * pricePerKwh;

    return {
      total,
      average,
      peak: peakRecord.energy,
      peakDate: peakRecord.fullDate,
      cost,
      peakCount,
    };
  }, [processedData, pricePerKwh]);

  // Week-over-week comparison
  const weekComparison = useMemo(() => {
    if (processedData.length < 14) return null;

    const today = new Date();
    const thisWeekStart = startOfWeek(today);
    const lastWeekStart = startOfWeek(subWeeks(today, 1));
    const lastWeekEnd = endOfWeek(subWeeks(today, 1));

    const thisWeekData = processedData.filter(d => {
      const date = parseISO(d.fullDate);
      return date >= thisWeekStart && date <= today;
    });

    const lastWeekData = processedData.filter(d => {
      const date = parseISO(d.fullDate);
      return date >= lastWeekStart && date <= lastWeekEnd;
    });

    const thisWeekTotal = thisWeekData.reduce((sum, d) => sum + d.energy, 0);
    const lastWeekTotal = lastWeekData.reduce((sum, d) => sum + d.energy, 0);

    if (lastWeekTotal === 0) return null;

    const change = ((thisWeekTotal - lastWeekTotal) / lastWeekTotal) * 100;

    return {
      thisWeek: thisWeekTotal,
      lastWeek: lastWeekTotal,
      change,
      isIncrease: change > 0,
    };
  }, [processedData]);

  // Get preset label
  const getPresetLabel = () => {
    switch (datePreset) {
      case '7days': return 'Last 7 days';
      case '30days': return 'Last 30 days';
      case '90days': return 'Last 90 days';
      case 'thisMonth': return 'This month';
      case 'lastMonth': return 'Last month';
      case 'custom': return 'Custom range';
      default: return '';
    }
  };

  // Custom tooltip for charts
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-background border rounded-lg shadow-lg p-3">
          <p className="font-medium">{data.fullDate}</p>
          <p className="text-sm">
            <span className="text-muted-foreground">Energy: </span>
            <span className="font-semibold">{data.energy.toFixed(2)} kWh</span>
          </p>
          <p className="text-sm">
            <span className="text-muted-foreground">Cost: </span>
            <span className="font-semibold text-green-600">{formatNaira(data.cost * 100)}</span>
          </p>
          {data.isPeak && (
            <Badge variant="destructive" className="mt-1">Peak Usage</Badge>
          )}
        </div>
      );
    }
    return null;
  };

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
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-medium flex items-center gap-2">
                <Filter className="w-4 h-4" />
                Filters
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                {/* Meter Selector */}
                <div className="space-y-2">
                  <Label>Select Meter</Label>
                  <Select
                    value={selectedMeter}
                    onChange={(e) => setSelectedMeter(e.target.value)}
                  >
                    {meters.map((meter) => (
                      <option key={meter.meterId} value={meter.meterId}>
                        {meter.roomNo || `Meter ${meter.meterId}`}
                      </option>
                    ))}
                  </Select>
                </div>

                {/* Date Preset */}
                <div className="space-y-2">
                  <Label>Date Range</Label>
                  <Select
                    value={datePreset}
                    onChange={(e) => setDatePreset(e.target.value as DatePreset)}
                  >
                    <option value="7days">Last 7 days</option>
                    <option value="30days">Last 30 days</option>
                    <option value="90days">Last 90 days</option>
                    <option value="thisMonth">This month</option>
                    <option value="lastMonth">Last month</option>
                    <option value="custom">Custom range</option>
                  </Select>
                </div>

                {/* Custom Date Range */}
                {datePreset === 'custom' && (
                  <>
                    <div className="space-y-2">
                      <Label>Start Date</Label>
                      <Input
                        type="date"
                        value={customStartDate}
                        onChange={(e) => setCustomStartDate(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>End Date</Label>
                      <div className="flex gap-2">
                        <Input
                          type="date"
                          value={customEndDate}
                          onChange={(e) => setCustomEndDate(e.target.value)}
                        />
                        <Button onClick={fetchEnergyData} disabled={!customStartDate || !customEndDate}>
                          <Calendar className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </>
                )}
              </div>

              {/* Price Info */}
              {meterDetails && (
                <div className="mt-4 pt-4 border-t">
                  <p className="text-sm text-muted-foreground">
                    Rate: <span className="font-medium text-foreground">₦{pricePerKwh}/kWh</span>
                    {meterDetails.balance && (
                      <span className="ml-4">
                        Balance: <span className="font-medium text-green-600">₦{parseFloat(meterDetails.balance).toLocaleString()}</span>
                      </span>
                    )}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Stats */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Zap className="w-4 h-4 text-yellow-500" />
                  Total Consumption
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.total.toFixed(2)} kWh</div>
                <p className="text-xs text-muted-foreground">{getPresetLabel()}</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Average Daily</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.average.toFixed(2)} kWh</div>
                <p className="text-xs text-muted-foreground">Per day</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-orange-500" />
                  Peak Usage
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-orange-600">{stats.peak.toFixed(2)} kWh</div>
                <p className="text-xs text-muted-foreground">{stats.peakDate || 'N/A'}</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-green-600">Estimated Cost</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">{formatNaira(stats.cost * 100)}</div>
                <p className="text-xs text-muted-foreground">@ ₦{pricePerKwh}/kWh</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Data Points</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{processedData.length}</div>
                <p className="text-xs text-muted-foreground">
                  {stats.peakCount > 0 && (
                    <span className="text-orange-500">{stats.peakCount} peak days</span>
                  )}
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Week-over-Week Comparison */}
          {weekComparison && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-medium flex items-center gap-2">
                  <BarChart3 className="w-4 h-4" />
                  Week-over-Week Comparison
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-8">
                  <div>
                    <p className="text-sm text-muted-foreground">This Week</p>
                    <p className="text-xl font-bold">{weekComparison.thisWeek.toFixed(2)} kWh</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Last Week</p>
                    <p className="text-xl font-bold">{weekComparison.lastWeek.toFixed(2)} kWh</p>
                  </div>
                  <div className={`flex items-center gap-2 px-4 py-2 rounded-lg ${
                    weekComparison.isIncrease ? 'bg-red-50 text-red-600' : 'bg-green-50 text-green-600'
                  }`}>
                    {weekComparison.isIncrease ? (
                      <TrendingUp className="w-5 h-5" />
                    ) : (
                      <TrendingDown className="w-5 h-5" />
                    )}
                    <span className="font-semibold">
                      {Math.abs(weekComparison.change).toFixed(1)}%
                    </span>
                    <span className="text-sm">
                      {weekComparison.isIncrease ? 'increase' : 'decrease'}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Charts */}
          <Card>
            <CardHeader>
              <CardTitle>Energy Consumption Trend</CardTitle>
            </CardHeader>
            <CardContent>
              {isLoadingEnergy ? (
                <div className="text-center py-12">
                  <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                  <p className="text-muted-foreground">Loading energy data...</p>
                </div>
              ) : processedData.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  No data available for the selected period
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={processedData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis 
                      dataKey="date" 
                      tick={{ fontSize: 12 }}
                      interval="preserveStartEnd"
                    />
                    <YAxis 
                      tick={{ fontSize: 12 }}
                      label={{ value: 'kWh', angle: -90, position: 'insideLeft' }}
                    />
                    <Tooltip content={<CustomTooltip />} />
                    <ReferenceLine 
                      y={stats.average} 
                      stroke="#888" 
                      strokeDasharray="5 5" 
                      label={{ value: 'Avg', position: 'right', fontSize: 10 }}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="energy" 
                      stroke="#FF3D00" 
                      strokeWidth={2}
                      dot={(props: any) => {
                        const { cx, cy, payload } = props;
                        if (payload.isPeak) {
                          return (
                            <circle 
                              cx={cx} 
                              cy={cy} 
                              r={6} 
                              fill="#FF3D00" 
                              stroke="#fff" 
                              strokeWidth={2}
                            />
                          );
                        }
                        return <circle cx={cx} cy={cy} r={3} fill="#FF3D00" />;
                      }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Daily Consumption</CardTitle>
              <p className="text-sm text-muted-foreground">
                <span className="inline-block w-3 h-3 bg-orange-500 rounded mr-1"></span>
                Orange bars indicate peak usage days (above 1.5x average)
              </p>
            </CardHeader>
            <CardContent>
              {isLoadingEnergy ? (
                <div className="text-center py-12">
                  <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                </div>
              ) : processedData.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  No data available
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={processedData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis 
                      dataKey="date" 
                      tick={{ fontSize: 12 }}
                      interval="preserveStartEnd"
                    />
                    <YAxis 
                      tick={{ fontSize: 12 }}
                      label={{ value: 'kWh', angle: -90, position: 'insideLeft' }}
                    />
                    <Tooltip content={<CustomTooltip />} />
                    <ReferenceLine 
                      y={stats.average * 1.5} 
                      stroke="#f97316" 
                      strokeDasharray="5 5" 
                      label={{ value: 'Peak threshold', position: 'right', fontSize: 10 }}
                    />
                    <Bar dataKey="energy">
                      {processedData.map((entry, index) => (
                        <Cell 
                          key={`cell-${index}`} 
                          fill={entry.isPeak ? '#f97316' : '#001F54'} 
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>

          {/* Top Consumption Days */}
          {processedData.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Top 5 Consumption Days</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {[...processedData]
                    .sort((a, b) => b.energy - a.energy)
                    .slice(0, 5)
                    .map((day, index) => (
                      <div key={day.fullDate} className="flex items-center justify-between p-3 bg-accent/50 rounded-lg">
                        <div className="flex items-center gap-3">
                          <span className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                            index === 0 ? 'bg-yellow-500 text-white' : 
                            index === 1 ? 'bg-gray-400 text-white' : 
                            index === 2 ? 'bg-orange-600 text-white' : 
                            'bg-muted text-muted-foreground'
                          }`}>
                            {index + 1}
                          </span>
                          <div>
                            <p className="font-medium">{day.fullDate}</p>
                            <p className="text-sm text-muted-foreground">{day.date}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-bold">{day.energy.toFixed(2)} kWh</p>
                          <p className="text-sm text-green-600">{formatNaira(day.cost * 100)}</p>
                        </div>
                        {day.isPeak && (
                          <Badge variant="destructive">Peak</Badge>
                        )}
                      </div>
                    ))}
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
