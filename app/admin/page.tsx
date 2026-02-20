'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Shield, LogOut, BarChart3, Zap, CreditCard, Users, Bell, Settings } from 'lucide-react';
import { toast } from 'sonner';
import { AdminAnalytics } from '@/components/admin-analytics';
import { AdminSmsSettings } from '@/components/admin-sms-settings';
import { AdminPaymentSettings } from '@/components/admin-payment-settings';
import { AdminOverview } from '@/components/admin/admin-overview';
import { AdminMetersTab } from '@/components/admin/admin-meters-tab';
import { AdminTransactionsTab } from '@/components/admin/admin-transactions-tab';
import { AdminRegistrationsTab } from '@/components/admin/admin-registrations-tab';
import { AdminSettingsTab } from '@/components/admin/admin-settings-tab';
import type { Stats, ActivityItem, Project } from '@/components/admin/types';

export default function AdminPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');
  const [stats, setStats] = useState<Stats | null>(null);
  const [statsLoading, setStatsLoading] = useState(false);
  const [projects, setProjects] = useState<Project[]>([]);
  const [projectsLoading, setProjectsLoading] = useState(false);
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [activitiesLoading, setActivitiesLoading] = useState(false);

  useEffect(() => {
    checkAdminAuth();
  }, []);

  const checkAdminAuth = async () => {
    try {
      const response = await fetch('/api/auth/me');
      const data = await response.json();
      if (!response.ok || !data.success) { router.push('/login'); return; }
      if (data.data.userType !== 0) { toast.error('Admin access required'); router.push('/dashboard'); return; }
      setIsAdmin(true);
      loadStats();
      loadActivities();
    } catch {
      router.push('/login');
    } finally {
      setIsLoading(false);
    }
  };

  const loadStats = async () => {
    setStatsLoading(true);
    try {
      const res = await fetch('/api/admin/stats');
      const data = await res.json();
      if (data.success) setStats(data.data);
    } catch { /* silent */ }
    finally { setStatsLoading(false); }
  };

  const loadProjects = async () => {
    setProjectsLoading(true);
    try {
      const res = await fetch('/api/admin/projects');
      const data = await res.json();
      if (data.success) setProjects(data.data);
      else toast.error('Failed to load projects');
    } catch { toast.error('Failed to load projects'); }
    finally { setProjectsLoading(false); }
  };

  const loadActivities = async () => {
    setActivitiesLoading(true);
    try {
      const res = await fetch('/api/admin/activity?limit=20');
      const data = await res.json();
      if (data.success) setActivities(data.data);
    } catch { /* silent */ }
    finally { setActivitiesLoading(false); }
  };

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      router.push('/');
    } catch { router.push('/'); }
  };

  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
    if (tab === 'meters' && projects.length === 0) loadProjects();
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center space-y-4">
          <Shield className="w-12 h-12 mx-auto text-primary animate-pulse" />
          <p className="text-muted-foreground">Verifying admin access...</p>
        </div>
      </div>
    );
  }

  if (!isAdmin) return null;

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card sticky top-0 z-10">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-lg">
              <Shield className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h1 className="font-bold text-lg">Admin Panel</h1>
              <p className="text-xs text-muted-foreground">ArmogridSolar Management</p>
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={handleLogout}>
            <LogOut className="w-4 h-4 mr-2" />Logout
          </Button>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6">
        <Tabs value={activeTab} onValueChange={handleTabChange}>
          <TabsList className="grid w-full grid-cols-4 lg:grid-cols-8 mb-6">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="analytics"><BarChart3 className="w-4 h-4 sm:mr-1" /><span className="hidden sm:inline">Analytics</span></TabsTrigger>
            <TabsTrigger value="meters"><Zap className="w-4 h-4 sm:mr-1" /><span className="hidden sm:inline">Meters</span></TabsTrigger>
            <TabsTrigger value="transactions"><CreditCard className="w-4 h-4 sm:mr-1" /><span className="hidden sm:inline">Transactions</span></TabsTrigger>
            <TabsTrigger value="registrations"><Users className="w-4 h-4 sm:mr-1" /><span className="hidden sm:inline">Registrations</span></TabsTrigger>
            <TabsTrigger value="notifications"><Bell className="w-4 h-4 sm:mr-1" /><span className="hidden sm:inline">SMS</span></TabsTrigger>
            <TabsTrigger value="payments"><CreditCard className="w-4 h-4 sm:mr-1" /><span className="hidden sm:inline">Payments</span></TabsTrigger>
            <TabsTrigger value="settings"><Settings className="w-4 h-4 sm:mr-1" /><span className="hidden sm:inline">Settings</span></TabsTrigger>
          </TabsList>

          <TabsContent value="overview">
            <AdminOverview
              stats={stats}
              statsLoading={statsLoading}
              activities={activities}
              activitiesLoading={activitiesLoading}
              onRefresh={() => { loadStats(); loadActivities(); }}
              onLoadActivities={loadActivities}
              onNavigate={handleTabChange}
            />
          </TabsContent>

          <TabsContent value="analytics">
            <AdminAnalytics />
          </TabsContent>

          <TabsContent value="meters">
            <AdminMetersTab
              projects={projects}
              projectsLoading={projectsLoading}
              onLoadProjects={loadProjects}
            />
          </TabsContent>

          <TabsContent value="transactions">
            <AdminTransactionsTab />
          </TabsContent>

          <TabsContent value="registrations">
            <AdminRegistrationsTab />
          </TabsContent>

          <TabsContent value="notifications">
            <AdminSmsSettings />
          </TabsContent>

          <TabsContent value="payments">
            <AdminPaymentSettings />
          </TabsContent>

          <TabsContent value="settings">
            <AdminSettingsTab />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
