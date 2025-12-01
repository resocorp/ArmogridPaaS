'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select } from '@/components/ui/select';
import { 
  TrendingUp, 
  TrendingDown,
  Zap, 
  DollarSign, 
  Activity,
  AlertTriangle,
  WifiOff,
  Power,
  RefreshCw,
  Calendar,
  BarChart3,
  Battery,
  Users,
  Building2,
  Check,
  ChevronDown,
  X
} from 'lucide-react';
import { toast } from 'sonner';
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts';
import { format, subDays, subHours, subMonths, startOfMonth, endOfMonth, startOfDay, endOfDay } from 'date-fns';

interface AnalyticsData {
  totalRevenue: number;
  totalEnergy: number;
  livePower: number;
  activeMeters: number;
  totalMeters: number;
  revenueByDay: { date: string; revenue: number }[];
  revenueByProject: { projectId: string; projectName: string; revenue: number }[];
  energyByDay: { date: string; energy: number }[];
  energyByMeter: { meterId: string; roomNo: string; energy: number; projectName: string }[];
  powerHistory: { timestamp: string; power: number; activeMeters: number }[];
  topConsumers: { roomNo: string; meterId: string; energy: number; projectName: string }[];
  topRevenue: { roomNo: string; revenue: number; projectName: string }[];
  lowBalanceMeters: { roomNo: string; balance: number; meterId: string }[];
  forcedModeMeters: { roomNo: string; controlMode: string; meterId: string }[];
  offlineMeters: { roomNo: string; meterId: string }[];
  livePowerByMeter: { roomNo: string; meterId: string; power: number; projectName: string }[];
}

const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16'];

type DateRange = 'last24h' | 'today' | 'yesterday' | 'week' | 'month' | 'lastMonth' | 'quarter' | 'year' | 'custom';

interface Project {
  projectId: string;
  projectName: string;
}

export function AdminAnalytics() {
  const [isLoading, setIsLoading] = useState(true);
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [dateRange, setDateRange] = useState<DateRange>('month');
  const [isRefreshing, setIsRefreshing] = useState(false);
  
  // Project filter state
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProjects, setSelectedProjects] = useState<Set<string>>(new Set());
  const [projectDropdownOpen, setProjectDropdownOpen] = useState(false);
  const [allProjectsSelected, setAllProjectsSelected] = useState(true);
  
  // Custom date range state
  const [customStartDate, setCustomStartDate] = useState<string>(format(startOfMonth(new Date()), 'yyyy-MM-dd'));
  const [customEndDate, setCustomEndDate] = useState<string>(format(new Date(), 'yyyy-MM-dd'));
  const [showCustomDatePicker, setShowCustomDatePicker] = useState(false);

  const getDateRange = (range: DateRange): { start: string; end: string } => {
    const now = new Date();
    let start: Date;
    let end: Date = now;
    
    switch (range) {
      case 'last24h':
        start = subHours(now, 24);
        break;
      case 'today':
        start = startOfDay(now);
        end = endOfDay(now);
        break;
      case 'yesterday':
        start = startOfDay(subDays(now, 1));
        end = endOfDay(subDays(now, 1));
        break;
      case 'week':
        start = subDays(now, 7);
        break;
      case 'month':
        start = startOfMonth(now);
        break;
      case 'lastMonth':
        const lastMonth = subMonths(now, 1);
        start = startOfMonth(lastMonth);
        end = endOfMonth(lastMonth);
        break;
      case 'quarter':
        start = subMonths(now, 3);
        break;
      case 'year':
        start = subMonths(now, 12);
        break;
      case 'custom':
        return {
          start: customStartDate,
          end: customEndDate,
        };
      default:
        start = startOfMonth(now);
    }

    return {
      start: format(start, 'yyyy-MM-dd'),
      end: format(end, 'yyyy-MM-dd'),
    };
  };

  // Handle date range change
  const handleDateRangeChange = (value: string) => {
    if (value === 'custom') {
      setShowCustomDatePicker(true);
    } else {
      setShowCustomDatePicker(false);
    }
    setDateRange(value as DateRange);
  };

  // Apply custom date range
  const applyCustomDateRange = () => {
    setShowCustomDatePicker(false);
    loadAnalytics();
  };

  // Load available projects from IoT API
  const loadProjects = async () => {
    try {
      const response = await fetch('/api/admin/projects');
      const result = await response.json();
      if (result.success && result.data) {
        setProjects(result.data);
        // Initially select all projects
        setSelectedProjects(new Set(result.data.map((p: Project) => p.projectId)));
        setAllProjectsSelected(true);
      }
    } catch (error) {
      console.error('Failed to load projects:', error);
    }
  };

  // Toggle project selection
  const toggleProject = (projectId: string) => {
    const newSelected = new Set(selectedProjects);
    if (newSelected.has(projectId)) {
      newSelected.delete(projectId);
    } else {
      newSelected.add(projectId);
    }
    setSelectedProjects(newSelected);
    setAllProjectsSelected(newSelected.size === projects.length);
  };

  // Toggle all projects
  const toggleAllProjects = () => {
    if (allProjectsSelected) {
      setSelectedProjects(new Set());
      setAllProjectsSelected(false);
    } else {
      setSelectedProjects(new Set(projects.map(p => p.projectId)));
      setAllProjectsSelected(true);
    }
  };

  const loadAnalytics = async () => {
    try {
      setIsRefreshing(true);
      const { start, end } = getDateRange(dateRange);
      
      // Build project filter param
      const projectIds = allProjectsSelected ? '' : Array.from(selectedProjects).join(',');
      const projectParam = projectIds ? `&projectIds=${projectIds}` : '';
      
      const response = await fetch(`/api/admin/analytics?startDate=${start}&endDate=${end}${projectParam}`);
      const data = await response.json();

      if (data.success) {
        setAnalytics(data.data);
      } else {
        toast.error(data.error || 'Failed to load analytics');
      }
    } catch (error) {
      console.error('Analytics error:', error);
      toast.error('Failed to load analytics');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    loadProjects();
  }, []);

  useEffect(() => {
    if (dateRange !== 'custom') {
      loadAnalytics();
    }
  }, [dateRange, selectedProjects]);

  // Reload when custom dates change (only if custom is selected)
  useEffect(() => {
    if (dateRange === 'custom') {
      loadAnalytics();
    }
  }, [customStartDate, customEndDate]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-2 text-primary" />
          <p className="text-muted-foreground">Loading analytics...</p>
        </div>
      </div>
    );
  }

  if (!analytics) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <BarChart3 className="w-12 h-12 mx-auto mb-2 opacity-50" />
        <p>No analytics data available</p>
        <p className="text-sm">Link meter accounts to see analytics</p>
      </div>
    );
  }

  const formatCurrency = (value: number) => `₦${value.toLocaleString()}`;
  const formatEnergy = (value: number) => `${value.toFixed(2)} kWh`;
  const formatPower = (value: number) => `${value.toFixed(3)} kW`;

  return (
    <div className="space-y-6">
      {/* Header with Date Range Selector */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Analytics Dashboard</h2>
          <p className="text-muted-foreground">Real-time insights across all linked meters</p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          {/* Project Filter Dropdown */}
          <div className="relative">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setProjectDropdownOpen(!projectDropdownOpen)}
              className="min-w-[180px] justify-between"
            >
              <div className="flex items-center gap-2">
                <Building2 className="w-4 h-4" />
                <span>
                  {allProjectsSelected 
                    ? 'All Projects' 
                    : selectedProjects.size === 0 
                      ? 'Select Projects'
                      : `${selectedProjects.size} Project${selectedProjects.size > 1 ? 's' : ''}`
                  }
                </span>
              </div>
              <ChevronDown className={`w-4 h-4 ml-2 transition-transform ${projectDropdownOpen ? 'rotate-180' : ''}`} />
            </Button>
            
            {projectDropdownOpen && (
              <div className="absolute top-full mt-1 right-0 w-64 bg-background border rounded-lg shadow-lg z-50">
                <div className="p-2 border-b">
                  <label className="flex items-center gap-2 p-2 hover:bg-muted rounded cursor-pointer">
                    <div className={`w-4 h-4 border rounded flex items-center justify-center ${allProjectsSelected ? 'bg-primary border-primary' : 'border-input'}`}>
                      {allProjectsSelected && <Check className="w-3 h-3 text-primary-foreground" />}
                    </div>
                    <span className="font-medium">Select All</span>
                  </label>
                  <div onClick={toggleAllProjects} className="absolute inset-0 cursor-pointer" style={{ top: 8, height: 40 }} />
                </div>
                <ScrollArea className="max-h-[200px]">
                  <div className="p-2 space-y-1">
                    {projects.map((project) => (
                      <label 
                        key={project.projectId} 
                        className="flex items-center gap-2 p-2 hover:bg-muted rounded cursor-pointer"
                        onClick={() => toggleProject(project.projectId)}
                      >
                        <div className={`w-4 h-4 border rounded flex items-center justify-center ${selectedProjects.has(project.projectId) ? 'bg-primary border-primary' : 'border-input'}`}>
                          {selectedProjects.has(project.projectId) && <Check className="w-3 h-3 text-primary-foreground" />}
                        </div>
                        <span className="text-sm truncate">{project.projectName}</span>
                      </label>
                    ))}
                  </div>
                </ScrollArea>
                <div className="p-2 border-t">
                  <Button 
                    size="sm" 
                    className="w-full" 
                    onClick={() => setProjectDropdownOpen(false)}
                  >
                    Apply Filter
                  </Button>
                </div>
              </div>
            )}
          </div>

          {/* Date Range Selector */}
          <div className="relative">
            <Select 
              value={dateRange} 
              onChange={(e) => handleDateRangeChange(e.target.value)}
              className="w-[160px]"
            >
              <option value="last24h">Last 24 Hours</option>
              <option value="today">Today</option>
              <option value="yesterday">Yesterday</option>
              <option value="week">Last 7 Days</option>
              <option value="month">This Month</option>
              <option value="lastMonth">Last Month</option>
              <option value="quarter">Last 3 Months</option>
              <option value="year">Last 12 Months</option>
              <option value="custom">Custom Range...</option>
            </Select>
            
            {/* Custom Date Picker Popup */}
            {showCustomDatePicker && (
              <div className="absolute top-full mt-1 right-0 w-72 bg-background border rounded-lg shadow-lg z-50 p-4">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="font-medium">Custom Date Range</h4>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="h-6 w-6 p-0"
                      onClick={() => setShowCustomDatePicker(false)}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                  
                  <div className="space-y-3">
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Start Date</label>
                      <input 
                        type="date" 
                        value={customStartDate}
                        onChange={(e) => setCustomStartDate(e.target.value)}
                        className="w-full mt-1 px-3 py-2 border rounded-md bg-background text-sm"
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">End Date</label>
                      <input 
                        type="date" 
                        value={customEndDate}
                        onChange={(e) => setCustomEndDate(e.target.value)}
                        max={format(new Date(), 'yyyy-MM-dd')}
                        className="w-full mt-1 px-3 py-2 border rounded-md bg-background text-sm"
                      />
                    </div>
                  </div>
                  
                  <Button 
                    size="sm" 
                    className="w-full"
                    onClick={applyCustomDateRange}
                  >
                    Apply Range
                  </Button>
                </div>
              </div>
            )}
          </div>
          
          <Button 
            variant="outline" 
            size="sm" 
            onClick={loadAnalytics}
            disabled={isRefreshing}
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>
      
      {/* Show selected custom date range if applicable */}
      {dateRange === 'custom' && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Calendar className="w-4 h-4" />
          <span>Showing data from <strong>{customStartDate}</strong> to <strong>{customEndDate}</strong></span>
          <Button 
            variant="link" 
            size="sm" 
            className="h-auto p-0 text-primary"
            onClick={() => setShowCustomDatePicker(true)}
          >
            Change
          </Button>
        </div>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-green-600">Total Revenue</p>
                <p className="text-2xl font-bold text-green-700">
                  {formatCurrency(analytics.totalRevenue)}
                </p>
                <p className="text-xs text-green-600 mt-1">
                  {analytics.revenueByDay.length} days with transactions
                </p>
              </div>
              <div className="p-3 bg-green-200 rounded-full">
                <DollarSign className="w-6 h-6 text-green-700" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-blue-600">Total Energy</p>
                <p className="text-2xl font-bold text-blue-700">
                  {formatEnergy(analytics.totalEnergy)}
                </p>
                <p className="text-xs text-blue-600 mt-1">
                  Consumed this period
                </p>
              </div>
              <div className="p-3 bg-blue-200 rounded-full">
                <Zap className="w-6 h-6 text-blue-700" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-orange-50 to-orange-100 border-orange-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-orange-600">Live Power</p>
                <p className="text-2xl font-bold text-orange-700">
                  {formatPower(analytics.livePower)}
                </p>
                <p className="text-xs text-orange-600 mt-1">
                  Current draw across all meters
                </p>
              </div>
              <div className="p-3 bg-orange-200 rounded-full">
                <Activity className="w-6 h-6 text-orange-700" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-purple-600">Active Meters</p>
                <p className="text-2xl font-bold text-purple-700">
                  {analytics.activeMeters} / {analytics.totalMeters}
                </p>
                <p className="text-xs text-purple-600 mt-1">
                  Online and responding
                </p>
              </div>
              <div className="p-3 bg-purple-200 rounded-full">
                <Users className="w-6 h-6 text-purple-700" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Revenue Over Time */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-green-500" />
              Revenue Trend
            </CardTitle>
            <CardDescription>Daily revenue over selected period</CardDescription>
          </CardHeader>
          <CardContent>
            {analytics.revenueByDay.length > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <AreaChart data={analytics.revenueByDay}>
                  <defs>
                    <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.8}/>
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                  <XAxis 
                    dataKey="date" 
                    tick={{ fontSize: 12 }}
                    tickFormatter={(v) => format(new Date(v), 'MMM d')}
                  />
                  <YAxis 
                    tick={{ fontSize: 12 }}
                    tickFormatter={(v) => `₦${(v / 1000).toFixed(0)}k`}
                  />
                  <Tooltip 
                    formatter={(value: number) => [formatCurrency(value), 'Revenue']}
                    labelFormatter={(label) => format(new Date(label), 'PPP')}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="revenue" 
                    stroke="#10b981" 
                    fillOpacity={1} 
                    fill="url(#colorRevenue)" 
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-[250px] text-muted-foreground">
                No revenue data for this period
              </div>
            )}
          </CardContent>
        </Card>

        {/* Energy Consumption */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Zap className="w-5 h-5 text-blue-500" />
              Energy Consumption
            </CardTitle>
            <CardDescription>Daily energy usage (kWh)</CardDescription>
          </CardHeader>
          <CardContent>
            {analytics.energyByDay.length > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={analytics.energyByDay}>
                  <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                  <XAxis 
                    dataKey="date" 
                    tick={{ fontSize: 12 }}
                    tickFormatter={(v) => format(new Date(v), 'MMM d')}
                  />
                  <YAxis 
                    tick={{ fontSize: 12 }}
                    tickFormatter={(v) => `${v}kWh`}
                  />
                  <Tooltip 
                    formatter={(value: number) => [formatEnergy(value), 'Energy']}
                    labelFormatter={(label) => format(new Date(label), 'PPP')}
                  />
                  <Bar dataKey="energy" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-[250px] text-muted-foreground">
                No energy data for this period
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Live Power History */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Activity className="w-5 h-5 text-orange-500" />
            Live Power Over Time
          </CardTitle>
          <CardDescription>
            Power draw recorded over time (kW) - Updates on each refresh
          </CardDescription>
        </CardHeader>
        <CardContent>
          {analytics.powerHistory && analytics.powerHistory.length > 0 ? (
            <ResponsiveContainer width="100%" height={250}>
              <AreaChart data={analytics.powerHistory}>
                <defs>
                  <linearGradient id="colorPower" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f97316" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="#f97316" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                <XAxis 
                  dataKey="timestamp" 
                  tick={{ fontSize: 12 }}
                  tickFormatter={(v) => format(new Date(v), 'MMM d HH:mm')}
                />
                <YAxis 
                  tick={{ fontSize: 12 }}
                  tickFormatter={(v) => `${v.toFixed(2)} kW`}
                />
                <Tooltip 
                  formatter={(value: number) => [formatPower(value), 'Power']}
                  labelFormatter={(label) => format(new Date(label), 'PPP p')}
                />
                <Area 
                  type="monotone" 
                  dataKey="power" 
                  stroke="#f97316" 
                  fillOpacity={1} 
                  fill="url(#colorPower)" 
                />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex flex-col items-center justify-center h-[250px] text-muted-foreground">
              <Activity className="w-12 h-12 mb-2 opacity-50" />
              <p>No power history data yet</p>
              <p className="text-sm mt-1">Power readings are recorded each time you refresh the dashboard</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Revenue by Project */}
      {analytics.revenueByProject.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-purple-500" />
              Revenue by Project
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie
                    data={analytics.revenueByProject}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="revenue"
                    nameKey="projectName"
                  >
                    {analytics.revenueByProject.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value: number) => formatCurrency(value)} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
              <div className="space-y-2">
                {analytics.revenueByProject.map((project, index) => (
                  <div key={project.projectId} className="flex items-center justify-between p-2 rounded-lg bg-muted/50">
                    <div className="flex items-center gap-2">
                      <div 
                        className="w-3 h-3 rounded-full" 
                        style={{ backgroundColor: COLORS[index % COLORS.length] }}
                      />
                      <span className="font-medium">{project.projectName}</span>
                    </div>
                    <span className="font-bold">{formatCurrency(project.revenue)}</span>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Rankings and Alerts */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Top Energy Consumers */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <Zap className="w-5 h-5 text-yellow-500" />
              Top Energy Consumers
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[200px]">
              <div className="space-y-2">
                {analytics.topConsumers.length > 0 ? (
                  analytics.topConsumers.map((meter, index) => (
                    <div key={meter.meterId} className="flex items-center justify-between p-2 rounded-lg bg-muted/50">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="w-6 h-6 flex items-center justify-center p-0">
                          {index + 1}
                        </Badge>
                        <div>
                          <p className="font-medium text-sm">{meter.roomNo}</p>
                          <p className="text-xs text-muted-foreground">{meter.projectName}</p>
                        </div>
                      </div>
                      <span className="font-mono text-sm font-bold text-blue-600">
                        {formatEnergy(meter.energy)}
                      </span>
                    </div>
                  ))
                ) : (
                  <p className="text-center text-muted-foreground py-4">No data</p>
                )}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>

        {/* Top Revenue Generators */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-green-500" />
              Top Revenue Generators
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[200px]">
              <div className="space-y-2">
                {analytics.topRevenue.length > 0 ? (
                  analytics.topRevenue.map((meter, index) => (
                    <div key={meter.roomNo} className="flex items-center justify-between p-2 rounded-lg bg-muted/50">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="w-6 h-6 flex items-center justify-center p-0">
                          {index + 1}
                        </Badge>
                        <div>
                          <p className="font-medium text-sm">{meter.roomNo}</p>
                          <p className="text-xs text-muted-foreground">{meter.projectName}</p>
                        </div>
                      </div>
                      <span className="font-mono text-sm font-bold text-green-600">
                        {formatCurrency(meter.revenue)}
                      </span>
                    </div>
                  ))
                ) : (
                  <p className="text-center text-muted-foreground py-4">No data</p>
                )}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>

        {/* Live Power by Meter */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <Activity className="w-5 h-5 text-orange-500" />
              Live Power Draw
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[200px]">
              <div className="space-y-2">
                {analytics.livePowerByMeter.filter(m => m.power > 0).length > 0 ? (
                  analytics.livePowerByMeter
                    .filter(m => m.power > 0)
                    .slice(0, 10)
                    .map((meter, index) => (
                      <div key={meter.meterId} className="flex items-center justify-between p-2 rounded-lg bg-muted/50">
                        <div className="flex items-center gap-2">
                          <Power className="w-4 h-4 text-green-500" />
                          <div>
                            <p className="font-medium text-sm">{meter.roomNo}</p>
                            <p className="text-xs text-muted-foreground">{meter.projectName}</p>
                          </div>
                        </div>
                        <span className="font-mono text-sm font-bold text-orange-600">
                          {formatPower(meter.power)}
                        </span>
                      </div>
                    ))
                ) : (
                  <p className="text-center text-muted-foreground py-4">No active power draw</p>
                )}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      </div>

      {/* Alerts Section */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Low Balance Alerts */}
        <Card className={analytics.lowBalanceMeters.length > 0 ? 'border-yellow-300' : ''}>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <Battery className="w-5 h-5 text-yellow-500" />
              Low Balance
              {analytics.lowBalanceMeters.length > 0 && (
                <Badge variant="secondary" className="ml-auto bg-yellow-100 text-yellow-700">
                  {analytics.lowBalanceMeters.length}
                </Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[150px]">
              <div className="space-y-2">
                {analytics.lowBalanceMeters.length > 0 ? (
                  analytics.lowBalanceMeters.map((meter) => (
                    <div key={meter.meterId} className="flex items-center justify-between p-2 rounded-lg bg-yellow-50">
                      <span className="font-medium text-sm">{meter.roomNo}</span>
                      <span className="font-mono text-sm text-yellow-700">
                        {formatCurrency(meter.balance)}
                      </span>
                    </div>
                  ))
                ) : (
                  <p className="text-center text-muted-foreground py-4">All meters have sufficient balance</p>
                )}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>

        {/* Forced Mode Meters */}
        <Card className={analytics.forcedModeMeters.length > 0 ? 'border-purple-300' : ''}>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-purple-500" />
              Forced Mode
              {analytics.forcedModeMeters.length > 0 && (
                <Badge variant="secondary" className="ml-auto bg-purple-100 text-purple-700">
                  {analytics.forcedModeMeters.length}
                </Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[150px]">
              <div className="space-y-2">
                {analytics.forcedModeMeters.length > 0 ? (
                  analytics.forcedModeMeters.map((meter) => (
                    <div key={meter.meterId} className="flex items-center justify-between p-2 rounded-lg bg-purple-50">
                      <span className="font-medium text-sm">{meter.roomNo}</span>
                      <Badge className={meter.controlMode === 'forced_on' ? 'bg-orange-500' : 'bg-purple-500'}>
                        {meter.controlMode === 'forced_on' ? 'Forced ON' : 'Forced OFF'}
                      </Badge>
                    </div>
                  ))
                ) : (
                  <p className="text-center text-muted-foreground py-4">All meters in prepaid mode</p>
                )}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>

        {/* Offline Meters */}
        <Card className={analytics.offlineMeters.length > 0 ? 'border-red-300' : ''}>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <WifiOff className="w-5 h-5 text-red-500" />
              Offline Meters
              {analytics.offlineMeters.length > 0 && (
                <Badge variant="secondary" className="ml-auto bg-red-100 text-red-700">
                  {analytics.offlineMeters.length}
                </Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[150px]">
              <div className="space-y-2">
                {analytics.offlineMeters.length > 0 ? (
                  analytics.offlineMeters.map((meter) => (
                    <div key={meter.meterId} className="flex items-center justify-between p-2 rounded-lg bg-red-50">
                      <span className="font-medium text-sm">{meter.roomNo}</span>
                      <Badge variant="destructive">Offline</Badge>
                    </div>
                  ))
                ) : (
                  <p className="text-center text-muted-foreground py-4">All meters online</p>
                )}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
