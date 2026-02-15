'use client';

import { useSearchParams } from 'next/navigation';
import { useState, useEffect, Suspense } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Copy, CheckCircle, Clock, AlertCircle, ExternalLink } from 'lucide-react';
import { toast } from 'sonner';

function CryptoPaymentContent() {
  const searchParams = useSearchParams();
  const reference = searchParams.get('reference');
  const address = searchParams.get('address');
  const amount = searchParams.get('amount');
  const crypto = searchParams.get('crypto');
  const naira = searchParams.get('naira');

  const [copied, setCopied] = useState(false);
  const [status, setStatus] = useState<'pending' | 'checking' | 'success' | 'expired' | 'failed'>('pending');
  const [timeLeft, setTimeLeft] = useState(5 * 60); // 5 minutes in seconds

  useEffect(() => {
    if (timeLeft <= 0) {
      setStatus('expired');
      return;
    }

    const timer = setInterval(() => {
      setTimeLeft((prev) => prev - 1);
    }, 1000);

    return () => clearInterval(timer);
  }, [timeLeft]);

  useEffect(() => {
    if (!reference || status !== 'pending') return;

    // Check payment status every 10 seconds
    const checkStatus = async () => {
      try {
        setStatus('checking');
        const response = await fetch(`/api/payment/ivorypay/verify/${reference}`);
        const data = await response.json();

        if (data.success && data.data?.status === 'success') {
          setStatus('success');
          toast.success('Payment confirmed! Your meter will be credited shortly.');
        } else if (data.data?.status === 'expired') {
          setStatus('expired');
        } else if (data.data?.status === 'failed') {
          setStatus('failed');
        } else {
          setStatus('pending');
        }
      } catch (error) {
        console.error('Error checking payment status:', error);
        setStatus('pending');
      }
    };

    const interval = setInterval(checkStatus, 10000);
    return () => clearInterval(interval);
  }, [reference, status]);

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    toast.success('Copied to clipboard!');
    setTimeout(() => setCopied(false), 2000);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (!address || !amount || !crypto) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <div className="text-center">
              <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
              <h2 className="text-xl font-semibold text-gray-900 mb-2">Invalid Payment</h2>
              <p className="text-gray-600">Payment details not found. Please try again.</p>
              <Button className="mt-4" onClick={() => window.location.href = '/'}>
                Go Home
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (status === 'success') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <div className="text-center">
              <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Payment Successful!</h2>
              <p className="text-gray-600 mb-4">
                Your payment of ₦{naira} has been confirmed.
              </p>
              <p className="text-sm text-gray-500 mb-6">
                Your meter will be credited automatically.
              </p>
              <Button onClick={() => window.location.href = '/dashboard/meters'}>
                View My Meters
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (status === 'expired') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <div className="text-center">
              <Clock className="w-16 h-16 text-orange-500 mx-auto mb-4" />
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Payment Expired</h2>
              <p className="text-gray-600 mb-4">
                This payment session has expired. Please initiate a new payment.
              </p>
              <Button onClick={() => window.location.href = '/dashboard/meters'}>
                Try Again
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">Complete Your Payment</CardTitle>
          <CardDescription>
            Send {crypto} to the address below to complete your payment
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Timer */}
          <div className="flex items-center justify-center gap-2 text-orange-600 bg-orange-50 p-3 rounded-lg">
            <Clock className="w-5 h-5" />
            <span className="font-medium">
              Time remaining: {formatTime(timeLeft)}
            </span>
          </div>

          {/* Amount Details */}
          <div className="bg-gray-50 p-4 rounded-lg space-y-2">
            <div className="flex justify-between">
              <span className="text-gray-600">Amount (Naira)</span>
              <span className="font-semibold">₦{Number(naira).toLocaleString()}</span>
            </div>
            <div className="flex justify-between border-t pt-2">
              <span className="text-gray-600">Amount ({crypto})</span>
              <span className="font-bold text-lg text-green-600">{amount} {crypto}</span>
            </div>
          </div>

          {/* Crypto Address */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">
              Send exactly {amount} {crypto} to:
            </label>
            <div className="flex items-center gap-2">
              <div className="flex-1 bg-gray-100 p-3 rounded-lg font-mono text-sm break-all">
                {address}
              </div>
              <Button
                variant="outline"
                size="icon"
                onClick={() => copyToClipboard(address)}
                className="shrink-0"
              >
                {copied ? (
                  <CheckCircle className="w-4 h-4 text-green-500" />
                ) : (
                  <Copy className="w-4 h-4" />
                )}
              </Button>
            </div>
          </div>

          {/* Copy Amount Button */}
          <Button
            variant="outline"
            className="w-full"
            onClick={() => copyToClipboard(amount)}
          >
            <Copy className="w-4 h-4 mr-2" />
            Copy Amount: {amount} {crypto}
          </Button>

          {/* Status */}
          <div className="flex items-center justify-center gap-2 text-blue-600 bg-blue-50 p-3 rounded-lg">
            {status === 'checking' ? (
              <>
                <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                <span>Checking payment status...</span>
              </>
            ) : (
              <>
                <Clock className="w-4 h-4" />
                <span>Waiting for payment confirmation...</span>
              </>
            )}
          </div>

          {/* Instructions */}
          <div className="text-sm text-gray-500 space-y-2">
            <p className="font-medium">Instructions:</p>
            <ol className="list-decimal list-inside space-y-1">
              <li>Copy the wallet address above</li>
              <li>Open your crypto wallet app</li>
              <li>Send exactly {amount} {crypto} to the address</li>
              <li>Wait for confirmation (usually 1-5 minutes)</li>
            </ol>
          </div>

          {/* Reference */}
          <div className="text-xs text-gray-400 text-center">
            Reference: {reference}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default function CryptoPaymentPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    }>
      <CryptoPaymentContent />
    </Suspense>
  );
}
