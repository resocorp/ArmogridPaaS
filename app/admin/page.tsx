'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Shield, 
  Users, 
  Zap, 
  TrendingUp, 
  LogOut, 
  RefreshCw, 
  Power, 
  PowerOff, 
  Building2, 
  Activity,
  CreditCard,
  Search,
  AlertCircle,
  CheckCircle2,
  Clock,
  DollarSign,
  BarChart3,
  Wallet,
  ArrowUpRight,
  ArrowDownRight,
  Gauge,
  WifiOff,
  Wifi,
  ArrowUpDown,
  ChevronUp,
  ChevronDown,
  KeyRound,
  Link2,
  Unlink,
  Eye,
  EyeOff,
  Info,
  Bolt,
  CircuitBoard,
  Settings,
  UserPlus,
  Mail,
  Phone,
  MapPin,
  Save
} from 'lucide-react';
import Link from 'next/link';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { AdminAnalytics } from '@/components/admin-analytics';

interface Stats {
  totalProjects: number;
  totalMeters: number;
  monthlyRevenue: number;
  todayTransactions: number;
  todaySuccessful: number;
}

interface Project {
  projectId: string;
  projectName: string;
  address?: string;
  meterCount?: number;
}

interface Meter {
  meterId?: string;
  roomNo: string;
  roomId?: string;
  projectId: string;
  projectName?: string;
  balance?: string;
  totalMoney?: number;
  buyTimes?: number;
  switchSta?: string | number;
  unConnnect?: number;
  controlMode?: string;
  readValue?: string; // epi - energy reading
  model?: string;
  power?: string;
  meterSN?: string;
  lastReadTime?: string;
  error?: string;
}

type SortField = 'roomNo' | 'projectName' | 'meterId' | 'balance' | 'readValue';
type SortDirection = 'asc' | 'desc';

interface Transaction {
  id: string;
  meter_id: string;
  amount_kobo: number;
  paystack_reference: string;
  paystack_status: 'pending' | 'success' | 'failed';
  created_at: string;
  customer_email?: string;
  metadata?: any;
}

interface ActivityItem {
  id: string;
  type: 'transaction' | 'webhook';
  status: string;
  description: string;
  meterId?: string;
  amount?: number;
  reference?: string;
  timestamp: string;
  error?: string;
}

interface Registration {
  id: string;
  name: string;
  email: string;
  phone: string;
  room_number: string;
  location_id: string;
  location_name: string | null;
  amount_paid: number;
  paystack_reference: string | null;
  payment_status: 'pending' | 'success' | 'failed';
  admin_notified: boolean;
  created_at: string;
}

interface AdminSettings {
  signup_amount: string;
  admin_email: string;
  admin_whatsapp: string;
  ultramsg_instance_id: string;
  ultramsg_token: string;
}

export default function AdminPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');
  
  // Data states
  const [stats, setStats] = useState<Stats | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [meters, setMeters] = useState<Meter[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [transactionSummary, setTransactionSummary] = useState<any>(null);
  
  // Loading states
  const [statsLoading, setStatsLoading] = useState(false);
  const [metersLoading, setMetersLoading] = useState(false);
  const [transactionsLoading, setTransactionsLoading] = useState(false);
  const [activitiesLoading, setActivitiesLoading] = useState(false);
  
  // Modal states
  const [selectedMeter, setSelectedMeter] = useState<Meter | null>(null);
  const [rechargeDialogOpen, setRechargeDialogOpen] = useState(false);
  const [controlDialogOpen, setControlDialogOpen] = useState(false);
  const [rechargeAmount, setRechargeAmount] = useState('');
  const [rechargeNote, setRechargeNote] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  
  // Search/Filter
  const [meterSearch, setMeterSearch] = useState('');
  const [transactionFilter, setTransactionFilter] = useState('all');
  const [selectedProjectId, setSelectedProjectId] = useState<string>('all');
  const [projectsLoading, setProjectsLoading] = useState(false);
  
  // Sorting
  const [sortField, setSortField] = useState<SortField>('roomNo');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  
  // Link Account states
  const [linkDialogOpen, setLinkDialogOpen] = useState(false);
  const [linkUsername, setLinkUsername] = useState('');
  const [linkPassword, setLinkPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLinking, setIsLinking] = useState(false);
  const [linkedCredentials, setLinkedCredentials] = useState<Record<string, any>>({});
  const [isSyncing, setIsSyncing] = useState(false);
  
  // Meter details dialog
  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false);
  const [detailsMeter, setDetailsMeter] = useState<any>(null);

  // Registrations state
  const [registrations, setRegistrations] = useState<Registration[]>([]);
  const [registrationsLoading, setRegistrationsLoading] = useState(false);
  const [registrationCounts, setRegistrationCounts] = useState({ total: 0, pending: 0, success: 0, failed: 0 });
  const [registrationFilter, setRegistrationFilter] = useState('all');

  // Settings state
  const [adminSettings, setAdminSettings] = useState<AdminSettings>({
    signup_amount: '2000',
    admin_email: '',
    admin_whatsapp: '',
    ultramsg_instance_id: '',
    ultramsg_token: '',
  });
  const [settingsLoading, setSettingsLoading] = useState(false);
  const [savingSettings, setSavingSettings] = useState(false);

  useEffect(() => {
    checkAdminAuth();
    loadLinkedCredentials();
  }, []);

  const checkAdminAuth = async () => {
    try {
      const response = await fetch('/api/auth/me');
      const data = await response.json();
      
      if (!response.ok || !data.success) {
        router.push('/login');
        return;
      }

      if (data.data.userType !== 0) {
        toast.error('Admin access required');
        router.push('/dashboard');
        return;
      }

      setIsAdmin(true);
      // Load initial data
      loadStats();
      loadActivities();
    } catch (error) {
      router.push('/login');
    } finally {
      setIsLoading(false);
    }
  };

  const loadStats = async () => {
    setStatsLoading(true);
    try {
      const response = await fetch('/api/admin/stats');
      const data = await response.json();
      if (data.success) {
        setStats(data.data);
      }
    } catch (error) {
      console.error('Failed to load stats:', error);
    } finally {
      setStatsLoading(false);
    }
  };

  const loadProjects = async () => {
    setProjectsLoading(true);
    try {
      const response = await fetch('/api/admin/projects');
      const data = await response.json();
      if (data.success) {
        setProjects(data.data);
      }
    } catch (error) {
      console.error('Failed to load projects:', error);
      toast.error('Failed to load projects');
    } finally {
      setProjectsLoading(false);
    }
  };

  const loadMetersByProject = async (projectId: string) => {
    setMetersLoading(true);
    try {
      if (projectId === 'all') {
        // Load meters from all projects
        const allMeters: Meter[] = [];
        for (const project of projects) {
          try {
            const response = await fetch(`/api/admin/projects/${project.projectId}/meters`);
            const data = await response.json();
            if (data.success && data.data) {
              allMeters.push(...data.data);
            }
          } catch (err) {
            console.error(`Failed to load meters for project ${project.projectName}:`, err);
          }
        }
        setMeters(allMeters);
      } else {
        const response = await fetch(`/api/admin/projects/${projectId}/meters`);
        const data = await response.json();
        if (data.success) {
          setMeters(data.data || []);
        } else {
          toast.error(data.error || 'Failed to load meters');
          setMeters([]);
        }
      }
    } catch (error) {
      console.error('Failed to load meters:', error);
      toast.error('Failed to load meters');
      setMeters([]);
    } finally {
      setMetersLoading(false);
    }
  };

  // Load meters when project changes
  useEffect(() => {
    if (activeTab === 'meters' && projects.length > 0) {
      loadMetersByProject(selectedProjectId);
    }
  }, [selectedProjectId, projects.length]);

  const loadMeters = async () => {
    if (projects.length === 0) {
      await loadProjects();
    } else {
      loadMetersByProject(selectedProjectId);
    }
  };
  
  // Sorting function
  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  // Load linked credentials
  const loadLinkedCredentials = async () => {
    try {
      const response = await fetch('/api/admin/meters/sync');
      const data = await response.json();
      if (data.success) {
        setLinkedCredentials(data.data || {});
      }
    } catch (error) {
      console.error('Failed to load linked credentials:', error);
    }
  };

  // Link account for a meter
  const handleLinkAccount = async () => {
    if (!selectedMeter || !linkUsername || !linkPassword) {
      toast.error('Please enter username and password');
      return;
    }

    setIsLinking(true);
    try {
      const response = await fetch(`/api/admin/meters/${selectedMeter.meterId}/credentials`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          roomNo: selectedMeter.roomNo,
          projectId: selectedMeter.projectId,
          projectName: selectedMeter.projectName,
          username: linkUsername,
          password: linkPassword,
        }),
      });

      const data = await response.json();

      if (data.success) {
        toast.success('Account linked successfully!');
        setLinkDialogOpen(false);
        setLinkUsername('');
        setLinkPassword('');
        
        // Update linked credentials cache - no need to reload all meters!
        // The table will use this data to display balance/reading/status
        setLinkedCredentials(prev => ({
          ...prev,
          [selectedMeter.roomNo]: {
            linked: true,
            username: linkUsername,
            lastSyncAt: data.data.lastSyncAt,
            meterData: data.data.meterData,
          },
        }));
      } else {
        toast.error(data.error || 'Failed to link account');
      }
    } catch (error) {
      console.error('Failed to link account:', error);
      toast.error('Failed to link account');
    } finally {
      setIsLinking(false);
    }
  };

  // Sync all linked meters
  const handleSyncAll = async () => {
    setIsSyncing(true);
    try {
      const response = await fetch('/api/admin/meters/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });

      const data = await response.json();

      if (data.success) {
        toast.success(`Synced ${data.synced} meters`);
        loadLinkedCredentials();
        loadMetersByProject(selectedProjectId);
      } else {
        toast.error(data.error || 'Failed to sync');
      }
    } catch (error) {
      console.error('Failed to sync:', error);
      toast.error('Failed to sync meters');
    } finally {
      setIsSyncing(false);
    }
  };

  // Open link dialog
  const openLinkDialog = (meter: Meter) => {
    setSelectedMeter(meter);
    // Pre-fill username with a guess based on room name
    const guessedUsername = meter.roomNo.toLowerCase().replace(/[^a-z0-9]/g, '');
    setLinkUsername(guessedUsername);
    setLinkPassword('');
    setShowPassword(false);
    setLinkDialogOpen(true);
  };

  const loadTransactions = async () => {
    setTransactionsLoading(true);
    try {
      const response = await fetch('/api/admin/transactions?limit=100');
      const data = await response.json();
      if (data.success) {
        setTransactions(data.data);
        setTransactionSummary(data.summary);
      }
    } catch (error) {
      console.error('Failed to load transactions:', error);
      toast.error('Failed to load transactions');
    } finally {
      setTransactionsLoading(false);
    }
  };

  const loadActivities = async () => {
    setActivitiesLoading(true);
    try {
      const response = await fetch('/api/admin/activity?limit=20');
      const data = await response.json();
      if (data.success) {
        setActivities(data.data);
      }
    } catch (error) {
      console.error('Failed to load activities:', error);
    } finally {
      setActivitiesLoading(false);
    }
  };

  const loadRegistrations = async () => {
    setRegistrationsLoading(true);
    try {
      const response = await fetch('/api/admin/registrations?limit=100');
      const data = await response.json();
      if (data.success) {
        setRegistrations(data.data);
        setRegistrationCounts(data.counts);
      }
    } catch (error) {
      console.error('Failed to load registrations:', error);
      toast.error('Failed to load registrations');
    } finally {
      setRegistrationsLoading(false);
    }
  };

  const loadSettings = async () => {
    setSettingsLoading(true);
    try {
      const response = await fetch('/api/admin/settings');
      const data = await response.json();
      if (data.success) {
        setAdminSettings({
          signup_amount: data.data.signup_amount || '2000',
          admin_email: data.data.admin_email || '',
          admin_whatsapp: data.data.admin_whatsapp || '',
          ultramsg_instance_id: data.data.ultramsg_instance_id || '',
          ultramsg_token: data.data.ultramsg_token || '',
        });
      }
    } catch (error) {
      console.error('Failed to load settings:', error);
      toast.error('Failed to load settings');
    } finally {
      setSettingsLoading(false);
    }
  };

  const saveSettings = async () => {
    setSavingSettings(true);
    try {
      const response = await fetch('/api/admin/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ settings: adminSettings }),
      });
      const data = await response.json();
      if (data.success) {
        toast.success('Settings saved successfully');
      } else {
        toast.error(data.error || 'Failed to save settings');
      }
    } catch (error) {
      console.error('Failed to save settings:', error);
      toast.error('Failed to save settings');
    } finally {
      setSavingSettings(false);
    }
  };

  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
    if (tab === 'meters') {
      // Always load projects first when entering meters tab
      if (projects.length === 0) {
        loadProjects();
      } else if (selectedProjectId) {
        loadMetersByProject(selectedProjectId);
      }
    } else if (tab === 'transactions' && transactions.length === 0) {
      loadTransactions();
    } else if (tab === 'registrations' && registrations.length === 0) {
      loadRegistrations();
    } else if (tab === 'settings') {
      loadSettings();
    }
  };

  const handleProjectChange = (projectId: string) => {
    setSelectedProjectId(projectId);
    setMeterSearch(''); // Clear search when changing projects
  };

  const handleMeterControl = async (type: 0 | 1 | 2) => {
    if (!selectedMeter?.meterId) return;
    
    setIsProcessing(true);
    try {
      const response = await fetch(`/api/admin/meters/${selectedMeter.meterId}/control`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type }),
      });
      const data = await response.json();
      
      if (data.success) {
        toast.success(data.message);
        setControlDialogOpen(false);
        loadMeters();
      } else {
        toast.error(data.error || 'Failed to control meter');
      }
    } catch (error) {
      toast.error('Failed to control meter');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleRecharge = async () => {
    if (!selectedMeter?.meterId || !rechargeAmount) return;
    
    const amount = parseFloat(rechargeAmount);
    if (isNaN(amount) || amount <= 0) {
      toast.error('Please enter a valid amount');
      return;
    }
    
    setIsProcessing(true);
    try {
      const response = await fetch(`/api/admin/meters/${selectedMeter.meterId}/recharge`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount, note: rechargeNote }),
      });
      const data = await response.json();
      
      if (data.success) {
        toast.success(data.message);
        setRechargeDialogOpen(false);
        setRechargeAmount('');
        setRechargeNote('');
        loadMeters();
        loadStats();
      } else {
        toast.error(data.error || 'Failed to recharge meter');
      }
    } catch (error) {
      toast.error('Failed to recharge meter');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      toast.success('Logged out successfully');
      router.push('/');
    } catch (error) {
      toast.error('Failed to logout');
    }
  };

  const filteredMeters = meters
    .filter(meter => {
      const searchLower = meterSearch.toLowerCase();
      return (
        meter.roomNo?.toLowerCase().includes(searchLower) ||
        meter.projectName?.toLowerCase().includes(searchLower) ||
        meter.meterId?.toLowerCase().includes(searchLower)
      );
    })
    .sort((a, b) => {
      let aVal: any = a[sortField] || '';
      let bVal: any = b[sortField] || '';
      
      // Handle numeric sorting for balance and readValue
      if (sortField === 'balance' || sortField === 'readValue') {
        aVal = parseFloat(aVal) || 0;
        bVal = parseFloat(bVal) || 0;
      } else {
        aVal = String(aVal).toLowerCase();
        bVal = String(bVal).toLowerCase();
      }
      
      if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });

  const filteredTransactions = transactions.filter(tx => {
    if (transactionFilter === 'all') return true;
    return tx.paystack_status === transactionFilter;
  });

  const getStatusBadge = (status: string) => {
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
  };

  const getMeterStatusBadge = (meter: { switchSta?: number | string; unConnnect?: number; controlMode?: string }) => {
    const isOnline = meter.unConnnect === 0;
    const isPowered = meter.switchSta === 1 || meter.switchSta === '1';
    const isForced = meter.controlMode === '1' || meter.controlMode === '2';
    const isPrepaid = meter.controlMode === '0';
    
    // Offline status takes priority
    if (!isOnline) {
      return <Badge className="bg-gray-500/10 text-gray-500 border-gray-500/20"><WifiOff className="w-3 h-3 mr-1" />Offline</Badge>;
    }
    
    // Show control mode + power state
    if (isForced) {
      // Forced mode
      if (isPowered) {
        return (
          <div className="flex items-center gap-1">
            <Badge className="bg-orange-500/10 text-orange-500 border-orange-500/20">
              <Power className="w-3 h-3 mr-1" />Forced ON
            </Badge>
          </div>
        );
      } else {
        return (
          <div className="flex items-center gap-1">
            <Badge className="bg-purple-500/10 text-purple-500 border-purple-500/20">
              <PowerOff className="w-3 h-3 mr-1" />Forced OFF
            </Badge>
          </div>
        );
      }
    }
    
    // Prepaid mode (normal)
    if (isPowered) {
      return <Badge className="bg-green-500/10 text-green-500 border-green-500/20"><Power className="w-3 h-3 mr-1" />On</Badge>;
    }
    return <Badge className="bg-red-500/10 text-red-500 border-red-500/20"><PowerOff className="w-3 h-3 mr-1" />Off</Badge>;
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading admin panel...</p>
        </div>
      </div>
    );
  }

  if (!isAdmin) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card sticky top-0 z-50">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-primary to-primary/70 rounded-xl flex items-center justify-center shadow-lg">
              <Shield className="w-6 h-6 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-xl font-bold">Admin Panel</h1>
              <p className="text-xs text-muted-foreground">ArmogridSolar Management</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Link href="/dashboard">
              <Button variant="outline" size="sm">
                <Gauge className="w-4 h-4 mr-2" />
                User View
              </Button>
            </Link>
            <Button variant="ghost" size="sm" onClick={handleLogout}>
              <LogOut className="w-4 h-4 mr-2" />
              Logout
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-6">
        <Tabs value={activeTab} onValueChange={handleTabChange} className="space-y-6">
          <TabsList className="grid w-full max-w-3xl grid-cols-6">
            <TabsTrigger value="overview" className="flex items-center gap-2">
              <BarChart3 className="w-4 h-4" />
              Overview
            </TabsTrigger>
            <TabsTrigger value="analytics" className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4" />
              Analytics
            </TabsTrigger>
            <TabsTrigger value="meters" className="flex items-center gap-2">
              <Zap className="w-4 h-4" />
              Meters
            </TabsTrigger>
            <TabsTrigger value="transactions" className="flex items-center gap-2">
              <CreditCard className="w-4 h-4" />
              Transactions
            </TabsTrigger>
            <TabsTrigger value="registrations" className="flex items-center gap-2">
              <Users className="w-4 h-4" />
              Registrations
            </TabsTrigger>
            <TabsTrigger value="settings" className="flex items-center gap-2">
              <Settings className="w-4 h-4" />
              Settings
            </TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            {/* Stats Cards */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <Card className="relative overflow-hidden">
                <div className="absolute top-0 right-0 w-20 h-20 bg-blue-500/10 rounded-full -mr-10 -mt-10"></div>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Projects</CardTitle>
                  <Building2 className="h-4 w-4 text-blue-500" />
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">
                    {statsLoading ? '...' : stats?.totalProjects || 0}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">Active properties</p>
                </CardContent>
              </Card>

              <Card className="relative overflow-hidden">
                <div className="absolute top-0 right-0 w-20 h-20 bg-yellow-500/10 rounded-full -mr-10 -mt-10"></div>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Meters</CardTitle>
                  <Zap className="h-4 w-4 text-yellow-500" />
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">
                    {statsLoading ? '...' : stats?.totalMeters || 0}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">Connected devices</p>
                </CardContent>
              </Card>

              <Card className="relative overflow-hidden">
                <div className="absolute top-0 right-0 w-20 h-20 bg-green-500/10 rounded-full -mr-10 -mt-10"></div>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Monthly Revenue</CardTitle>
                  <DollarSign className="h-4 w-4 text-green-500" />
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">
                    ₦{statsLoading ? '...' : (stats?.monthlyRevenue || 0).toLocaleString()}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1 flex items-center">
                    <ArrowUpRight className="w-3 h-3 text-green-500 mr-1" />
                    This month
                  </p>
                </CardContent>
              </Card>

              <Card className="relative overflow-hidden">
                <div className="absolute top-0 right-0 w-20 h-20 bg-purple-500/10 rounded-full -mr-10 -mt-10"></div>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Today's Transactions</CardTitle>
                  <Activity className="h-4 w-4 text-purple-500" />
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">
                    {statsLoading ? '...' : stats?.todayTransactions || 0}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {stats?.todaySuccessful || 0} successful
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Quick Actions & Activity */}
            <div className="grid gap-6 lg:grid-cols-3">
              {/* Quick Actions */}
              <Card className="lg:col-span-1">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Wallet className="w-5 h-5" />
                    Quick Actions
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <Button 
                    className="w-full justify-start" 
                    variant="outline"
                    onClick={() => handleTabChange('meters')}
                  >
                    <Zap className="w-4 h-4 mr-2" />
                    Manage Meters
                  </Button>
                  <Button 
                    className="w-full justify-start" 
                    variant="outline"
                    onClick={() => handleTabChange('transactions')}
                  >
                    <CreditCard className="w-4 h-4 mr-2" />
                    View Transactions
                  </Button>
                  <Button 
                    className="w-full justify-start" 
                    variant="outline"
                    onClick={() => {
                      loadStats();
                      loadActivities();
                      toast.success('Dashboard refreshed');
                    }}
                  >
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Refresh Data
                  </Button>
                  <Link href="/dashboard" className="block">
                    <Button className="w-full justify-start" variant="outline">
                      <Gauge className="w-4 h-4 mr-2" />
                      Switch to User View
                    </Button>
                  </Link>
                </CardContent>
              </Card>

              {/* Recent Activity */}
              <Card className="lg:col-span-2">
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <Activity className="w-5 h-5" />
                    Recent Activity
                  </CardTitle>
                  <Button variant="ghost" size="sm" onClick={loadActivities} disabled={activitiesLoading}>
                    <RefreshCw className={`w-4 h-4 ${activitiesLoading ? 'animate-spin' : ''}`} />
                  </Button>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-[300px]">
                    {activitiesLoading ? (
                      <div className="flex items-center justify-center py-8">
                        <RefreshCw className="w-6 h-6 animate-spin text-muted-foreground" />
                      </div>
                    ) : activities.length === 0 ? (
                      <div className="text-center py-8 text-muted-foreground">
                        <Activity className="w-12 h-12 mx-auto mb-2 opacity-50" />
                        <p>No recent activity</p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {activities.slice(0, 10).map((activity) => (
                          <div key={activity.id} className="flex items-start gap-3 p-3 rounded-lg border bg-card hover:bg-muted/50 transition-colors">
                            <div className={`p-2 rounded-full ${
                              activity.status === 'success' || activity.status === 'processed' 
                                ? 'bg-green-500/10' 
                                : activity.status === 'pending' 
                                  ? 'bg-yellow-500/10' 
                                  : 'bg-red-500/10'
                            }`}>
                              {activity.type === 'transaction' ? (
                                <CreditCard className={`w-4 h-4 ${
                                  activity.status === 'success' ? 'text-green-500' 
                                    : activity.status === 'pending' ? 'text-yellow-500' 
                                      : 'text-red-500'
                                }`} />
                              ) : (
                                <Wifi className={`w-4 h-4 ${
                                  activity.status === 'processed' ? 'text-green-500' : 'text-yellow-500'
                                }`} />
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium truncate">{activity.description}</p>
                              <p className="text-xs text-muted-foreground">
                                {format(new Date(activity.timestamp), 'MMM d, HH:mm')}
                              </p>
                            </div>
                            {activity.amount && (
                              <span className="text-sm font-medium text-green-500">
                                +₦{activity.amount.toLocaleString()}
                              </span>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </ScrollArea>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Analytics Tab */}
          <TabsContent value="analytics" className="space-y-4">
            <AdminAnalytics />
          </TabsContent>

          {/* Meters Tab */}
          <TabsContent value="meters" className="space-y-4">
            <Card>
              <CardHeader>
                <div className="flex flex-col gap-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        <Zap className="w-5 h-5" />
                        Meter Management
                      </CardTitle>
                      <CardDescription>Select a project to view and control its meters</CardDescription>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={handleSyncAll}
                        disabled={isSyncing || Object.keys(linkedCredentials).length === 0}
                        title="Sync all linked meters"
                      >
                        <RefreshCw className={`w-4 h-4 mr-2 ${isSyncing ? 'animate-spin' : ''}`} />
                        Sync All ({Object.keys(linkedCredentials).length})
                      </Button>
                      <Button 
                        variant="outline" 
                        size="icon" 
                        onClick={() => {
                          loadProjects();
                          if (selectedProjectId) loadMetersByProject(selectedProjectId);
                        }} 
                        disabled={metersLoading || projectsLoading}
                      >
                        <RefreshCw className={`w-4 h-4 ${(metersLoading || projectsLoading) ? 'animate-spin' : ''}`} />
                      </Button>
                    </div>
                  </div>
                  
                  {/* Project Selector and Search */}
                  <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
                    <div className="flex items-center gap-2">
                      <Building2 className="w-4 h-4 text-muted-foreground" />
                      <span className="text-sm font-medium">Project:</span>
                      <select 
                        className="px-3 py-2 rounded-md border bg-background text-sm min-w-[200px]"
                        value={selectedProjectId}
                        onChange={(e) => handleProjectChange(e.target.value)}
                        disabled={projectsLoading}
                      >
                        {projectsLoading ? (
                          <option>Loading projects...</option>
                        ) : projects.length === 0 ? (
                          <option value="">No projects found</option>
                        ) : (
                          <>
                            <option value="all">All Projects ({projects.length})</option>
                            {projects.map((project) => (
                              <option key={project.projectId} value={project.projectId}>
                                {project.projectName}
                              </option>
                            ))}
                          </>
                        )}
                      </select>
                    </div>
                    <div className="relative flex-1 max-w-xs">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input 
                        placeholder="Search meters by room..." 
                        className="pl-9"
                        value={meterSearch}
                        onChange={(e) => setMeterSearch(e.target.value)}
                      />
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {projectsLoading ? (
                  <div className="flex items-center justify-center py-12">
                    <RefreshCw className="w-8 h-8 animate-spin text-muted-foreground" />
                    <p className="ml-3 text-muted-foreground">Loading projects...</p>
                  </div>
                ) : projects.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <Building2 className="w-16 h-16 mx-auto mb-4 opacity-30" />
                    <p className="text-lg font-medium">No projects found</p>
                    <p className="text-sm">Click refresh to load projects from the IoT platform</p>
                  </div>
                ) : metersLoading ? (
                  <div className="flex items-center justify-center py-12">
                    <RefreshCw className="w-8 h-8 animate-spin text-muted-foreground" />
                    <p className="ml-3 text-muted-foreground">Loading meters...</p>
                  </div>
                ) : filteredMeters.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <Zap className="w-16 h-16 mx-auto mb-4 opacity-30" />
                    <p className="text-lg font-medium">No meters found</p>
                    <p className="text-sm">
                      {meterSearch 
                        ? 'Try a different search term' 
                        : selectedProjectId 
                          ? 'This project has no meters configured'
                          : 'Select a project to view its meters'}
                    </p>
                  </div>
                ) : (
                  <div className="rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead 
                            className="cursor-pointer hover:bg-muted/50"
                            onClick={() => handleSort('roomNo')}
                          >
                            <div className="flex items-center gap-1">
                              Room/Unit
                              {sortField === 'roomNo' ? (
                                sortDirection === 'asc' ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />
                              ) : (
                                <ArrowUpDown className="w-4 h-4 opacity-50" />
                              )}
                            </div>
                          </TableHead>
                          <TableHead 
                            className="cursor-pointer hover:bg-muted/50"
                            onClick={() => handleSort('projectName')}
                          >
                            <div className="flex items-center gap-1">
                              Project
                              {sortField === 'projectName' ? (
                                sortDirection === 'asc' ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />
                              ) : (
                                <ArrowUpDown className="w-4 h-4 opacity-50" />
                              )}
                            </div>
                          </TableHead>
                          <TableHead 
                            className="cursor-pointer hover:bg-muted/50"
                            onClick={() => handleSort('meterId')}
                          >
                            <div className="flex items-center gap-1">
                              Meter ID
                              {sortField === 'meterId' ? (
                                sortDirection === 'asc' ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />
                              ) : (
                                <ArrowUpDown className="w-4 h-4 opacity-50" />
                              )}
                            </div>
                          </TableHead>
                          <TableHead 
                            className="cursor-pointer hover:bg-muted/50"
                            onClick={() => handleSort('balance')}
                          >
                            <div className="flex items-center gap-1">
                              Balance
                              {sortField === 'balance' ? (
                                sortDirection === 'asc' ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />
                              ) : (
                                <ArrowUpDown className="w-4 h-4 opacity-50" />
                              )}
                            </div>
                          </TableHead>
                          <TableHead 
                            className="cursor-pointer hover:bg-muted/50"
                            onClick={() => handleSort('readValue')}
                          >
                            <div className="flex items-center gap-1">
                              Reading
                              {sortField === 'readValue' ? (
                                sortDirection === 'asc' ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />
                              ) : (
                                <ArrowUpDown className="w-4 h-4 opacity-50" />
                              )}
                            </div>
                          </TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredMeters.map((meter, index) => {
                          const linkedData = linkedCredentials[meter.roomNo];
                          const meterData = linkedData?.meterData;
                          // Use linked data if available, otherwise use API data
                          const displayBalance = meterData?.balance || meter.balance;
                          const displayReading = meterData?.epi || meter.readValue;
                          const displayStatus = meterData ? {
                            switchSta: meterData.switchSta,
                            unConnnect: meterData.unConnnect,
                            controlMode: meterData.controlMode,
                          } : meter;
                          
                          return (
                            <TableRow key={meter.meterId || meter.roomNo || index}>
                              <TableCell className="font-medium">
                                <div className="flex items-center gap-2">
                                  {meter.roomNo}
                                  {linkedData?.linked && (
                                    <Badge variant="outline" className="text-xs bg-green-50 text-green-700 border-green-200">
                                      <Link2 className="w-3 h-3 mr-1" />
                                      Linked
                                    </Badge>
                                  )}
                                </div>
                              </TableCell>
                              <TableCell className="text-sm">{meter.projectName || '-'}</TableCell>
                              <TableCell className="font-mono text-xs">{meter.meterId || '-'}</TableCell>
                              <TableCell>
                                {displayBalance && parseFloat(displayBalance) > 0 
                                  ? <span className="text-green-600 font-medium">₦{parseFloat(displayBalance).toLocaleString()}</span>
                                  : <span className="text-muted-foreground">₦0</span>}
                              </TableCell>
                              <TableCell className="text-sm">
                                {displayReading ? `${parseFloat(displayReading).toFixed(2)} kWh` : '-'}
                              </TableCell>
                              <TableCell>{getMeterStatusBadge(displayStatus)}</TableCell>
                              <TableCell className="text-right">
                                <div className="flex items-center justify-end gap-1">
                                  {meterData && (
                                    <Button 
                                      variant="outline" 
                                      size="sm"
                                      title="Electrical Details"
                                      onClick={() => {
                                        setDetailsMeter({ ...meter, ...meterData });
                                        setDetailsDialogOpen(true);
                                      }}
                                      className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                                    >
                                      <Info className="w-4 h-4" />
                                    </Button>
                                  )}
                                  <Button 
                                    variant={linkedData?.linked ? "default" : "outline"}
                                    size="sm"
                                    title={linkedData?.linked ? "Account Linked" : "Link Account"}
                                    onClick={() => openLinkDialog(meter)}
                                    className={linkedData?.linked ? "bg-green-600 hover:bg-green-700" : ""}
                                  >
                                    <KeyRound className="w-4 h-4" />
                                  </Button>
                                  <Button 
                                    variant="outline" 
                                    size="sm"
                                    title="Power Control"
                                    onClick={() => {
                                      setSelectedMeter(meter);
                                      setControlDialogOpen(true);
                                    }}
                                    disabled={!meter.meterId}
                                  >
                                    <Power className="w-4 h-4" />
                                  </Button>
                                  <Button 
                                    variant="outline" 
                                    size="sm"
                                    title="Manual Recharge"
                                    onClick={() => {
                                      setSelectedMeter(meter);
                                      setRechargeDialogOpen(true);
                                    }}
                                    disabled={!meter.meterId}
                                  >
                                    <Wallet className="w-4 h-4" />
                                  </Button>
                                </div>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>
                )}
                <div className="mt-4 flex items-center justify-between text-sm text-muted-foreground">
                  <span>Showing {filteredMeters.length} of {meters.length} meters</span>
                  {selectedProjectId && projects.find(p => p.projectId === selectedProjectId) && (
                    <span className="flex items-center gap-1">
                      <Building2 className="w-4 h-4" />
                      {projects.find(p => p.projectId === selectedProjectId)?.projectName}
                    </span>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Transactions Tab */}
          <TabsContent value="transactions" className="space-y-4">
            {/* Transaction Summary */}
            {transactionSummary && (
              <div className="grid gap-4 md:grid-cols-4">
                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-muted-foreground">Total Transactions</p>
                        <p className="text-2xl font-bold">{transactionSummary.totalTransactions}</p>
                      </div>
                      <CreditCard className="w-8 h-8 text-muted-foreground/50" />
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-muted-foreground">Total Amount</p>
                        <p className="text-2xl font-bold">₦{transactionSummary.totalAmount?.toLocaleString()}</p>
                      </div>
                      <DollarSign className="w-8 h-8 text-muted-foreground/50" />
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-muted-foreground">Successful Amount</p>
                        <p className="text-2xl font-bold text-green-500">₦{transactionSummary.successfulAmount?.toLocaleString()}</p>
                      </div>
                      <CheckCircle2 className="w-8 h-8 text-green-500/50" />
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-muted-foreground">Success Rate</p>
                        <p className="text-2xl font-bold">{transactionSummary.successRate}%</p>
                      </div>
                      <TrendingUp className="w-8 h-8 text-muted-foreground/50" />
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            <Card>
              <CardHeader>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <CreditCard className="w-5 h-5" />
                      Transaction History
                    </CardTitle>
                    <CardDescription>All payment transactions on the platform</CardDescription>
                  </div>
                  <div className="flex items-center gap-2">
                    <select 
                      className="px-3 py-2 rounded-md border bg-background text-sm"
                      value={transactionFilter}
                      onChange={(e) => setTransactionFilter(e.target.value)}
                    >
                      <option value="all">All Status</option>
                      <option value="success">Success</option>
                      <option value="pending">Pending</option>
                      <option value="failed">Failed</option>
                    </select>
                    <Button variant="outline" size="icon" onClick={loadTransactions} disabled={transactionsLoading}>
                      <RefreshCw className={`w-4 h-4 ${transactionsLoading ? 'animate-spin' : ''}`} />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {transactionsLoading ? (
                  <div className="flex items-center justify-center py-12">
                    <RefreshCw className="w-8 h-8 animate-spin text-muted-foreground" />
                  </div>
                ) : filteredTransactions.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <CreditCard className="w-16 h-16 mx-auto mb-4 opacity-30" />
                    <p className="text-lg font-medium">No transactions found</p>
                    <p className="text-sm">Transactions will appear here once users make purchases</p>
                  </div>
                ) : (
                  <div className="rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Date</TableHead>
                          <TableHead>Reference</TableHead>
                          <TableHead>Meter ID</TableHead>
                          <TableHead>Amount</TableHead>
                          <TableHead>Status</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredTransactions.map((tx) => (
                          <TableRow key={tx.id}>
                            <TableCell className="text-sm">
                              {format(new Date(tx.created_at), 'MMM d, yyyy HH:mm')}
                            </TableCell>
                            <TableCell className="font-mono text-xs">{tx.paystack_reference}</TableCell>
                            <TableCell className="font-mono text-sm">{tx.meter_id}</TableCell>
                            <TableCell className="font-medium">
                              ₦{(tx.amount_kobo / 100).toLocaleString()}
                            </TableCell>
                            <TableCell>{getStatusBadge(tx.paystack_status)}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Registrations Tab */}
          <TabsContent value="registrations" className="space-y-4">
            {/* Registration Summary */}
            <div className="grid gap-4 md:grid-cols-4">
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Total Registrations</p>
                      <p className="text-2xl font-bold">{registrationCounts.total}</p>
                    </div>
                    <UserPlus className="w-8 h-8 text-muted-foreground/50" />
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Successful</p>
                      <p className="text-2xl font-bold text-green-500">{registrationCounts.success}</p>
                    </div>
                    <CheckCircle2 className="w-8 h-8 text-green-500/50" />
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Pending</p>
                      <p className="text-2xl font-bold text-yellow-500">{registrationCounts.pending}</p>
                    </div>
                    <Clock className="w-8 h-8 text-yellow-500/50" />
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Failed</p>
                      <p className="text-2xl font-bold text-red-500">{registrationCounts.failed}</p>
                    </div>
                    <AlertCircle className="w-8 h-8 text-red-500/50" />
                  </div>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <UserPlus className="w-5 h-5" />
                      Customer Registrations
                    </CardTitle>
                    <CardDescription>New customer sign-ups for prepaid electricity</CardDescription>
                  </div>
                  <div className="flex items-center gap-2">
                    <select 
                      className="px-3 py-2 rounded-md border bg-background text-sm"
                      value={registrationFilter}
                      onChange={(e) => setRegistrationFilter(e.target.value)}
                    >
                      <option value="all">All Status</option>
                      <option value="success">Successful</option>
                      <option value="pending">Pending</option>
                      <option value="failed">Failed</option>
                    </select>
                    <Button variant="outline" size="icon" onClick={loadRegistrations} disabled={registrationsLoading}>
                      <RefreshCw className={`w-4 h-4 ${registrationsLoading ? 'animate-spin' : ''}`} />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {registrationsLoading ? (
                  <div className="flex items-center justify-center py-12">
                    <RefreshCw className="w-8 h-8 animate-spin text-muted-foreground" />
                  </div>
                ) : registrations.filter(r => registrationFilter === 'all' || r.payment_status === registrationFilter).length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <UserPlus className="w-16 h-16 mx-auto mb-4 opacity-30" />
                    <p className="text-lg font-medium">No registrations found</p>
                    <p className="text-sm">Customer sign-ups will appear here</p>
                  </div>
                ) : (
                  <div className="rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Date</TableHead>
                          <TableHead>Name</TableHead>
                          <TableHead>Contact</TableHead>
                          <TableHead>Room / Location</TableHead>
                          <TableHead>Amount</TableHead>
                          <TableHead>Status</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {registrations
                          .filter(r => registrationFilter === 'all' || r.payment_status === registrationFilter)
                          .map((reg) => (
                          <TableRow key={reg.id}>
                            <TableCell className="text-sm">
                              {format(new Date(reg.created_at), 'MMM d, yyyy HH:mm')}
                            </TableCell>
                            <TableCell className="font-medium">{reg.name}</TableCell>
                            <TableCell>
                              <div className="text-sm">
                                <div className="flex items-center gap-1">
                                  <Mail className="w-3 h-3" />
                                  {reg.email}
                                </div>
                                <div className="flex items-center gap-1 text-muted-foreground">
                                  <Phone className="w-3 h-3" />
                                  {reg.phone}
                                </div>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="text-sm">
                                <div>{reg.room_number}</div>
                                <div className="text-muted-foreground flex items-center gap-1">
                                  <MapPin className="w-3 h-3" />
                                  {reg.location_name || reg.location_id}
                                </div>
                              </div>
                            </TableCell>
                            <TableCell className="font-medium">
                              ₦{(reg.amount_paid / 100).toLocaleString()}
                            </TableCell>
                            <TableCell>{getStatusBadge(reg.payment_status)}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Settings Tab */}
          <TabsContent value="settings" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Settings className="w-5 h-5" />
                  System Settings
                </CardTitle>
                <CardDescription>Configure sign-up fees and notification settings</CardDescription>
              </CardHeader>
              <CardContent>
                {settingsLoading ? (
                  <div className="flex items-center justify-center py-12">
                    <RefreshCw className="w-8 h-8 animate-spin text-muted-foreground" />
                  </div>
                ) : (
                  <div className="space-y-6">
                    {/* Sign-up Fee */}
                    <div className="space-y-4">
                      <h3 className="text-lg font-semibold flex items-center gap-2">
                        <DollarSign className="w-5 h-5" />
                        Sign-up Configuration
                      </h3>
                      <div className="grid gap-4 md:grid-cols-2">
                        <div className="space-y-2">
                          <label className="text-sm font-medium">Sign-up / Installation Fee (₦)</label>
                          <Input 
                            type="number"
                            placeholder="2000"
                            value={adminSettings.signup_amount}
                            onChange={(e) => setAdminSettings(prev => ({ ...prev, signup_amount: e.target.value }))}
                          />
                          <p className="text-xs text-muted-foreground">
                            Amount customers pay when signing up (in Naira)
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Email Notification */}
                    <div className="space-y-4 pt-4 border-t">
                      <h3 className="text-lg font-semibold flex items-center gap-2">
                        <Mail className="w-5 h-5" />
                        Email Notifications
                      </h3>
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Admin Email Address</label>
                        <Input 
                          type="email"
                          placeholder="admin@example.com"
                          value={adminSettings.admin_email}
                          onChange={(e) => setAdminSettings(prev => ({ ...prev, admin_email: e.target.value }))}
                        />
                        <p className="text-xs text-muted-foreground">
                          Email to receive notifications for new registrations
                        </p>
                      </div>
                    </div>

                    {/* WhatsApp Notification */}
                    <div className="space-y-4 pt-4 border-t">
                      <h3 className="text-lg font-semibold flex items-center gap-2">
                        <Phone className="w-5 h-5" />
                        WhatsApp Notifications (UltraMsg)
                      </h3>
                      <div className="grid gap-4 md:grid-cols-2">
                        <div className="space-y-2">
                          <label className="text-sm font-medium">Admin WhatsApp Number</label>
                          <Input 
                            type="text"
                            placeholder="+2347035090096"
                            value={adminSettings.admin_whatsapp}
                            onChange={(e) => setAdminSettings(prev => ({ ...prev, admin_whatsapp: e.target.value }))}
                          />
                          <p className="text-xs text-muted-foreground">
                            WhatsApp number to receive notifications (with country code)
                          </p>
                        </div>
                        <div className="space-y-2">
                          <label className="text-sm font-medium">UltraMsg Instance ID</label>
                          <Input 
                            type="text"
                            placeholder="instance123"
                            value={adminSettings.ultramsg_instance_id}
                            onChange={(e) => setAdminSettings(prev => ({ ...prev, ultramsg_instance_id: e.target.value }))}
                          />
                        </div>
                        <div className="space-y-2 md:col-span-2">
                          <label className="text-sm font-medium">UltraMsg API Token</label>
                          <Input 
                            type="password"
                            placeholder="Your UltraMsg token"
                            value={adminSettings.ultramsg_token}
                            onChange={(e) => setAdminSettings(prev => ({ ...prev, ultramsg_token: e.target.value }))}
                          />
                          <p className="text-xs text-muted-foreground">
                            Get your UltraMsg credentials from{' '}
                            <a href="https://ultramsg.com" target="_blank" rel="noopener noreferrer" className="text-primary underline">
                              ultramsg.com
                            </a>
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Save Button */}
                    <div className="pt-4 border-t flex justify-end">
                      <Button onClick={saveSettings} disabled={savingSettings}>
                        {savingSettings ? (
                          <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                        ) : (
                          <Save className="w-4 h-4 mr-2" />
                        )}
                        Save Settings
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

        </Tabs>
      </main>

      {/* Control Dialog */}
      <Dialog open={controlDialogOpen} onOpenChange={setControlDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Meter Control</DialogTitle>
            <DialogDescription>
              Control power for meter {selectedMeter?.roomNo} ({selectedMeter?.meterId})
            </DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-3 gap-4 py-4">
            <Button 
              variant="outline" 
              className="flex flex-col items-center py-6 hover:bg-green-500/10 hover:border-green-500"
              onClick={() => handleMeterControl(1)}
              disabled={isProcessing}
            >
              <Power className="w-8 h-8 text-green-500 mb-2" />
              <span>Turn On</span>
            </Button>
            <Button 
              variant="outline" 
              className="flex flex-col items-center py-6 hover:bg-red-500/10 hover:border-red-500"
              onClick={() => handleMeterControl(0)}
              disabled={isProcessing}
            >
              <PowerOff className="w-8 h-8 text-red-500 mb-2" />
              <span>Turn Off</span>
            </Button>
            <Button 
              variant="outline" 
              className="flex flex-col items-center py-6 hover:bg-blue-500/10 hover:border-blue-500"
              onClick={() => handleMeterControl(2)}
              disabled={isProcessing}
            >
              <RefreshCw className="w-8 h-8 text-blue-500 mb-2" />
              <span>Prepaid</span>
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Recharge Dialog */}
      <Dialog open={rechargeDialogOpen} onOpenChange={setRechargeDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Manual Recharge</DialogTitle>
            <DialogDescription>
              Credit meter {selectedMeter?.roomNo} ({selectedMeter?.meterId})
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <label className="text-sm font-medium">Amount (₦)</label>
              <Input 
                type="number"
                placeholder="Enter amount in Naira"
                value={rechargeAmount}
                onChange={(e) => setRechargeAmount(e.target.value)}
              />
            </div>
            <div>
              <label className="text-sm font-medium">Note (Optional)</label>
              <Input 
                placeholder="Reason for manual recharge"
                value={rechargeNote}
                onChange={(e) => setRechargeNote(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRechargeDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleRecharge} disabled={isProcessing || !rechargeAmount}>
              {isProcessing ? (
                <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Wallet className="w-4 h-4 mr-2" />
              )}
              Recharge
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Link Account Dialog */}
      <Dialog open={linkDialogOpen} onOpenChange={setLinkDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <KeyRound className="w-5 h-5" />
              Link User Account
            </DialogTitle>
            <DialogDescription>
              Enter the IoT platform credentials for {selectedMeter?.roomNo} to sync detailed meter data.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Username</label>
              <Input 
                placeholder="e.g., flat1"
                value={linkUsername}
                onChange={(e) => setLinkUsername(e.target.value)}
                autoComplete="off"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Password</label>
              <div className="relative">
                <Input 
                  type={showPassword ? "text" : "password"}
                  placeholder="Enter password"
                  value={linkPassword}
                  onChange={(e) => setLinkPassword(e.target.value)}
                  autoComplete="off"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? (
                    <EyeOff className="w-4 h-4 text-muted-foreground" />
                  ) : (
                    <Eye className="w-4 h-4 text-muted-foreground" />
                  )}
                </Button>
              </div>
            </div>
            {linkedCredentials[selectedMeter?.roomNo || '']?.linked && (
              <div className="rounded-md bg-green-50 border border-green-200 p-3">
                <div className="flex items-center gap-2 text-green-700 text-sm">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>This meter is already linked. Saving will update credentials.</span>
                </div>
                <p className="text-xs text-green-600 mt-1">
                  Last synced: {linkedCredentials[selectedMeter?.roomNo || '']?.lastSyncAt 
                    ? format(new Date(linkedCredentials[selectedMeter?.roomNo || '']?.lastSyncAt), 'MMM d, yyyy HH:mm')
                    : 'Never'}
                </p>
              </div>
            )}
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setLinkDialogOpen(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleLinkAccount} 
              disabled={isLinking || !linkUsername || !linkPassword}
            >
              {isLinking ? (
                <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Link2 className="w-4 h-4 mr-2" />
              )}
              {linkedCredentials[selectedMeter?.roomNo || '']?.linked ? 'Update & Sync' : 'Link & Sync'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Meter Details Dialog */}
      <Dialog open={detailsDialogOpen} onOpenChange={setDetailsDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CircuitBoard className="w-5 h-5" />
              Meter Details - {detailsMeter?.roomNo}
            </DialogTitle>
            <DialogDescription>
              Electrical parameters and meter information
            </DialogDescription>
          </DialogHeader>
          
          {detailsMeter && (
            <div className="space-y-4 py-4">
              {/* Basic Info */}
              <div className="grid grid-cols-2 gap-4 p-3 bg-muted/50 rounded-lg">
                <div>
                  <p className="text-xs text-muted-foreground">Meter ID</p>
                  <p className="font-mono font-medium">{detailsMeter.meterId || '-'}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Model</p>
                  <p className="font-medium">{detailsMeter.model || '-'}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">CT Ratio</p>
                  <p className="font-medium">{detailsMeter.ct || 1}:1</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Last Update</p>
                  <p className="font-medium text-sm">{detailsMeter.createTime || '-'}</p>
                </div>
              </div>

              {/* Electrical Parameters */}
              <div className="space-y-3">
                <h4 className="text-sm font-semibold flex items-center gap-2">
                  <Bolt className="w-4 h-4 text-yellow-500" />
                  Electrical Parameters
                </h4>
                
                {/* Power */}
                <div className="p-3 border rounded-lg">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Active Power</span>
                    <span className="font-mono text-lg font-bold">
                      {detailsMeter.p && detailsMeter.p !== '--' 
                        ? `${parseFloat(detailsMeter.p).toFixed(3)} kW` 
                        : '-- kW'}
                    </span>
                  </div>
                </div>

                {/* Voltage */}
                <div className="p-3 border rounded-lg space-y-2">
                  <p className="text-sm font-medium text-muted-foreground">Voltage (V)</p>
                  <div className="grid grid-cols-3 gap-2">
                    <div className="text-center p-2 bg-blue-50 rounded">
                      <p className="text-xs text-blue-600">Phase A</p>
                      <p className="font-mono font-bold text-blue-700">
                        {detailsMeter.ua && detailsMeter.ua !== '--' ? detailsMeter.ua : '--'}
                      </p>
                    </div>
                    <div className="text-center p-2 bg-green-50 rounded">
                      <p className="text-xs text-green-600">Phase B</p>
                      <p className="font-mono font-bold text-green-700">
                        {detailsMeter.ub && detailsMeter.ub !== '--' ? detailsMeter.ub : '--'}
                      </p>
                    </div>
                    <div className="text-center p-2 bg-orange-50 rounded">
                      <p className="text-xs text-orange-600">Phase C</p>
                      <p className="font-mono font-bold text-orange-700">
                        {detailsMeter.uc && detailsMeter.uc !== '--' ? detailsMeter.uc : '--'}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Current */}
                <div className="p-3 border rounded-lg space-y-2">
                  <p className="text-sm font-medium text-muted-foreground">Current (A)</p>
                  <div className="grid grid-cols-3 gap-2">
                    <div className="text-center p-2 bg-blue-50 rounded">
                      <p className="text-xs text-blue-600">Phase A</p>
                      <p className="font-mono font-bold text-blue-700">
                        {detailsMeter.ia && detailsMeter.ia !== '--' ? detailsMeter.ia : '--'}
                      </p>
                    </div>
                    <div className="text-center p-2 bg-green-50 rounded">
                      <p className="text-xs text-green-600">Phase B</p>
                      <p className="font-mono font-bold text-green-700">
                        {detailsMeter.ib && detailsMeter.ib !== '--' ? detailsMeter.ib : '--'}
                      </p>
                    </div>
                    <div className="text-center p-2 bg-orange-50 rounded">
                      <p className="text-xs text-orange-600">Phase C</p>
                      <p className="font-mono font-bold text-orange-700">
                        {detailsMeter.ic && detailsMeter.ic !== '--' ? detailsMeter.ic : '--'}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Energy & Balance */}
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 border rounded-lg">
                  <p className="text-xs text-muted-foreground">Total Energy</p>
                  <p className="font-mono text-lg font-bold text-primary">
                    {detailsMeter.epi ? `${parseFloat(detailsMeter.epi).toFixed(2)} kWh` : '-- kWh'}
                  </p>
                </div>
                <div className="p-3 border rounded-lg">
                  <p className="text-xs text-muted-foreground">Balance</p>
                  <p className="font-mono text-lg font-bold text-green-600">
                    ₦{detailsMeter.balance ? parseFloat(detailsMeter.balance).toLocaleString() : '0'}
                  </p>
                </div>
              </div>

              {/* Pricing */}
              <div className="p-3 border rounded-lg">
                <p className="text-sm font-medium text-muted-foreground mb-2">Energy Price (₦/kWh)</p>
                <div className="grid grid-cols-4 gap-2 text-center text-xs">
                  <div>
                    <p className="text-muted-foreground">Sharp</p>
                    <p className="font-mono font-medium">{detailsMeter.priceSharp || '-'}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Peak</p>
                    <p className="font-mono font-medium">{detailsMeter.pricePeak || '-'}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Flat</p>
                    <p className="font-mono font-medium">{detailsMeter.priceFlat || '-'}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Valley</p>
                    <p className="font-mono font-medium">{detailsMeter.priceValley || '-'}</p>
                  </div>
                </div>
              </div>
            </div>
          )}
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setDetailsDialogOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
