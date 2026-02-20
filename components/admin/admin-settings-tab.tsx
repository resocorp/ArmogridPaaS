'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Settings, RefreshCw, DollarSign, Mail, Phone, Save } from 'lucide-react';
import { toast } from 'sonner';
import type { AdminSettings } from './types';

const DEFAULT_SETTINGS: AdminSettings = {
  signup_amount: '2000',
  admin_email: '',
  admin_whatsapp: '',
  ultramsg_instance_id: '',
  ultramsg_token: '',
};

export function AdminSettingsTab() {
  const [adminSettings, setAdminSettings] = useState<AdminSettings>(DEFAULT_SETTINGS);
  const [settingsLoading, setSettingsLoading] = useState(false);
  const [savingSettings, setSavingSettings] = useState(false);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    setSettingsLoading(true);
    try {
      const res = await fetch('/api/admin/settings');
      const data = await res.json();
      if (data.success) {
        setAdminSettings({
          signup_amount: data.data.signup_amount || '2000',
          admin_email: data.data.admin_email || '',
          admin_whatsapp: data.data.admin_whatsapp || '',
          ultramsg_instance_id: data.data.ultramsg_instance_id || '',
          ultramsg_token: data.data.ultramsg_token || '',
        });
      }
    } catch {
      toast.error('Failed to load settings');
    } finally {
      setSettingsLoading(false);
    }
  };

  const saveSettings = async () => {
    setSavingSettings(true);
    try {
      const res = await fetch('/api/admin/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ settings: adminSettings }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success('Settings saved successfully');
      } else {
        toast.error(data.error || 'Failed to save settings');
      }
    } catch {
      toast.error('Failed to save settings');
    } finally {
      setSavingSettings(false);
    }
  };

  const set = (key: keyof AdminSettings) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setAdminSettings(prev => ({ ...prev, [key]: e.target.value }));

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Settings className="w-5 h-5" />System Settings
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
            <div className="space-y-4">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <DollarSign className="w-5 h-5" />Sign-up Configuration
              </h3>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Sign-up / Installation Fee (₦)</label>
                  <Input type="number" placeholder="2000" value={adminSettings.signup_amount} onChange={set('signup_amount')} />
                  <p className="text-xs text-muted-foreground">Amount customers pay when signing up (in Naira)</p>
                </div>
              </div>
            </div>

            <div className="space-y-4 pt-4 border-t">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <Mail className="w-5 h-5" />Email Notifications
              </h3>
              <div className="space-y-2">
                <label className="text-sm font-medium">Admin Email Address</label>
                <Input type="email" placeholder="admin@example.com" value={adminSettings.admin_email} onChange={set('admin_email')} />
                <p className="text-xs text-muted-foreground">Email to receive notifications for new registrations</p>
              </div>
            </div>

            <div className="space-y-4 pt-4 border-t">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <Phone className="w-5 h-5" />WhatsApp Notifications (UltraMsg)
              </h3>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Admin WhatsApp Number</label>
                  <Input type="text" placeholder="+234..." value={adminSettings.admin_whatsapp} onChange={set('admin_whatsapp')} />
                  <p className="text-xs text-muted-foreground">WhatsApp number to receive notifications (with country code)</p>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">UltraMsg Instance ID</label>
                  <Input type="text" placeholder="instance123" value={adminSettings.ultramsg_instance_id} onChange={set('ultramsg_instance_id')} />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <label className="text-sm font-medium">UltraMsg API Token</label>
                  <Input type="password" placeholder="Your UltraMsg token" value={adminSettings.ultramsg_token} onChange={set('ultramsg_token')} />
                  <p className="text-xs text-muted-foreground">
                    Get your UltraMsg credentials from{' '}
                    <a href="https://ultramsg.com" target="_blank" rel="noopener noreferrer" className="text-primary underline">ultramsg.com</a>
                  </p>
                </div>
              </div>
            </div>

            <div className="pt-4 border-t flex justify-end">
              <Button onClick={saveSettings} disabled={savingSettings}>
                {savingSettings ? <RefreshCw className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                Save Settings
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
