'use client';

import { useState } from 'react';
import { Zap, Shield, TrendingUp, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import Link from 'next/link';
import { toast } from 'sonner';
import { isValidMeterId, formatNaira } from '@/lib/utils';
import { MIN_RECHARGE_AMOUNT, MAX_RECHARGE_AMOUNT } from '@/lib/constants';

export default function HomePage() {
  const [meterId, setMeterId] = useState('');
  const [amount, setAmount] = useState('');
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleRecharge = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!isValidMeterId(meterId)) {
      toast.error('Please enter a valid meter ID');
      return;
    }

    const amountNum = parseFloat(amount);
    if (isNaN(amountNum) || amountNum < MIN_RECHARGE_AMOUNT || amountNum > MAX_RECHARGE_AMOUNT) {
      toast.error(`Amount must be between ${formatNaira(MIN_RECHARGE_AMOUNT * 100)} and ${formatNaira(MAX_RECHARGE_AMOUNT * 100)}`);
      return;
    }

    if (!email || !email.includes('@')) {
      toast.error('Please enter a valid email address');
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch('/api/payment/initialize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          meterId,
          amount: amountNum,
          email,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to initialize payment');
      }

      // Redirect to Paystack payment page
      window.location.href = data.data.authorization_url;
    } catch (error: any) {
      toast.error(error.message || 'Failed to initialize payment');
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-armogrid-navy via-armogrid-blue to-armogrid-navy">
      {/* Header */}
      <header className="border-b border-white/10 bg-white/5 backdrop-blur-md sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 bg-armogrid-red rounded-lg flex items-center justify-center shadow-lg shadow-armogrid-red/30">
              <Zap className="w-6 h-6 text-white" />
            </div>
            <span className="text-2xl font-bold text-white">ArmogridPaaS</span>
          </div>
          <Link href="/login">
            <Button className="bg-white text-armogrid-navy hover:bg-white/90 shadow-lg font-semibold">
              Sign In
            </Button>
          </Link>
        </div>
      </header>

      {/* Hero Section */}
      <main className="container mx-auto px-4 py-16">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Left Column - Hero Text */}
          <div className="text-white space-y-8">
            <div className="space-y-4">
              <div className="inline-block px-4 py-2 bg-armogrid-red/20 backdrop-blur-sm rounded-full border border-armogrid-red/30">
                <span className="text-sm font-semibold text-armogrid-red">⚡ Prepaid Electricity Made Easy</span>
              </div>
              <h1 className="text-5xl lg:text-6xl font-bold leading-tight">
                Manage Your Electricity<br />
                <span className="text-armogrid-red bg-gradient-to-r from-armogrid-red to-orange-500 bg-clip-text text-transparent">
                  Smarter & Faster
                </span>
              </h1>
              <p className="text-xl text-white/90 leading-relaxed">
                Quick meter recharge, real-time monitoring, and complete control over your prepaid electricity meters.
              </p>
            </div>
            
            {/* Features */}
            <div className="grid sm:grid-cols-2 gap-4 pt-4">
              <div className="flex items-start gap-3 p-4 rounded-xl bg-white/5 backdrop-blur-sm border border-white/10 hover:bg-white/10 transition-all duration-300 hover:scale-105">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-armogrid-red to-orange-500 flex items-center justify-center flex-shrink-0 shadow-lg shadow-armogrid-red/30">
                  <Clock className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h3 className="font-semibold text-lg">Instant Recharge</h3>
                  <p className="text-sm text-white/70">Credit your meter in seconds</p>
                </div>
              </div>
              <div className="flex items-start gap-3 p-4 rounded-xl bg-white/5 backdrop-blur-sm border border-white/10 hover:bg-white/10 transition-all duration-300 hover:scale-105">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-armogrid-red to-orange-500 flex items-center justify-center flex-shrink-0 shadow-lg shadow-armogrid-red/30">
                  <TrendingUp className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h3 className="font-semibold text-lg">Usage Analytics</h3>
                  <p className="text-sm text-white/70">Track your consumption</p>
                </div>
              </div>
              <div className="flex items-start gap-3 p-4 rounded-xl bg-white/5 backdrop-blur-sm border border-white/10 hover:bg-white/10 transition-all duration-300 hover:scale-105">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-armogrid-red to-orange-500 flex items-center justify-center flex-shrink-0 shadow-lg shadow-armogrid-red/30">
                  <Shield className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h3 className="font-semibold text-lg">Secure Payments</h3>
                  <p className="text-sm text-white/70">Powered by Paystack</p>
                </div>
              </div>
              <div className="flex items-start gap-3 p-4 rounded-xl bg-white/5 backdrop-blur-sm border border-white/10 hover:bg-white/10 transition-all duration-300 hover:scale-105">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-armogrid-red to-orange-500 flex items-center justify-center flex-shrink-0 shadow-lg shadow-armogrid-red/30">
                  <Zap className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h3 className="font-semibold text-lg">Remote Control</h3>
                  <p className="text-sm text-white/70">Manage meters anywhere</p>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column - Recharge Form */}
          <Card className="shadow-2xl border-white/20 bg-white/95 backdrop-blur-xl">
            <CardHeader className="space-y-2">
              <CardTitle className="text-3xl font-bold">Quick Recharge</CardTitle>
              <CardDescription className="text-base">
                Recharge any meter instantly with your meter ID
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleRecharge} className="space-y-5">
                <div className="space-y-2">
                  <Label htmlFor="meterId" className="text-base font-semibold">Meter ID</Label>
                  <Input
                    id="meterId"
                    type="text"
                    placeholder="e.g., 23"
                    value={meterId}
                    onChange={(e) => setMeterId(e.target.value)}
                    className="h-12 text-base"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="amount" className="text-base font-semibold">Amount (₦)</Label>
                  <Input
                    id="amount"
                    type="number"
                    placeholder={`Min: ₦${MIN_RECHARGE_AMOUNT}`}
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    min={MIN_RECHARGE_AMOUNT}
                    max={MAX_RECHARGE_AMOUNT}
                    step="100"
                    className="h-12 text-base"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email" className="text-base font-semibold">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="your@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="h-12 text-base"
                    required
                  />
                  <p className="text-xs text-muted-foreground">
                    Required for payment confirmation and receipt
                  </p>
                </div>

                <Button
                  type="submit"
                  className="w-full bg-gradient-to-r from-armogrid-red to-orange-500 hover:from-armogrid-red/90 hover:to-orange-500/90 text-white shadow-lg shadow-armogrid-red/30 transition-all duration-300 hover:scale-[1.02]"
                  size="lg"
                  disabled={isLoading}
                >
                  {isLoading ? 'Processing...' : 'Recharge Now'}
                </Button>

                <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
                  <Shield className="w-4 h-4" />
                  <span>Secure payment powered by Paystack</span>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>

        {/* Quick Stats */}
        <div className="grid sm:grid-cols-3 gap-6 mt-20">
          <div className="bg-white/5 backdrop-blur-md rounded-2xl p-8 text-center border border-white/10 hover:bg-white/10 transition-all duration-300 hover:scale-105 hover:border-armogrid-red/30">
            <div className="text-4xl font-bold text-white mb-3 bg-gradient-to-r from-white to-white/80 bg-clip-text text-transparent">₦100+</div>
            <div className="text-white/80 font-medium">Minimum Recharge</div>
          </div>
          <div className="bg-white/5 backdrop-blur-md rounded-2xl p-8 text-center border border-white/10 hover:bg-white/10 transition-all duration-300 hover:scale-105 hover:border-armogrid-red/30">
            <div className="text-4xl font-bold text-white mb-3 bg-gradient-to-r from-white to-white/80 bg-clip-text text-transparent">&lt;60s</div>
            <div className="text-white/80 font-medium">Average Processing Time</div>
          </div>
          <div className="bg-white/5 backdrop-blur-md rounded-2xl p-8 text-center border border-white/10 hover:bg-white/10 transition-all duration-300 hover:scale-105 hover:border-armogrid-red/30">
            <div className="text-4xl font-bold text-white mb-3 bg-gradient-to-r from-white to-white/80 bg-clip-text text-transparent">24/7</div>
            <div className="text-white/80 font-medium">Service Availability</div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-white/10 mt-16">
        <div className="container mx-auto px-4 py-8 text-center text-white/60">
          <p>&copy; 2025 Armogrid. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
