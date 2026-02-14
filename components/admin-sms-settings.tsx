'use client';

import { useEffect, useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  MessageSquare,
  Send,
  Settings,
  FileText,
  History,
  RefreshCw,
  CheckCircle2,
  XCircle,
  Clock,
  Phone,
  Save,
  TestTube,
  AlertTriangle,
  Bell,
  Users,
  Zap,
  CreditCard,
  Power,
  Eye,
  EyeOff,
} from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';

interface SmsConfig {
  serverUrl: string;
  username: string;
  password: string;
  goipProvider: string;
  goipLine: string;
  enabled: boolean;
}

interface SmsSettings {
  admin_phone: string;
  admin_phone_2: string;
  admin_phone_3: string;
  low_credit_threshold: string;
  sms_welcome_enabled: string;
  sms_payment_enabled: string;
  sms_low_credit_enabled: string;
  sms_meter_offline_enabled: string;
}

interface SmsLog {
  id: string;
  phone_number: string;
  message: string;
  notification_type: string;
  status: string;
  error?: string;
  response?: string;
  created_at: string;
}

interface SmsTemplate {
  id: string;
  name: string;
  type: string;
  notification_type: string;
  template: string;
  enabled: boolean;
  description?: string;
}

export function AdminSmsSettings() {
  const [activeTab, setActiveTab] = useState('config');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  
  // Config state
  const [config, setConfig] = useState<SmsConfig>({
    serverUrl: '',
    username: '',
    password: '',
    goipProvider: '',
    goipLine: '',
    enabled: false,
  });
  
  // Settings state
  const [settings, setSettings] = useState<SmsSettings>({
    admin_phone: '',
    admin_phone_2: '',
    admin_phone_3: '',
    low_credit_threshold: '500',
    sms_welcome_enabled: 'true',
    sms_payment_enabled: 'true',
    sms_low_credit_enabled: 'true',
    sms_meter_offline_enabled: 'true',
  });
  
  // Test SMS state
  const [testPhone, setTestPhone] = useState('');
  const [testResult, setTestResult] = useState<{ success?: boolean; message?: string } | null>(null);
  
  // Custom SMS state
  const [customPhone, setCustomPhone] = useState('');
  const [customMessage, setCustomMessage] = useState('');
  
  // Logs state
  const [logs, setLogs] = useState<SmsLog[]>([]);
  const [logCounts, setLogCounts] = useState({ total: 0, sent: 0, failed: 0, pending: 0 });
  const [logsLoading, setLogsLoading] = useState(false);
  
  // Templates state
  const [templates, setTemplates] = useState<SmsTemplate[]>([]);
  const [templatesLoading, setTemplatesLoading] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<SmsTemplate | null>(null);

  const loadConfig = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/admin/sms');
      const data = await response.json();
      
      if (data.success) {
        setConfig({
          serverUrl: data.config.serverUrl || '',
          username: data.config.username || '',
          password: '', // Don't show masked password
          goipProvider: data.config.goipProvider || '',
          goipLine: data.config.goipLine || '',
          enabled: data.config.enabled,
        });
        setSettings({
          admin_phone: data.settings.admin_phone || '',
          admin_phone_2: data.settings.admin_phone_2 || '',
          admin_phone_3: data.settings.admin_phone_3 || '',
          low_credit_threshold: data.settings.low_credit_threshold || '500',
          sms_welcome_enabled: data.settings.sms_welcome_enabled || 'true',
          sms_payment_enabled: data.settings.sms_payment_enabled || 'true',
          sms_low_credit_enabled: data.settings.sms_low_credit_enabled || 'true',
          sms_meter_offline_enabled: data.settings.sms_meter_offline_enabled || 'true',
        });
      }
    } catch (error) {
      console.error('Failed to load SMS config:', error);
      toast.error('Failed to load SMS configuration');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const loadLogs = useCallback(async () => {
    setLogsLoading(true);
    try {
      const response = await fetch('/api/admin/sms?action=logs&limit=100');
      const data = await response.json();
      
      if (data.success) {
        setLogs(data.data || []);
        setLogCounts(data.counts || { total: 0, sent: 0, failed: 0, pending: 0 });
      }
    } catch (error) {
      console.error('Failed to load SMS logs:', error);
    } finally {
      setLogsLoading(false);
    }
  }, []);

  const loadTemplates = useCallback(async () => {
    setTemplatesLoading(true);
    try {
      const response = await fetch('/api/admin/sms/templates');
      const data = await response.json();
      
      if (data.success) {
        setTemplates(data.data || []);
      }
    } catch (error) {
      console.error('Failed to load templates:', error);
    } finally {
      setTemplatesLoading(false);
    }
  }, []);

  useEffect(() => {
    loadConfig();
  }, [loadConfig]);

  useEffect(() => {
    if (activeTab === 'logs') {
      loadLogs();
    } else if (activeTab === 'templates') {
      loadTemplates();
    }
  }, [activeTab, loadLogs, loadTemplates]);

  const saveSettings = async () => {
    setIsSaving(true);
    try {
      const allSettings: Record<string, string> = {
        sms_enabled: config.enabled.toString(),
        sms_server_url: config.serverUrl,
        sms_username: config.username,
        sms_goip_provider: config.goipProvider,
        sms_goip_line: config.goipLine,
        ...settings,
      };
      
      // Only include password if it's been changed
      if (config.password && config.password !== '********') {
        allSettings.sms_password = config.password;
      }

      const response = await fetch('/api/admin/sms', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ settings: allSettings }),
      });

      const data = await response.json();
      
      if (data.success) {
        toast.success('SMS settings saved successfully');
      } else {
        toast.error(data.error || 'Failed to save settings');
      }
    } catch (error) {
      console.error('Failed to save settings:', error);
      toast.error('Failed to save settings');
    } finally {
      setIsSaving(false);
    }
  };

  const sendTestSms = async () => {
    if (!testPhone) {
      toast.error('Please enter a phone number');
      return;
    }

    setIsTesting(true);
    setTestResult(null);
    
    try {
      const response = await fetch('/api/admin/sms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'test', phoneNumber: testPhone }),
      });

      const data = await response.json();
      setTestResult({ success: data.success, message: data.message || data.error });
      
      if (data.success) {
        toast.success('Test SMS sent successfully');
      } else {
        toast.error(data.error || 'Failed to send test SMS');
      }
    } catch (error) {
      console.error('Failed to send test SMS:', error);
      setTestResult({ success: false, message: 'Network error' });
      toast.error('Failed to send test SMS');
    } finally {
      setIsTesting(false);
    }
  };

  const sendCustomSms = async () => {
    if (!customPhone || !customMessage) {
      toast.error('Please enter phone number and message');
      return;
    }

    setIsTesting(true);
    
    try {
      const response = await fetch('/api/admin/sms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'send', phoneNumber: customPhone, message: customMessage }),
      });

      const data = await response.json();
      
      if (data.success) {
        toast.success('SMS sent successfully');
        setCustomMessage('');
        loadLogs();
      } else {
        toast.error(data.error || 'Failed to send SMS');
      }
    } catch (error) {
      console.error('Failed to send SMS:', error);
      toast.error('Failed to send SMS');
    } finally {
      setIsTesting(false);
    }
  };

  const updateTemplate = async (template: SmsTemplate) => {
    try {
      const response = await fetch('/api/admin/sms/templates', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: template.id,
          template: template.template,
          enabled: template.enabled,
        }),
      });

      const data = await response.json();
      
      if (data.success) {
        toast.success('Template updated');
        setEditingTemplate(null);
        loadTemplates();
      } else {
        toast.error(data.error || 'Failed to update template');
      }
    } catch (error) {
      console.error('Failed to update template:', error);
      toast.error('Failed to update template');
    }
  };

  const getNotificationTypeIcon = (type: string) => {
    switch (type) {
      case 'welcome':
        return <Users className="w-4 h-4 text-blue-500" />;
      case 'low_credit':
        return <AlertTriangle className="w-4 h-4 text-yellow-500" />;
      case 'payment_success':
      case 'account_credited':
        return <CreditCard className="w-4 h-4 text-green-500" />;
      case 'meter_offline':
        return <Power className="w-4 h-4 text-red-500" />;
      case 'meter_online':
        return <Zap className="w-4 h-4 text-green-500" />;
      default:
        return <MessageSquare className="w-4 h-4 text-gray-500" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'sent':
        return <Badge className="bg-green-500/10 text-green-500 border-green-500/20"><CheckCircle2 className="w-3 h-3 mr-1" />Sent</Badge>;
      case 'failed':
        return <Badge className="bg-red-500/10 text-red-500 border-red-500/20"><XCircle className="w-3 h-3 mr-1" />Failed</Badge>;
      case 'pending':
        return <Badge className="bg-yellow-500/10 text-yellow-500 border-yellow-500/20"><Clock className="w-3 h-3 mr-1" />Pending</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <RefreshCw className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <MessageSquare className="w-6 h-6" />
            SMS Notifications
          </h2>
          <p className="text-muted-foreground">Configure and manage SMS notifications via GoIP</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2">
            <Label htmlFor="sms-enabled">SMS Enabled</Label>
            <Switch
              id="sms-enabled"
              checked={config.enabled}
              onCheckedChange={(checked) => setConfig({ ...config, enabled: checked })}
            />
          </div>
          <Button onClick={saveSettings} disabled={isSaving}>
            {isSaving ? <RefreshCw className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
            Save Settings
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full max-w-md grid-cols-4">
          <TabsTrigger value="config" className="flex items-center gap-2">
            <Settings className="w-4 h-4" />
            Config
          </TabsTrigger>
          <TabsTrigger value="test" className="flex items-center gap-2">
            <TestTube className="w-4 h-4" />
            Test
          </TabsTrigger>
          <TabsTrigger value="templates" className="flex items-center gap-2">
            <FileText className="w-4 h-4" />
            Templates
          </TabsTrigger>
          <TabsTrigger value="logs" className="flex items-center gap-2">
            <History className="w-4 h-4" />
            Logs
          </TabsTrigger>
        </TabsList>

        {/* Configuration Tab */}
        <TabsContent value="config" className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2">
            {/* GoIP Server Settings */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">GoIP Server Settings</CardTitle>
                <CardDescription>Configure your GoIP SMS server connection</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="server-url">Server URL</Label>
                  <Input
                    id="server-url"
                    placeholder="http://159.65.59.78/goip/en/index.php"
                    value={config.serverUrl}
                    onChange={(e) => setConfig({ ...config, serverUrl: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="username">Username</Label>
                  <Input
                    id="username"
                    placeholder="armogrid"
                    value={config.username}
                    onChange={(e) => setConfig({ ...config, username: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      placeholder="Enter password (leave empty to keep current)"
                      value={config.password}
                      onChange={(e) => setConfig({ ...config, password: e.target.value })}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </Button>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="provider">GoIP Provider</Label>
                    <Input
                      id="provider"
                      placeholder="phsweb"
                      value={config.goipProvider}
                      onChange={(e) => setConfig({ ...config, goipProvider: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="line">GoIP Line</Label>
                    <Input
                      id="line"
                      placeholder="goip-10102"
                      value={config.goipLine}
                      onChange={(e) => setConfig({ ...config, goipLine: e.target.value })}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Admin Alert Settings */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Admin Alert Numbers</CardTitle>
                <CardDescription>Phone numbers to receive admin alerts</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="admin-phone">Primary Admin Phone</Label>
                  <Input
                    id="admin-phone"
                    placeholder="+2348012345678"
                    value={settings.admin_phone}
                    onChange={(e) => setSettings({ ...settings, admin_phone: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="admin-phone-2">Secondary Admin Phone</Label>
                  <Input
                    id="admin-phone-2"
                    placeholder="+2348012345678"
                    value={settings.admin_phone_2}
                    onChange={(e) => setSettings({ ...settings, admin_phone_2: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="admin-phone-3">Tertiary Admin Phone</Label>
                  <Input
                    id="admin-phone-3"
                    placeholder="+2348012345678"
                    value={settings.admin_phone_3}
                    onChange={(e) => setSettings({ ...settings, admin_phone_3: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="low-credit">Low Credit Threshold (₦)</Label>
                  <Input
                    id="low-credit"
                    type="number"
                    placeholder="500"
                    value={settings.low_credit_threshold}
                    onChange={(e) => setSettings({ ...settings, low_credit_threshold: e.target.value })}
                  />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Notification Toggles */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Notification Types</CardTitle>
              <CardDescription>Enable or disable specific notification types</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <div className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center gap-2">
                    <Users className="w-4 h-4 text-blue-500" />
                    <Label>Welcome SMS</Label>
                  </div>
                  <Switch
                    checked={settings.sms_welcome_enabled === 'true'}
                    onCheckedChange={(checked) => setSettings({ ...settings, sms_welcome_enabled: checked.toString() })}
                  />
                </div>
                <div className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center gap-2">
                    <CreditCard className="w-4 h-4 text-green-500" />
                    <Label>Payment SMS</Label>
                  </div>
                  <Switch
                    checked={settings.sms_payment_enabled === 'true'}
                    onCheckedChange={(checked) => setSettings({ ...settings, sms_payment_enabled: checked.toString() })}
                  />
                </div>
                <div className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-yellow-500" />
                    <Label>Low Credit SMS</Label>
                  </div>
                  <Switch
                    checked={settings.sms_low_credit_enabled === 'true'}
                    onCheckedChange={(checked) => setSettings({ ...settings, sms_low_credit_enabled: checked.toString() })}
                  />
                </div>
                <div className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center gap-2">
                    <Power className="w-4 h-4 text-red-500" />
                    <Label>Meter Offline Alert</Label>
                  </div>
                  <Switch
                    checked={settings.sms_meter_offline_enabled === 'true'}
                    onCheckedChange={(checked) => setSettings({ ...settings, sms_meter_offline_enabled: checked.toString() })}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Test Tab */}
        <TabsContent value="test" className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2">
            {/* Test SMS */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <TestTube className="w-5 h-5" />
                  Test SMS Configuration
                </CardTitle>
                <CardDescription>Send a test message to verify your setup</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="test-phone">Phone Number</Label>
                  <Input
                    id="test-phone"
                    placeholder="+2348012345678"
                    value={testPhone}
                    onChange={(e) => setTestPhone(e.target.value)}
                  />
                </div>
                <Button 
                  onClick={sendTestSms} 
                  disabled={isTesting || !testPhone}
                  className="w-full"
                >
                  {isTesting ? (
                    <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Send className="w-4 h-4 mr-2" />
                  )}
                  Send Test SMS
                </Button>
                {testResult && (
                  <div className={`p-3 rounded-lg ${testResult.success ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'} border`}>
                    <div className="flex items-center gap-2">
                      {testResult.success ? (
                        <CheckCircle2 className="w-4 h-4 text-green-500" />
                      ) : (
                        <XCircle className="w-4 h-4 text-red-500" />
                      )}
                      <span className={testResult.success ? 'text-green-700' : 'text-red-700'}>
                        {testResult.message}
                      </span>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Send Custom SMS */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Send className="w-5 h-5" />
                  Send Custom SMS
                </CardTitle>
                <CardDescription>Send a custom message to any number</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="custom-phone">Phone Number</Label>
                  <Input
                    id="custom-phone"
                    placeholder="+2348012345678"
                    value={customPhone}
                    onChange={(e) => setCustomPhone(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="custom-message">Message</Label>
                  <Textarea
                    id="custom-message"
                    placeholder="Enter your message..."
                    rows={3}
                    value={customMessage}
                    onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setCustomMessage(e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">{customMessage.length}/160 characters</p>
                </div>
                <Button 
                  onClick={sendCustomSms} 
                  disabled={isTesting || !customPhone || !customMessage}
                  className="w-full"
                >
                  {isTesting ? (
                    <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Send className="w-4 h-4 mr-2" />
                  )}
                  Send SMS
                </Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Templates Tab */}
        <TabsContent value="templates" className="space-y-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-lg">Notification Templates</CardTitle>
                <CardDescription>Customize SMS message templates</CardDescription>
              </div>
              <Button variant="outline" size="sm" onClick={loadTemplates} disabled={templatesLoading}>
                <RefreshCw className={`w-4 h-4 ${templatesLoading ? 'animate-spin' : ''}`} />
              </Button>
            </CardHeader>
            <CardContent>
              {templatesLoading ? (
                <div className="flex items-center justify-center py-8">
                  <RefreshCw className="w-6 h-6 animate-spin text-muted-foreground" />
                </div>
              ) : templates.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <FileText className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <p>No templates found. Run the migration to create default templates.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {templates.map((template) => (
                    <div key={template.id} className="p-4 border rounded-lg space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          {getNotificationTypeIcon(template.notification_type)}
                          <span className="font-medium">{template.name}</span>
                          <Badge variant="outline">{template.notification_type}</Badge>
                        </div>
                        <div className="flex items-center gap-2">
                          <Switch
                            checked={template.enabled}
                            onCheckedChange={(checked) => {
                              const updated = { ...template, enabled: checked };
                              updateTemplate(updated);
                            }}
                          />
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setEditingTemplate(editingTemplate?.id === template.id ? null : template)}
                          >
                            {editingTemplate?.id === template.id ? 'Cancel' : 'Edit'}
                          </Button>
                        </div>
                      </div>
                      {template.description && (
                        <p className="text-sm text-muted-foreground">{template.description}</p>
                      )}
                      {editingTemplate?.id === template.id ? (
                        <div className="space-y-2">
                          <Textarea
                            value={editingTemplate.template}
                            onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setEditingTemplate({ ...editingTemplate, template: e.target.value })}
                            rows={3}
                          />
                          <p className="text-xs text-muted-foreground">
                            Available variables: {'{name}'}, {'{phone}'}, {'{roomNumber}'}, {'{locationName}'}, {'{amount}'}, {'{balance}'}, {'{reference}'}, {'{meterId}'}, {'{projectName}'}
                          </p>
                          <Button size="sm" onClick={() => updateTemplate(editingTemplate)}>
                            <Save className="w-4 h-4 mr-2" />
                            Save Template
                          </Button>
                        </div>
                      ) : (
                        <div className="p-2 bg-muted rounded text-sm font-mono">
                          {template.template}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Logs Tab */}
        <TabsContent value="logs" className="space-y-6">
          {/* Stats */}
          <div className="grid gap-4 md:grid-cols-4">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Total (24h)</span>
                  <Bell className="w-4 h-4 text-blue-500" />
                </div>
                <p className="text-2xl font-bold">{logCounts.total}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Sent</span>
                  <CheckCircle2 className="w-4 h-4 text-green-500" />
                </div>
                <p className="text-2xl font-bold text-green-600">{logCounts.sent}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Failed</span>
                  <XCircle className="w-4 h-4 text-red-500" />
                </div>
                <p className="text-2xl font-bold text-red-600">{logCounts.failed}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Pending</span>
                  <Clock className="w-4 h-4 text-yellow-500" />
                </div>
                <p className="text-2xl font-bold text-yellow-600">{logCounts.pending}</p>
              </CardContent>
            </Card>
          </div>

          {/* Logs Table */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-lg">SMS Logs</CardTitle>
                <CardDescription>Recent SMS notification history</CardDescription>
              </div>
              <Button variant="outline" size="sm" onClick={loadLogs} disabled={logsLoading}>
                <RefreshCw className={`w-4 h-4 ${logsLoading ? 'animate-spin' : ''}`} />
              </Button>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[400px]">
                {logsLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <RefreshCw className="w-6 h-6 animate-spin text-muted-foreground" />
                  </div>
                ) : logs.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <History className="w-12 h-12 mx-auto mb-2 opacity-50" />
                    <p>No SMS logs yet</p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Time</TableHead>
                        <TableHead>Phone</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Message</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {logs.map((log) => (
                        <TableRow key={log.id}>
                          <TableCell className="text-xs">
                            {format(new Date(log.created_at), 'MMM d, HH:mm')}
                          </TableCell>
                          <TableCell className="font-mono text-sm">{log.phone_number}</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1">
                              {getNotificationTypeIcon(log.notification_type)}
                              <span className="text-xs">{log.notification_type}</span>
                            </div>
                          </TableCell>
                          <TableCell>{getStatusBadge(log.status)}</TableCell>
                          <TableCell className="max-w-[200px] truncate text-sm" title={log.message}>
                            {log.message}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
