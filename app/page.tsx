'use client';

import { useState, useMemo, useEffect } from 'react';
import { Zap, Shield, TrendingUp, Clock, Info, UserPlus, MapPin, Phone, Mail, User, Home } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select } from '@/components/ui/select';
import Link from 'next/link';
import { toast } from 'sonner';
import { isValidMeterId, formatNaira } from '@/lib/utils';
import { MIN_RECHARGE_AMOUNT, MAX_RECHARGE_AMOUNT, PAYSTACK_FEE } from '@/lib/constants';

interface Location {
  id: string;
  name: string;
  address?: string;
}

export default function HomePage() {
  // Recharge form state
  const [meterId, setMeterId] = useState('');
  const [amount, setAmount] = useState('');
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [meterValidation, setMeterValidation] = useState<{
    isValidating: boolean;
    found: boolean | null;
    roomNo: string | null;
  }>({ isValidating: false, found: null, roomNo: null });

  // Sign-up form state
  const [activeTab, setActiveTab] = useState('recharge');
  const [signupName, setSignupName] = useState('');
  const [signupEmail, setSignupEmail] = useState('');
  const [signupPhone, setSignupPhone] = useState('');
  const [signupRoom, setSignupRoom] = useState('');
  const [signupLocation, setSignupLocation] = useState('');
  const [locations, setLocations] = useState<Location[]>([]);
  const [locationsLoading, setLocationsLoading] = useState(false);
  const [signupAmount, setSignupAmount] = useState<number | null>(null);
  const [isSignupLoading, setIsSignupLoading] = useState(false);

  // Fetch locations when sign-up tab is active
  useEffect(() => {
    if (activeTab === 'signup' && locations.length === 0) {
      fetchLocations();
      fetchSignupAmount();
    }
  }, [activeTab]);

  const fetchLocations = async () => {
    setLocationsLoading(true);
    try {
      const response = await fetch('/api/projects');
      const data = await response.json();
      if (data.success) {
        setLocations(data.data);
      }
    } catch (error) {
      console.error('Failed to fetch locations:', error);
    } finally {
      setLocationsLoading(false);
    }
  };

  const fetchSignupAmount = async () => {
    try {
      const response = await fetch('/api/signup/amount', {
        cache: 'no-store',
        headers: { 'Cache-Control': 'no-cache' },
      });
      const data = await response.json();
      console.log('[Frontend] Signup amount response:', data);
      if (data.success) {
        setSignupAmount(data.amount);
      }
    } catch (error) {
      console.error('Failed to fetch signup amount:', error);
      setSignupAmount(2000); // Default fallback
    }
  };

  // Calculate Paystack fee in real-time
  const feeCalculation = useMemo(() => {
    const amountNum = parseFloat(amount);
    if (isNaN(amountNum) || amountNum <= 0) {
      return null;
    }

    // Local card fee: 1.5% + ₦100 (capped at ₦2,000)
    // ₦100 fee is waived for transactions under ₦2,500
    const percentageFee = Math.ceil(amountNum * PAYSTACK_FEE.LOCAL_PERCENTAGE);
    const flatFee = amountNum >= PAYSTACK_FEE.LOCAL_FLAT_THRESHOLD ? PAYSTACK_FEE.LOCAL_FLAT : 0;
    
    let fee = percentageFee + flatFee;
    fee = Math.min(fee, PAYSTACK_FEE.LOCAL_CAP); // Cap at ₦2,000
    
    const totalAmount = amountNum + fee;
    
    let feeDescription: string;
    if (amountNum < PAYSTACK_FEE.LOCAL_FLAT_THRESHOLD) {
      feeDescription = '1.5% (₦100 fee waived)';
    } else {
      feeDescription = '1.5% + ₦100';
    }

    return {
      rechargeAmount: amountNum,
      fee,
      totalAmount,
      feeDescription,
    };
  }, [amount]);

  const validateMeter = async (meterIdToValidate: string) => {
    if (!meterIdToValidate || !isValidMeterId(meterIdToValidate)) {
      setMeterValidation({ isValidating: false, found: null, roomNo: null });
      return;
    }

    setMeterValidation({ isValidating: true, found: null, roomNo: null });

    try {
      const response = await fetch('/api/meters/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ meterId: meterIdToValidate }),
      });

      const data = await response.json();

      if (data.found) {
        setMeterValidation({
          isValidating: false,
          found: true,
          roomNo: data.roomNo,
        });
      } else {
        setMeterValidation({
          isValidating: false,
          found: false,
          roomNo: null,
        });
      }
    } catch (error) {
      console.error('Meter validation error:', error);
      setMeterValidation({
        isValidating: false,
        found: false,
        roomNo: null,
      });
    }
  };

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

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!signupName || signupName.trim().length < 2) {
      toast.error('Please enter your full name');
      return;
    }

    if (!signupEmail || !signupEmail.includes('@')) {
      toast.error('Please enter a valid email address');
      return;
    }

    if (!signupPhone || signupPhone.length < 10) {
      toast.error('Please enter a valid phone number');
      return;
    }

    if (!signupRoom) {
      toast.error('Please enter your room number');
      return;
    }

    if (!signupLocation) {
      toast.error('Please select your location');
      return;
    }

    setIsSignupLoading(true);

    try {
      const selectedLocation = locations.find(l => l.id === signupLocation);
      
      const response = await fetch('/api/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: signupName.trim(),
          email: signupEmail.trim(),
          phone: signupPhone.trim(),
          roomNumber: signupRoom.trim(),
          locationId: signupLocation,
          locationName: selectedLocation?.name,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to process registration');
      }

      // Redirect to Paystack payment page
      toast.success('Redirecting to payment...');
      window.location.href = data.data.authorization_url;
    } catch (error: any) {
      toast.error(error.message || 'Failed to process registration');
      setIsSignupLoading(false);
    }
  };

  // Calculate signup fee breakdown
  const signupFeeCalculation = useMemo(() => {
    if (!signupAmount) return null;
    
    const percentageFee = Math.ceil(signupAmount * PAYSTACK_FEE.LOCAL_PERCENTAGE);
    const flatFee = signupAmount >= PAYSTACK_FEE.LOCAL_FLAT_THRESHOLD ? PAYSTACK_FEE.LOCAL_FLAT : 0;
    let fee = percentageFee + flatFee;
    fee = Math.min(fee, PAYSTACK_FEE.LOCAL_CAP);
    
    return {
      amount: signupAmount,
      fee,
      total: signupAmount + fee,
    };
  }, [signupAmount]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-armogrid-navy via-armogrid-blue to-armogrid-navy">
      {/* Header */}
      <header className="border-b border-white/10 bg-white/5 backdrop-blur-md sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 bg-armogrid-red rounded-lg flex items-center justify-center shadow-lg shadow-armogrid-red/30">
              <Zap className="w-6 h-6 text-white" />
            </div>
            <span className="text-2xl font-bold text-white">ArmogridSolar</span>
          </div>
          <Link href="/login">
            <Button className="bg-white text-armogrid-navy hover:bg-white/90 shadow-lg font-semibold">
              Sign In
            </Button>
          </Link>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8 lg:py-16">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Quick Recharge/Signup Card - Shows FIRST on mobile */}
          <Card className="shadow-2xl border-white/20 bg-white/95 backdrop-blur-xl order-first lg:order-last">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <CardHeader className="space-y-4 pb-4">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="recharge" className="flex items-center gap-2">
                    <Zap className="w-4 h-4" />
                    Quick Recharge
                  </TabsTrigger>
                  <TabsTrigger value="signup" className="flex items-center gap-2 relative overflow-visible">
                    <span className="absolute inset-0 rounded-md animate-pulse-glow" />
                    <UserPlus className="w-4 h-4 relative z-10" />
                    <span className="relative z-10">Sign Up</span>
                  </TabsTrigger>
                </TabsList>
              </CardHeader>
              
              <CardContent>
                {/* Recharge Tab */}
                <TabsContent value="recharge" className="mt-0">
                  <div className="space-y-1 mb-4">
                    <h3 className="text-2xl font-bold">Quick Recharge</h3>
                    <p className="text-sm text-muted-foreground">Recharge any meter instantly with your meter ID</p>
                  </div>
                  <form onSubmit={handleRecharge} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="meterId" className="text-sm font-semibold">Meter ID</Label>
                      <Input
                        id="meterId"
                        type="text"
                        placeholder="e.g., 23"
                        value={meterId}
                        onChange={(e) => {
                          setMeterId(e.target.value);
                          setMeterValidation({ isValidating: false, found: null, roomNo: null });
                        }}
                        onBlur={(e) => validateMeter(e.target.value)}
                        className="h-11"
                        required
                      />
                      {meterValidation.isValidating && (
                        <p className="text-xs text-gray-500">Validating meter...</p>
                      )}
                      {!meterValidation.isValidating && meterValidation.found === true && (
                        <p className="text-xs text-green-600">
                          {meterValidation.roomNo ? `Room: ${meterValidation.roomNo}` : 'Meter found'}
                        </p>
                      )}
                      {!meterValidation.isValidating && meterValidation.found === false && (
                        <p className="text-xs text-red-600">Meter not found</p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="amount" className="text-sm font-semibold">Amount (₦)</Label>
                      <Input
                        id="amount"
                        type="number"
                        placeholder={`Min: ₦${MIN_RECHARGE_AMOUNT.toLocaleString()}`}
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                        min={MIN_RECHARGE_AMOUNT}
                        max={MAX_RECHARGE_AMOUNT}
                        step="100"
                        className="h-11"
                        required
                      />
                    </div>

                    {feeCalculation && (
                      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 space-y-2">
                        <div className="flex items-start gap-2">
                          <Info className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
                          <div className="flex-1 space-y-1">
                            <p className="text-sm font-medium text-blue-900">Payment Breakdown</p>
                            <div className="space-y-1 text-sm">
                              <div className="flex justify-between">
                                <span className="text-gray-600">Recharge:</span>
                                <span className="font-medium">₦{feeCalculation.rechargeAmount.toLocaleString()}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-gray-600">Fee ({feeCalculation.feeDescription}):</span>
                                <span className="font-medium">₦{feeCalculation.fee.toLocaleString()}</span>
                              </div>
                              <div className="border-t border-blue-200 pt-1 mt-1">
                                <div className="flex justify-between">
                                  <span className="font-semibold text-blue-900">Total:</span>
                                  <span className="font-bold text-blue-900">₦{feeCalculation.totalAmount.toLocaleString()}</span>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    <div className="space-y-2">
                      <Label htmlFor="email" className="text-sm font-semibold">Email</Label>
                      <Input
                        id="email"
                        type="email"
                        placeholder="your@email.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="h-11"
                        required
                      />
                    </div>

                    <Button
                      type="submit"
                      className="w-full h-11 text-base font-semibold bg-armogrid-red hover:bg-armogrid-red/90 shadow-lg"
                      disabled={isLoading}
                    >
                      {isLoading ? 'Processing...' : feeCalculation ? `Pay ₦${feeCalculation.totalAmount.toLocaleString()}` : 'Recharge Now'}
                    </Button>

                    <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
                      <Shield className="w-4 h-4" />
                      <span>Secure payment powered by Paystack</span>
                    </div>
                  </form>
                </TabsContent>

                {/* Sign Up Tab */}
                <TabsContent value="signup" className="mt-0">
                  <div className="space-y-1 mb-4">
                    <h3 className="text-2xl font-bold">New Customer Sign Up</h3>
                    <p className="text-sm text-muted-foreground">Register for prepaid electricity service</p>
                  </div>
                  <form onSubmit={handleSignup} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="signupName" className="text-sm font-semibold flex items-center gap-2">
                        <User className="w-4 h-4" /> Full Name
                      </Label>
                      <Input
                        id="signupName"
                        type="text"
                        placeholder="John Doe"
                        value={signupName}
                        onChange={(e) => setSignupName(e.target.value)}
                        className="h-11"
                        required
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-2">
                        <Label htmlFor="signupEmail" className="text-sm font-semibold flex items-center gap-2">
                          <Mail className="w-4 h-4" /> Email
                        </Label>
                        <Input
                          id="signupEmail"
                          type="email"
                          placeholder="you@email.com"
                          value={signupEmail}
                          onChange={(e) => setSignupEmail(e.target.value)}
                          className="h-11"
                          required
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="signupPhone" className="text-sm font-semibold flex items-center gap-2">
                          <Phone className="w-4 h-4" /> Phone
                        </Label>
                        <Input
                          id="signupPhone"
                          type="tel"
                          placeholder="+2347035090096"
                          value={signupPhone}
                          onChange={(e) => setSignupPhone(e.target.value)}
                          className="h-11"
                          required
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="signupRoom" className="text-sm font-semibold flex items-center gap-2">
                        <Home className="w-4 h-4" /> Room Number
                      </Label>
                      <Input
                        id="signupRoom"
                        type="text"
                        placeholder="e.g., A101, Flat 2"
                        value={signupRoom}
                        onChange={(e) => setSignupRoom(e.target.value)}
                        className="h-11"
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="signupLocation" className="text-sm font-semibold flex items-center gap-2">
                        <MapPin className="w-4 h-4" /> Location
                      </Label>
                      <Select
                        id="signupLocation"
                        value={signupLocation}
                        onChange={(e) => setSignupLocation(e.target.value)}
                        className="h-11"
                        required
                        disabled={locationsLoading}
                      >
                        <option value="">
                          {locationsLoading ? 'Loading locations...' : 'Select your location'}
                        </option>
                        {locations.map((location) => (
                          <option key={location.id} value={location.id}>
                            {location.name}
                          </option>
                        ))}
                      </Select>
                    </div>

                    {signupFeeCalculation && (
                      <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Info className="w-4 h-4 text-green-600" />
                            <span className="text-sm font-medium text-green-900">Setup Fee:</span>
                          </div>
                          <span className="text-lg font-bold text-green-900">₦{signupFeeCalculation.total.toLocaleString()}</span>
                        </div>
                      </div>
                    )}

                    <Button
                      type="submit"
                      className="w-full h-11 text-base font-semibold bg-armogrid-red hover:bg-armogrid-red/90 shadow-lg"
                      disabled={isSignupLoading || !signupFeeCalculation}
                    >
                      {isSignupLoading ? 'Processing...' : signupFeeCalculation ? `Pay ₦${signupFeeCalculation.total.toLocaleString()}` : 'Loading...'}
                    </Button>

                    <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
                      <Shield className="w-4 h-4" />
                      <span>Secure payment powered by Paystack</span>
                    </div>
                  </form>
                </TabsContent>
              </CardContent>
            </Tabs>
          </Card>

          {/* Hero Text - Shows SECOND on mobile */}
          <div className="text-white space-y-8 order-last lg:order-first">
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
        </div>

        {/* Quick Stats */}
        <div className="grid sm:grid-cols-3 gap-6 mt-20">
          <div className="bg-white/5 backdrop-blur-md rounded-2xl p-8 text-center border border-white/10 hover:bg-white/10 transition-all duration-300 hover:scale-105 hover:border-armogrid-red/30">
            <div className="text-4xl font-bold text-white mb-3 bg-gradient-to-r from-white to-white/80 bg-clip-text text-transparent">₦500+</div>
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
          <p>&copy; 2025 ArmogridSolar. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
