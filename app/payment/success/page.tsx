'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckCircle, Loader2, Home } from 'lucide-react';
import Link from 'next/link';
import { formatNaira } from '@/lib/utils';

function PaymentSuccessContent() {
  const searchParams = useSearchParams();
  const reference = searchParams.get('reference');
  const [isVerifying, setIsVerifying] = useState(true);
  const [paymentData, setPaymentData] = useState<any>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (reference) {
      verifyPayment(reference);
    } else {
      setError('No payment reference found');
      setIsVerifying(false);
    }
  }, [reference]);

  const verifyPayment = async (ref: string) => {
    try {
      const response = await fetch(`/api/payment/verify/${ref}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Payment verification failed');
      }

      setPaymentData(data.data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsVerifying(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-armogrid-navy via-armogrid-blue to-armogrid-navy flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-center">
            {isVerifying ? 'Verifying Payment...' : 'Payment Status'}
          </CardTitle>
        </CardHeader>
        <CardContent className="text-center space-y-6">
          {isVerifying ? (
            <div className="py-8">
              <Loader2 className="w-16 h-16 text-armogrid-blue animate-spin mx-auto mb-4" />
              <p className="text-muted-foreground">
                Please wait while we confirm your payment...
              </p>
            </div>
          ) : error ? (
            <div className="py-8">
              <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center mx-auto mb-4">
                <span className="text-3xl">❌</span>
              </div>
              <h3 className="text-xl font-semibold mb-2">Verification Failed</h3>
              <p className="text-muted-foreground">{error}</p>
            </div>
          ) : paymentData?.status === 'success' ? (
            <div className="py-8">
              <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
              <h3 className="text-2xl font-bold mb-2">Payment Successful!</h3>
              <p className="text-muted-foreground mb-6">
                Your meter has been credited successfully
              </p>

              <div className="bg-muted rounded-lg p-4 space-y-2 text-left">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Meter ID:</span>
                  <span className="font-semibold">{paymentData.meterId}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Amount:</span>
                  <span className="font-semibold">{formatNaira(paymentData.amount)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Reference:</span>
                  <span className="font-mono text-xs">{paymentData.reference}</span>
                </div>
                {paymentData.saleId && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Transaction ID:</span>
                    <span className="font-mono text-xs">{paymentData.saleId}</span>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="py-8">
              <div className="w-16 h-16 rounded-full bg-yellow-500/10 flex items-center justify-center mx-auto mb-4">
                <span className="text-3xl">⚠️</span>
              </div>
              <h3 className="text-xl font-semibold mb-2">Payment Pending</h3>
              <p className="text-muted-foreground">
                Your payment is being processed. Please check back in a few minutes.
              </p>
            </div>
          )}

          <div className="space-y-2">
            <Link href="/" className="block">
              <Button className="w-full" variant="outline">
                <Home className="w-4 h-4 mr-2" />
                Back to Home
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default function PaymentSuccessPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-gradient-to-br from-armogrid-navy via-armogrid-blue to-armogrid-navy flex items-center justify-center p-4">
          <Card className="w-full max-w-md">
            <CardContent className="text-center py-12">
              <Loader2 className="w-16 h-16 text-armogrid-blue animate-spin mx-auto mb-4" />
              <p className="text-muted-foreground">Loading...</p>
            </CardContent>
          </Card>
        </div>
      }
    >
      <PaymentSuccessContent />
    </Suspense>
  );
}
