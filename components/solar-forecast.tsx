'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Sun,
  Cloud,
  CloudRain,
  CloudLightning,
  Sunrise,
  Sunset,
  Thermometer,
  Wind,
  Droplets,
  AlertTriangle,
  RefreshCw,
  TrendingDown,
  TrendingUp,
  Zap,
  ChevronRight,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area,
  Legend,
  Cell,
} from 'recharts';
import { format } from 'date-fns';

interface ForecastDay {
  id: string;
  project_id: string;
  project_name?: string;
  forecast_date: string;
  clear_sky_ghi: number;
  cloudy_sky_ghi: number;
  solar_ratio: number;
  advisory_level: string;
  weather_summary: string | null;
  weather_icon: string | null;
  cloud_cover_pct: number;
  temp_min: number | null;
  temp_max: number | null;
  rain_mm: number;
  wind_speed: number | null;
  humidity: number | null;
  sunrise: string | null;
  sunset: string | null;
  panel_energy_clear_sky: number;
  panel_energy_cloudy_sky: number;
}

interface ForecastSummary {
  totalLocations: number;
  tomorrowAvgSolarRatio: number | null;
  tomorrowAdvisories: number;
  lowSolarDaysAhead: number;
}

interface SolarForecastProps {
  projectId?: string;
}

const ADVISORY_COLORS: Record<string, string> = {
  normal: '#10b981',
  low: '#f59e0b',
  very_low: '#f97316',
  critical: '#ef4444',
};

const ADVISORY_LABELS: Record<string, string> = {
  normal: 'Normal',
  low: 'Low Solar',
  very_low: 'Very Low',
  critical: 'Critical',
};

function getWeatherIcon(advisoryLevel: string, cloudCover: number, rainMm: number) {
  if (rainMm > 5) return <CloudRain className="w-5 h-5 text-blue-500" />;
  if (rainMm > 0) return <CloudRain className="w-5 h-5 text-blue-400" />;
  if (cloudCover > 70) return <Cloud className="w-5 h-5 text-gray-500" />;
  if (cloudCover > 40) return <Cloud className="w-5 h-5 text-gray-400" />;
  return <Sun className="w-5 h-5 text-yellow-500" />;
}

export function SolarForecastWidget({ projectId }: SolarForecastProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [summary, setSummary] = useState<ForecastSummary | null>(null);
  const [forecasts, setForecasts] = useState<ForecastDay[]>([]);
  const [selectedProject, setSelectedProject] = useState<string | null>(projectId || null);
  const [locationMap, setLocationMap] = useState<Record<string, { name: string; lat: number; lon: number }>>({});
  const [locationCount, setLocationCount] = useState<number | null>(null);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);
  const [fetchError, setFetchError] = useState<string | null>(null);

  const loadForecasts = async (refresh = false) => {
    let autoRefreshing = false;
    try {
      if (refresh) setIsRefreshing(true);
      else setIsLoading(true);

      let url = `/api/admin/solar-forecast?days=7&includeToday=true`;
      if (selectedProject) url += `&projectId=${selectedProject}`;
      if (refresh) url += `&refresh=true`;

      const response = await fetch(url);
      const data = await response.json();

      if (data.success) {
        setFetchError(null);
        setSummary(data.summary);
        const newForecasts = data.forecasts || [];
        setForecasts(newForecasts);
        setLocationMap(data.locationMap || {});
        if (data.locationCount !== undefined) setLocationCount(data.locationCount);
        if (data.lastUpdated) setLastUpdated(data.lastUpdated);
        if (refresh && newForecasts.length > 0) toast.success('Solar forecast refreshed');

        // Auto-refresh conditions (only on initial non-refresh load):
        // 1. DB returned no forecasts at all
        // 2. Fewer than 2 future days remain (data about to expire)
        if (!refresh) {
          const todayStr = new Date().toISOString().split('T')[0];
          const futureDaysCount = newForecasts.filter((f: ForecastDay) => f.forecast_date >= todayStr).length;
          if (newForecasts.length === 0 || futureDaysCount < 2) {
            autoRefreshing = true;
            setIsLoading(false);
            // Keep existing (stale) data visible while refreshing in background
            loadForecasts(true);
            return;
          }
        }
      } else {
        const errMsg = data.error || 'Failed to load solar forecast';
        setFetchError(errMsg);
        toast.error(errMsg);
      }
    } catch (error) {
      console.error('Solar forecast error:', error);
      toast.error('Failed to load solar forecast');
    } finally {
      if (!autoRefreshing) {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    }
  };

  useEffect(() => {
    loadForecasts();
  }, [selectedProject]);

  // Show full-page spinner during initial load or auto-refresh when there is no data to show
  if (isLoading || (isRefreshing && forecasts.length === 0)) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center h-48">
          <div className="text-center">
            <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-yellow-500" />
            <p className="text-sm text-muted-foreground">
              {isRefreshing ? 'Fetching fresh forecast from OpenWeatherMap...' : 'Loading solar forecast...'}
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (forecasts.length === 0) {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2">
              <Sun className="w-5 h-5 text-yellow-500" />
              Solar Forecast
            </CardTitle>
            <Button
              variant="outline"
              size="sm"
              onClick={() => loadForecasts(true)}
              disabled={isRefreshing}
            >
              {isRefreshing ? (
                <RefreshCw className="w-4 h-4 mr-1 animate-spin" />
              ) : (
                <RefreshCw className="w-4 h-4 mr-1" />
              )}
              {isRefreshing ? 'Fetching...' : 'Fetch Forecast'}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {fetchError ? (
            <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-sm text-destructive">
              <p className="font-semibold mb-1">Forecast fetch failed</p>
              <p>{fetchError}</p>
            </div>
          ) : (
            <div className="text-center py-6 text-muted-foreground">
              <Sun className="w-10 h-10 mx-auto mb-2 opacity-40" />
              <p>No solar forecast data available</p>
              {locationCount === 0 ? (
                <p className="text-xs mt-1">
                  No solar project locations configured. Add a location with GPS coordinates in the Solar Locations settings to enable forecasts.
                </p>
              ) : (
                <p className="text-xs mt-1">
                  Click &quot;Fetch Forecast&quot; to pull the latest 5-day weather forecast from OpenWeatherMap.
                </p>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    );
  }

  // Prepare chart data
  const chartData = forecasts.map((f) => ({
    date: f.forecast_date,
    label: format(new Date(f.forecast_date + 'T12:00:00'), 'EEE d'),
    clearSky: parseFloat(f.clear_sky_ghi as any),
    cloudySky: parseFloat(f.cloudy_sky_ghi as any),
    solarRatio: Math.round(parseFloat(f.solar_ratio as any) * 100),
    advisoryLevel: f.advisory_level,
    cloudCover: f.cloud_cover_pct,
    rainMm: parseFloat(f.rain_mm as any) || 0,
    estKwh: parseFloat(f.panel_energy_cloudy_sky as any) || 0,
    estKwhClearSky: parseFloat(f.panel_energy_clear_sky as any) || 0,
  }));

  // Get tomorrow's forecast for highlight
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowStr = tomorrow.toISOString().split('T')[0];
  const tomorrowForecast = forecasts.find((f) => f.forecast_date === tomorrowStr);

  // Get today's forecast
  const todayStr = new Date().toISOString().split('T')[0];
  const todayForecast = forecasts.find((f) => f.forecast_date === todayStr);

  return (
    <div className="space-y-6">
      {/* Refresh / last-updated status bar */}
      {(isRefreshing || lastUpdated) && (
        <div className="flex items-center justify-end gap-2 text-xs text-muted-foreground">
          {isRefreshing ? (
            <span className="flex items-center gap-1">
              <RefreshCw className="w-3 h-3 animate-spin" />
              Refreshing forecast in background…
            </span>
          ) : lastUpdated ? (
            <span>Last updated: {format(new Date(lastUpdated), 'MMM d, h:mm a')}</span>
          ) : null}
        </div>
      )}
      {/* Summary Cards Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Tomorrow's Solar */}
        <Card className={`border-l-4 ${
          tomorrowForecast?.advisory_level === 'critical' ? 'border-l-red-500 bg-red-500/5' :
          tomorrowForecast?.advisory_level === 'very_low' ? 'border-l-orange-500 bg-orange-500/5' :
          tomorrowForecast?.advisory_level === 'low' ? 'border-l-yellow-500 bg-yellow-500/5' :
          'border-l-emerald-500 bg-emerald-500/5'
        }`}>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-medium text-muted-foreground">Tomorrow&apos;s Solar</p>
              {tomorrowForecast && getWeatherIcon(
                tomorrowForecast.advisory_level,
                tomorrowForecast.cloud_cover_pct,
                parseFloat(tomorrowForecast.rain_mm as any) || 0
              )}
            </div>
            {tomorrowForecast ? (
              <>
                <p className="text-2xl font-bold">
                  {Math.round(parseFloat(tomorrowForecast.solar_ratio as any) * 100)}%
                </p>
                <Badge
                  variant={tomorrowForecast.advisory_level === 'normal' ? 'default' : 'destructive'}
                  className="mt-1"
                >
                  {ADVISORY_LABELS[tomorrowForecast.advisory_level] || 'Unknown'}
                </Badge>
                {tomorrowForecast.weather_summary && (
                  <p className="text-xs text-muted-foreground mt-2">{tomorrowForecast.weather_summary}</p>
                )}
              </>
            ) : (
              <p className="text-sm text-muted-foreground">No data</p>
            )}
          </CardContent>
        </Card>

        {/* Low Solar Days Ahead */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-medium text-muted-foreground">Low Solar Days (7d)</p>
              {(summary?.lowSolarDaysAhead || 0) > 0 ? (
                <AlertTriangle className="w-5 h-5 text-yellow-500" />
              ) : (
                <Sun className="w-5 h-5 text-emerald-500" />
              )}
            </div>
            <p className="text-2xl font-bold">
              {summary?.lowSolarDaysAhead || 0}
              <span className="text-sm font-normal text-muted-foreground ml-1">
                / {chartData.length} days
              </span>
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              {(summary?.lowSolarDaysAhead || 0) === 0
                ? 'All clear — good solar expected'
                : 'Advisory notifications will be sent'}
            </p>
          </CardContent>
        </Card>

        {/* Today's Est. Generation */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-medium text-muted-foreground">Today&apos;s Est. Generation</p>
              <Zap className="w-5 h-5 text-blue-500" />
            </div>
            {todayForecast ? (
              <>
                <p className="text-2xl font-bold">
                  {(parseFloat(todayForecast.panel_energy_cloudy_sky as any) || 0).toFixed(2)}
                  <span className="text-sm font-normal text-muted-foreground ml-1">kWh</span>
                </p>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-xs text-muted-foreground">
                    Max: {(parseFloat(todayForecast.panel_energy_clear_sky as any) || 0).toFixed(2)} kWh
                  </span>
                  {todayForecast.sunrise && todayForecast.sunset && (
                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                      <Sunrise className="w-3 h-3" />
                      {todayForecast.sunrise.split('T')[1]?.substring(0, 5) || todayForecast.sunrise}
                      <Sunset className="w-3 h-3 ml-1" />
                      {todayForecast.sunset.split('T')[1]?.substring(0, 5) || todayForecast.sunset}
                    </span>
                  )}
                </div>
              </>
            ) : (
              <p className="text-sm text-muted-foreground">No data for today</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Solar Ratio Forecast Chart */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg flex items-center gap-2">
                <Sun className="w-5 h-5 text-yellow-500" />
                Solar Forecast — Next 7 Days
              </CardTitle>
              <CardDescription>
                Expected solar generation as percentage of clear-sky potential
              </CardDescription>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => loadForecasts(true)}
              disabled={isRefreshing}
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={chartData} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
              <XAxis dataKey="label" tick={{ fontSize: 12 }} />
              <YAxis
                tick={{ fontSize: 12 }}
                tickFormatter={(v) => `${v}%`}
                domain={[0, 100]}
              />
              <Tooltip
                formatter={(value: number, name: string) => {
                  if (name === 'solarRatio') return [`${value}%`, 'Solar Ratio'];
                  return [value, name];
                }}
                labelFormatter={(label) => `${label}`}
                content={({ active, payload, label }) => {
                  if (!active || !payload || payload.length === 0) return null;
                  const data = payload[0].payload;
                  return (
                    <div className="bg-background border rounded-lg shadow-lg p-3 text-sm">
                      <p className="font-medium">{label}</p>
                      <p className="text-lg font-bold" style={{ color: ADVISORY_COLORS[data.advisoryLevel] }}>
                        {data.solarRatio}% Solar
                      </p>
                      <p className="text-muted-foreground">
                        Cloud: {data.cloudCover}% | Rain: {data.rainMm}mm
                      </p>
                      <Badge
                        variant={data.advisoryLevel === 'normal' ? 'default' : 'destructive'}
                        className="mt-1"
                      >
                        {ADVISORY_LABELS[data.advisoryLevel] || data.advisoryLevel}
                      </Badge>
                    </div>
                  );
                }}
              />
              <Bar dataKey="solarRatio" radius={[4, 4, 0, 0]}>
                {chartData.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={ADVISORY_COLORS[entry.advisoryLevel] || '#10b981'}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Estimated Daily kWh Chart */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-blue-500" />
            Estimated Daily Generation (kWh)
          </CardTitle>
          <CardDescription>
            Predicted vs maximum possible panel output based on cloud cover forecast
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={250}>
            <AreaChart data={chartData} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
              <defs>
                <linearGradient id="colorClearSky" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="colorEstKwh" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
              <XAxis dataKey="label" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} tickFormatter={(v) => `${v}`} />
              <Tooltip
                formatter={(value: number, name: string) => [
                  `${value.toFixed(2)} kWh`,
                  name === 'estKwhClearSky' ? 'Max (Clear Sky)' : 'Estimated Output',
                ]}
              />
              <Legend
                formatter={(value) =>
                  value === 'estKwhClearSky' ? 'Max (Clear Sky)' : 'Estimated Output'
                }
              />
              <Area
                type="monotone"
                dataKey="estKwhClearSky"
                stroke="#f59e0b"
                fillOpacity={1}
                fill="url(#colorClearSky)"
              />
              <Area
                type="monotone"
                dataKey="estKwh"
                stroke="#3b82f6"
                fillOpacity={1}
                fill="url(#colorEstKwh)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Daily Details Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Cloud className="w-5 h-5 text-gray-500" />
            Daily Forecast Details
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ScrollArea className="w-full">
            <div className="min-w-[600px]">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2 px-3 font-medium">Date</th>
                    <th className="text-center py-2 px-3 font-medium">Solar %</th>
                    <th className="text-center py-2 px-3 font-medium">Est. kWh</th>
                    <th className="text-center py-2 px-3 font-medium">Level</th>
                    <th className="text-center py-2 px-3 font-medium">Cloud</th>
                    <th className="text-center py-2 px-3 font-medium">Rain</th>
                    <th className="text-center py-2 px-3 font-medium">Temp</th>
                    <th className="text-left py-2 px-3 font-medium">Weather</th>
                  </tr>
                </thead>
                <tbody>
                  {forecasts.map((f) => {
                    const solarPct = Math.round(parseFloat(f.solar_ratio as any) * 100);
                    const isToday = f.forecast_date === todayStr;
                    const isTomorrow = f.forecast_date === tomorrowStr;

                    return (
                      <tr
                        key={f.id || f.forecast_date}
                        className={`border-b hover:bg-muted/50 ${isToday ? 'bg-blue-500/5' : isTomorrow ? 'bg-yellow-500/5' : ''}`}
                      >
                        <td className="py-2 px-3">
                          <div className="flex items-center gap-2">
                            {getWeatherIcon(
                              f.advisory_level,
                              f.cloud_cover_pct,
                              parseFloat(f.rain_mm as any) || 0
                            )}
                            <div>
                              <p className="font-medium">
                                {format(new Date(f.forecast_date + 'T12:00:00'), 'EEE, MMM d')}
                              </p>
                              {isToday && <Badge variant="outline" className="text-xs">Today</Badge>}
                              {isTomorrow && <Badge variant="outline" className="text-xs">Tomorrow</Badge>}
                            </div>
                          </div>
                        </td>
                        <td className="py-2 px-3 text-center">
                          <span
                            className="font-bold text-lg"
                            style={{ color: ADVISORY_COLORS[f.advisory_level] }}
                          >
                            {solarPct}%
                          </span>
                        </td>
                        <td className="py-2 px-3 text-center">
                          <div className="flex items-center justify-center gap-1">
                            <Zap className="w-3 h-3 text-blue-400" />
                            <span className="font-medium">
                              {(parseFloat(f.panel_energy_cloudy_sky as any) || 0).toFixed(2)}
                            </span>
                          </div>
                        </td>
                        <td className="py-2 px-3 text-center">
                          <Badge
                            variant={f.advisory_level === 'normal' ? 'default' : 'destructive'}
                            className="text-xs"
                          >
                            {ADVISORY_LABELS[f.advisory_level] || f.advisory_level}
                          </Badge>
                        </td>
                        <td className="py-2 px-3 text-center">
                          <div className="flex items-center justify-center gap-1">
                            <Cloud className="w-3 h-3 text-gray-400" />
                            <span>{f.cloud_cover_pct}%</span>
                          </div>
                        </td>
                        <td className="py-2 px-3 text-center">
                          {parseFloat(f.rain_mm as any) > 0 ? (
                            <div className="flex items-center justify-center gap-1">
                              <Droplets className="w-3 h-3 text-blue-400" />
                              <span>{parseFloat(f.rain_mm as any).toFixed(1)}mm</span>
                            </div>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </td>
                        <td className="py-2 px-3 text-center">
                          {f.temp_min !== null && f.temp_max !== null ? (
                            <div className="flex items-center justify-center gap-1">
                              <Thermometer className="w-3 h-3 text-red-400" />
                              <span>
                                {parseFloat(f.temp_min as any).toFixed(0)}°/{parseFloat(f.temp_max as any).toFixed(0)}°
                              </span>
                            </div>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </td>
                        <td className="py-2 px-3 text-left">
                          <span className="text-xs text-muted-foreground truncate max-w-[200px] block">
                            {f.weather_summary || '—'}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}
