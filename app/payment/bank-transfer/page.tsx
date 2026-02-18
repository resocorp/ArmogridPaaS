'use client';

import { useSearchParams } from 'next/navigation';
import { useState, useEffect, Suspense } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Copy, CheckCircle, Clock, AlertCircle, Building2, CreditCard } from 'lucide-react';
import { toast } from 'sonner';

function BankTransferContent() {
  const searchParams = useSearchParams();
  const reference = searchParams.get('reference');
  const accountNumber = searchParams.get('account');
  const accountName = searchParams.get('name') || 'IvoryPay';
  const bankName = searchParams.get('bank');
  const amount = searchParams.get('amount');
  const totalAmount = searchParams.get('naira');

  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [status, setStatus] = useState<'pending' | 'checking' | 'success' | 'expired' | 'failed'>('pending');
  const [timeLeft, setTimeLeft] = useState(30 * 60); // 30 minutes for bank transfer

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
    if (!reference || status === 'success' || status === 'expired') return;

    // Check payment status every 15 seconds
    const checkStatus = async () => {
      try {
        setStatus('checking');
        const response = await fetch(`/api/payment/ivorypay/bank-transfer?reference=${reference}`);
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

    const interval = setInterval(checkStatus, 15000);
    return () => clearInterval(interval);
  }, [reference, status]);

  const copyToClipboard = (text: string, field: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    toast.success('Copied to clipboard!');
    setTimeout(() => setCopiedField(null), 2000);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (!accountNumber || !bankName || !amount) {
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
                Your payment of ₦{Number(amount).toLocaleString()} has been confirmed.
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
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Payment Session Expired</h2>
              <p className="text-gray-600 mb-4">
                This payment session has expired. Please initiate a new payment.
              </p>
              <p className="text-sm text-gray-500 mb-6">
                If you already made a transfer, please contact support with your reference: {reference}
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
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Building2 className="w-8 h-8 text-green-600" />
          </div>
          <CardTitle className="text-2xl">Bank Transfer Payment</CardTitle>
          <CardDescription>
            Transfer to the account below to complete your payment
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Timer */}
          <div className="flex items-center justify-center gap-2 text-orange-600 bg-orange-50 p-3 rounded-lg">
            <Clock className="w-5 h-5" />
            <span className="font-medium">
              Session expires in: {formatTime(timeLeft)}
            </span>
          </div>

          {/* Bank Details */}
          <div className="bg-gray-50 p-4 rounded-lg space-y-4">
            {/* Bank Name */}
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Bank Name</p>
                <p className="font-semibold text-gray-900">{bankName}</p>
              </div>
              <Building2 className="w-6 h-6 text-gray-400" />
            </div>

            {/* Account Number */}
            <div className="flex items-center justify-between border-t pt-3">
              <div>
                <p className="text-sm text-gray-500">Account Number</p>
                <p className="font-bold text-xl text-gray-900">{accountNumber}</p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => copyToClipboard(accountNumber, 'account')}
              >
                {copiedField === 'account' ? (
                  <CheckCircle className="w-4 h-4 text-green-500" />
                ) : (
                  <Copy className="w-4 h-4" />
                )}
              </Button>
            </div>

            {/* Account Name */}
            <div className="border-t pt-3">
              <p className="text-sm text-gray-500">Account Name</p>
              <p className="font-semibold text-gray-900">{accountName}</p>
            </div>
          </div>

          {/* Amount */}
          <div className="bg-green-50 p-4 rounded-lg border border-green-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-green-700">Amount to Transfer</p>
                <p className="font-bold text-2xl text-green-800">
                  ₦{Number(totalAmount || amount).toLocaleString()}
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="border-green-300 text-green-700 hover:bg-green-100"
                onClick={() => copyToClipboard(String(totalAmount || amount), 'amount')}
              >
                {copiedField === 'amount' ? (
                  <CheckCircle className="w-4 h-4 text-green-500" />
                ) : (
                  <Copy className="w-4 h-4" />
                )}
              </Button>
            </div>
          </div>

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
                <span>Waiting for your transfer...</span>
              </>
            )}
          </div>

          {/* Instructions */}
          <div className="text-sm text-gray-600 space-y-2 bg-gray-50 p-4 rounded-lg">
            <p className="font-medium text-gray-900">How to pay:</p>
            <ol className="list-decimal list-inside space-y-2">
              <li>Open your banking app or visit your bank</li>
              <li>Select <strong>Transfer</strong> or <strong>Send Money</strong></li>
              <li>Enter account number: <strong>{accountNumber}</strong></li>
              <li>Select bank: <strong>{bankName}</strong></li>
              <li>Enter amount: <strong>₦{Number(totalAmount || amount).toLocaleString()}</strong></li>
              <li>Complete the transfer</li>
            </ol>
            <p className="mt-3 text-xs text-gray-500">
              Your meter will be credited automatically within 1-5 minutes after payment confirmation.
            </p>
          </div>

          {/* Reference */}
          <div className="text-xs text-gray-400 text-center border-t pt-4">
            Reference: {reference}
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3">
            <Button 
              variant="outline" 
              className="flex-1"
              onClick={() => window.location.href = '/'}
            >
              Cancel
            </Button>
            <Button 
              className="flex-1"
              onClick={() => {
                toast.info('Checking payment status...');
                setStatus('checking');
                setTimeout(() => setStatus('pending'), 2000);
              }}
            >
              I&apos;ve Paid
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default function BankTransferPaymentPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    }>
      <BankTransferContent />
    </Suspense>
  );
}
