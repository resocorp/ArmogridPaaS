'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Building2,
  Zap,
  DollarSign,
  Activity,
  CreditCard,
  RefreshCw,
  ArrowUpRight,
  Wallet,
  Gauge,
  Wifi,
} from 'lucide-react';
import Link from 'next/link';
import { format } from 'date-fns';
import type { Stats, ActivityItem } from './types';

interface AdminOverviewProps {
  stats: Stats | null;
  statsLoading: boolean;
  activities: ActivityItem[];
  activitiesLoading: boolean;
  onRefresh: () => void;
  onLoadActivities: () => void;
  onNavigate: (tab: string) => void;
}

export function AdminOverview({
  stats,
  statsLoading,
  activities,
  activitiesLoading,
  onRefresh,
  onLoadActivities,
  onNavigate,
}: AdminOverviewProps) {
  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="relative overflow-hidden">
          <div className="absolute top-0 right-0 w-20 h-20 bg-blue-500/10 rounded-full -mr-10 -mt-10" />
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
          <div className="absolute top-0 right-0 w-20 h-20 bg-yellow-500/10 rounded-full -mr-10 -mt-10" />
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
          <div className="absolute top-0 right-0 w-20 h-20 bg-green-500/10 rounded-full -mr-10 -mt-10" />
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
          <div className="absolute top-0 right-0 w-20 h-20 bg-purple-500/10 rounded-full -mr-10 -mt-10" />
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
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Wallet className="w-5 h-5" />
              Quick Actions
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button className="w-full justify-start" variant="outline" onClick={() => onNavigate('meters')}>
              <Zap className="w-4 h-4 mr-2" />
              Manage Meters
            </Button>
            <Button className="w-full justify-start" variant="outline" onClick={() => onNavigate('transactions')}>
              <CreditCard className="w-4 h-4 mr-2" />
              View Transactions
            </Button>
            <Button
              className="w-full justify-start"
              variant="outline"
              onClick={onRefresh}
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

        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Activity className="w-5 h-5" />
              Recent Activity
            </CardTitle>
            <Button variant="ghost" size="sm" onClick={onLoadActivities} disabled={activitiesLoading}>
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
                    <div
                      key={activity.id}
                      className="flex items-start gap-3 p-3 rounded-lg border bg-card hover:bg-muted/50 transition-colors"
                    >
                      <div
                        className={`p-2 rounded-full ${
                          activity.status === 'success' || activity.status === 'processed'
                            ? 'bg-green-500/10'
                            : activity.status === 'pending'
                            ? 'bg-yellow-500/10'
                            : 'bg-red-500/10'
                        }`}
                      >
                        {activity.type === 'transaction' ? (
                          <CreditCard
                            className={`w-4 h-4 ${
                              activity.status === 'success'
                                ? 'text-green-500'
                                : activity.status === 'pending'
                                ? 'text-yellow-500'
                                : 'text-red-500'
                            }`}
                          />
                        ) : (
                          <Wifi
                            className={`w-4 h-4 ${
                              activity.status === 'processed' ? 'text-green-500' : 'text-yellow-500'
                            }`}
                          />
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
    </div>
  );
}
