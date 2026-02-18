'use client';

import { useEffect, useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import {
  CreditCard,
  RefreshCw,
  Save,
  CheckCircle2,
  XCircle,
  Wallet,
  ArrowRightLeft,
  Coins,
} from 'lucide-react';
import { toast } from 'sonner';

interface PaymentSettings {
  activeGateway: 'paystack' | 'ivorypay' | 'ivorypay_onramp' | 'ivorypay_bank_transfer';
  paystackEnabled: boolean;
  ivorypayEnabled: boolean;
  ivorypayDefaultCrypto: 'USDT' | 'USDC' | 'SOL';
  ivorypayAutoSwapToUsdt: boolean;
  ivorypayOnRampEnabled: boolean;
  paystackConfigured: boolean;
  ivorypayConfigured: boolean;
}

export function AdminPaymentSettings() {
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [settings, setSettings] = useState<PaymentSettings>({
    activeGateway: 'paystack',
    paystackEnabled: true,
    ivorypayEnabled: false,
    ivorypayDefaultCrypto: 'USDT',
    ivorypayAutoSwapToUsdt: true,
    ivorypayOnRampEnabled: false,
    paystackConfigured: false,
    ivorypayConfigured: false,
  });

  const loadSettings = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/admin/payment-settings');
      const data = await response.json();

      if (data.success) {
        setSettings({
          activeGateway: data.data.activeGateway || 'paystack',
          paystackEnabled: data.data.paystackEnabled !== false,
          ivorypayEnabled: data.data.ivorypayEnabled === true,
          ivorypayDefaultCrypto: data.data.ivorypayDefaultCrypto || 'USDT',
          ivorypayAutoSwapToUsdt: data.data.ivorypayAutoSwapToUsdt !== false,
          ivorypayOnRampEnabled: data.data.ivorypayOnRampEnabled === true,
          paystackConfigured: data.data.paystackConfigured || false,
          ivorypayConfigured: data.data.ivorypayConfigured || false,
        });
      }
    } catch (error) {
      console.error('Failed to load payment settings:', error);
      toast.error('Failed to load payment settings');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  const saveSettings = async () => {
    setIsSaving(true);
    try {
      const response = await fetch('/api/admin/payment-settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          settings: {
            active_payment_gateway: settings.activeGateway,
            paystack_enabled: settings.paystackEnabled.toString(),
            ivorypay_enabled: settings.ivorypayEnabled.toString(),
            ivorypay_default_crypto: settings.ivorypayDefaultCrypto,
            ivorypay_auto_swap_to_usdt: settings.ivorypayAutoSwapToUsdt.toString(),
            ivorypay_onramp_enabled: settings.ivorypayOnRampEnabled.toString(),
          },
        }),
      });

      const data = await response.json();

      if (data.success) {
        toast.success('Payment settings saved successfully');
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
            <CreditCard className="w-6 h-6" />
            Payment Gateway Settings
          </h2>
          <p className="text-muted-foreground">
            Configure payment gateways for meter recharges
          </p>
        </div>
        <Button onClick={saveSettings} disabled={isSaving}>
          {isSaving ? (
            <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
          ) : (
            <Save className="w-4 h-4 mr-2" />
          )}
          Save Settings
        </Button>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Active Gateway Selection */}
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle className="text-lg">Active Payment Gateway</CardTitle>
            <CardDescription>
              Select which payment gateway to use for all payments
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4">
              <Select
                value={settings.activeGateway}
                onChange={(e) =>
                  setSettings({ ...settings, activeGateway: e.target.value as 'paystack' | 'ivorypay' | 'ivorypay_onramp' | 'ivorypay_bank_transfer' })
                }
                className="w-[280px]"
              >
                <option value="paystack" disabled={!settings.paystackConfigured}>
                  Paystack {!settings.paystackConfigured && '(Not configured)'}
                </option>
                <option value="ivorypay" disabled={!settings.ivorypayConfigured}>
                  IvoryPay Crypto {!settings.ivorypayConfigured && '(Not configured)'}
                </option>
                <option value="ivorypay_bank_transfer" disabled={!settings.ivorypayConfigured}>
                  IvoryPay Bank Transfer (No KYC) {!settings.ivorypayConfigured && '(Not configured)'}
                </option>
              </Select>
              <Badge
                variant="outline"
                className={
                  settings.activeGateway === 'paystack'
                    ? 'bg-green-500/10 text-green-500 border-green-500/20'
                    : settings.activeGateway === 'ivorypay_bank_transfer'
                    ? 'bg-blue-500/10 text-blue-500 border-blue-500/20'
                    : 'bg-purple-500/10 text-purple-500 border-purple-500/20'
                }
              >
                {settings.activeGateway === 'paystack' 
                  ? 'Card/Bank Payments' 
                  : settings.activeGateway === 'ivorypay_bank_transfer'
                  ? 'Bank Transfer (No KYC Required)'
                  : 'Direct Crypto Payments'}
              </Badge>
            </div>
          </CardContent>
        </Card>

        {/* Paystack Settings */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-green-500" />
                Paystack
              </CardTitle>
              {settings.paystackConfigured ? (
                <Badge className="bg-green-500/10 text-green-500 border-green-500/20">
                  <CheckCircle2 className="w-3 h-3 mr-1" />
                  Configured
                </Badge>
              ) : (
                <Badge className="bg-red-500/10 text-red-500 border-red-500/20">
                  <XCircle className="w-3 h-3 mr-1" />
                  Not Configured
                </Badge>
              )}
            </div>
            <CardDescription>
              Accept card and bank transfer payments in Naira
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between p-3 border rounded-lg">
              <div className="flex items-center gap-2">
                <Label>Enable Paystack</Label>
              </div>
              <Switch
                checked={settings.paystackEnabled}
                onCheckedChange={(checked) =>
                  setSettings({ ...settings, paystackEnabled: checked })
                }
                disabled={!settings.paystackConfigured}
              />
            </div>
            <div className="text-sm text-muted-foreground">
              <p><strong>Features:</strong></p>
              <ul className="list-disc list-inside mt-1 space-y-1">
                <li>Card payments (Visa, Mastercard, Verve)</li>
                <li>Bank transfers</li>
                <li>USSD payments</li>
                <li>1.5% + ₦100 transaction fee (capped at ₦2,000)</li>
              </ul>
            </div>
          </CardContent>
        </Card>

        {/* IvoryPay Settings */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg flex items-center gap-2">
                <Wallet className="w-5 h-5 text-purple-500" />
                IvoryPay
              </CardTitle>
              {settings.ivorypayConfigured ? (
                <Badge className="bg-green-500/10 text-green-500 border-green-500/20">
                  <CheckCircle2 className="w-3 h-3 mr-1" />
                  Configured
                </Badge>
              ) : (
                <Badge className="bg-red-500/10 text-red-500 border-red-500/20">
                  <XCircle className="w-3 h-3 mr-1" />
                  Not Configured
                </Badge>
              )}
            </div>
            <CardDescription>
              Accept Naira via bank transfer, auto-converts to crypto
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between p-3 border rounded-lg">
              <div className="flex items-center gap-2">
                <Label>Enable IvoryPay</Label>
              </div>
              <Switch
                checked={settings.ivorypayEnabled}
                onCheckedChange={(checked) =>
                  setSettings({ ...settings, ivorypayEnabled: checked })
                }
                disabled={!settings.ivorypayConfigured}
              />
            </div>

            <div className="space-y-3">
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Coins className="w-4 h-4" />
                  Default Cryptocurrency
                </Label>
                <Select
                  value={settings.ivorypayDefaultCrypto}
                  onChange={(e) =>
                    setSettings({ ...settings, ivorypayDefaultCrypto: e.target.value as 'USDT' | 'USDC' | 'SOL' })
                  }
                  disabled={!settings.ivorypayConfigured}
                >
                  <option value="USDT">USDT (Tether)</option>
                  <option value="USDC">USDC (USD Coin)</option>
                  <option value="SOL">SOL (Solana)</option>
                </Select>
              </div>

              <div className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex items-center gap-2">
                  <ArrowRightLeft className="w-4 h-4" />
                  <Label>Auto-swap to USDT</Label>
                </div>
                <Switch
                  checked={settings.ivorypayAutoSwapToUsdt}
                  onCheckedChange={(checked) =>
                    setSettings({ ...settings, ivorypayAutoSwapToUsdt: checked })
                  }
                  disabled={!settings.ivorypayConfigured}
                />
              </div>
              <p className="text-xs text-muted-foreground">
                Automatically convert received crypto to USDT after payment
              </p>
            </div>

            <div className="text-sm text-muted-foreground">
              <p><strong>Features:</strong></p>
              <ul className="list-disc list-inside mt-1 space-y-1">
                <li>Users pay in Naira via bank transfer</li>
                <li>IvoryPay converts to crypto (USDT/USDC/SOL)</li>
                <li>Approximately 1% transaction fee</li>
                <li>Virtual bank account per customer</li>
              </ul>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Environment Variables Info */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Environment Configuration</CardTitle>
          <CardDescription>
            Required environment variables for payment gateways
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="p-3 bg-muted rounded-lg">
              <p className="font-medium mb-2">Paystack</p>
              <code className="text-xs block">PAYSTACK_SECRET_KEY</code>
              <code className="text-xs block">NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY</code>
            </div>
            <div className="p-3 bg-muted rounded-lg">
              <p className="font-medium mb-2">IvoryPay</p>
              <code className="text-xs block">IVORYPAY_SECRET_KEY</code>
              <code className="text-xs block">NEXT_PUBLIC_IVORYPAY_PUBLIC_KEY</code>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
