'use client';

import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import { CheckCircle2, Phone, MessageCircle, Home, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import Link from 'next/link';

const CONTACT_PHONE = '+2347035090096';

function SuccessContent() {
  const searchParams = useSearchParams();
  const reference = searchParams.get('reference');
  const name = searchParams.get('name');

  return (
    <div className="min-h-screen bg-gradient-to-br from-armogrid-navy via-armogrid-blue to-armogrid-navy flex items-center justify-center p-4">
      <Card className="max-w-lg w-full shadow-2xl border-white/20 bg-white/95 backdrop-blur-xl">
        <CardHeader className="text-center pb-2">
          <div className="mx-auto w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mb-4">
            <CheckCircle2 className="w-12 h-12 text-green-600" />
          </div>
          <CardTitle className="text-2xl font-bold text-green-600">
            Payment Successful!
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="text-center space-y-2">
            <p className="text-lg font-medium">
              Thank you{name ? `, ${name}` : ''}!
            </p>
            <p className="text-muted-foreground">
              Your registration has been received successfully.
            </p>
            {reference && (
              <p className="text-sm text-muted-foreground">
                Reference: <span className="font-mono">{reference}</span>
              </p>
            )}
          </div>

          {/* Next Steps */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 space-y-3">
            <h3 className="font-semibold text-blue-900 flex items-center gap-2">
              <Zap className="w-5 h-5" />
              What Happens Next?
            </h3>
            <ol className="space-y-2 text-sm text-blue-800">
              <li className="flex items-start gap-2">
                <span className="bg-blue-200 text-blue-800 rounded-full w-5 h-5 flex items-center justify-center flex-shrink-0 text-xs font-bold">1</span>
                <span>Our team will review your registration details</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="bg-blue-200 text-blue-800 rounded-full w-5 h-5 flex items-center justify-center flex-shrink-0 text-xs font-bold">2</span>
                <span>You will be contacted within 24-48 hours to schedule your meter installation</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="bg-blue-200 text-blue-800 rounded-full w-5 h-5 flex items-center justify-center flex-shrink-0 text-xs font-bold">3</span>
                <span>Once installed, you can start recharging your meter immediately</span>
              </li>
            </ol>
          </div>

          {/* Contact Information */}
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 space-y-3">
            <h3 className="font-semibold text-gray-900">
              Questions? Contact Us
            </h3>
            <div className="space-y-2">
              <a 
                href={`https://wa.me/${CONTACT_PHONE.replace('+', '')}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 p-3 bg-green-50 hover:bg-green-100 rounded-lg transition-colors"
              >
                <div className="w-10 h-10 bg-green-500 rounded-full flex items-center justify-center">
                  <MessageCircle className="w-5 h-5 text-white" />
                </div>
                <div>
                  <p className="font-medium text-green-800">WhatsApp</p>
                  <p className="text-sm text-green-600">{CONTACT_PHONE}</p>
                </div>
              </a>
              <a 
                href={`tel:${CONTACT_PHONE}`}
                className="flex items-center gap-3 p-3 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors"
              >
                <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center">
                  <Phone className="w-5 h-5 text-white" />
                </div>
                <div>
                  <p className="font-medium text-blue-800">Call Us</p>
                  <p className="text-sm text-blue-600">{CONTACT_PHONE}</p>
                </div>
              </a>
            </div>
          </div>

          {/* Back to Home */}
          <div className="pt-2">
            <Link href="/">
              <Button className="w-full bg-armogrid-red hover:bg-armogrid-red/90">
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

export default function SignupSuccessPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-br from-armogrid-navy via-armogrid-blue to-armogrid-navy flex items-center justify-center">
        <div className="text-white">Loading...</div>
      </div>
    }>
      <SuccessContent />
    </Suspense>
  );
}
