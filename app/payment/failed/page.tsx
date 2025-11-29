'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { XCircle, Home } from 'lucide-react';
import Link from 'next/link';

export default function PaymentFailedPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-armogrid-navy via-armogrid-blue to-armogrid-navy flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-center">Payment Failed</CardTitle>
        </CardHeader>
        <CardContent className="text-center space-y-6">
          <div className="py-8">
            <XCircle className="w-16 h-16 text-destructive mx-auto mb-4" />
            <h3 className="text-2xl font-bold mb-2">Payment Unsuccessful</h3>
            <p className="text-muted-foreground mb-6">
              Your payment could not be processed. Please try again.
            </p>
          </div>

          <div className="space-y-2">
            <Link href="/" className="block">
              <Button className="w-full bg-armogrid-red hover:bg-armogrid-red/90">
                Try Again
              </Button>
            </Link>
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
