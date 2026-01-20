'use client';

import { Zap, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

export default function TermsOfServicePage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-armogrid-navy via-armogrid-blue to-armogrid-navy">
      {/* Header */}
      <header className="border-b border-white/10 bg-white/5 backdrop-blur-md sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-10 h-10 bg-armogrid-red rounded-lg flex items-center justify-center shadow-lg shadow-armogrid-red/30">
              <Zap className="w-6 h-6 text-white" />
            </div>
            <span className="text-2xl font-bold text-white">ArmogridSolar</span>
          </Link>
          <Link href="/">
            <Button className="bg-white/10 text-white border border-white/20 hover:bg-white/20">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Home
            </Button>
          </Link>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-12">
        <div className="max-w-4xl mx-auto">
          {/* Page Title */}
          <div className="text-center mb-12">
            <h1 className="text-4xl lg:text-5xl font-bold text-white mb-4">
              Terms of Service
            </h1>
            <p className="text-white/70">
              Last updated: January 2026
            </p>
          </div>

          {/* Terms Content */}
          <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-8 space-y-8">
            <section>
              <h2 className="text-2xl font-bold text-white mb-4">1. Acceptance of Terms</h2>
              <p className="text-white/70 leading-relaxed">
                By accessing or using ArmogridSolar's prepaid electricity meter services, website, or mobile applications (collectively, the "Service"), you agree to be bound by these Terms of Service. If you do not agree to these terms, please do not use our Service.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-white mb-4">2. Description of Service</h2>
              <p className="text-white/70 leading-relaxed mb-4">
                ArmogridSolar provides smart IoT prepaid electricity meter management services, including:
              </p>
              <ul className="list-disc list-inside text-white/70 space-y-2 ml-4">
                <li>Prepaid electricity meter installation and management</li>
                <li>Online and mobile meter recharge services</li>
                <li>Real-time usage monitoring and analytics</li>
                <li>Remote meter control capabilities</li>
                <li>Automated notifications and alerts</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-white mb-4">3. User Registration</h2>
              <p className="text-white/70 leading-relaxed mb-4">
                To use certain features of our Service, you must register for an account. You agree to:
              </p>
              <ul className="list-disc list-inside text-white/70 space-y-2 ml-4">
                <li>Provide accurate, current, and complete information during registration</li>
                <li>Maintain and update your information to keep it accurate</li>
                <li>Keep your account credentials secure and confidential</li>
                <li>Notify us immediately of any unauthorized access to your account</li>
                <li>Accept responsibility for all activities under your account</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-white mb-4">4. Payment Terms</h2>
              <p className="text-white/70 leading-relaxed mb-4">
                All payments for meter recharge and services are processed through Paystack. By making a payment, you agree that:
              </p>
              <ul className="list-disc list-inside text-white/70 space-y-2 ml-4">
                <li>The minimum recharge amount is ₦500</li>
                <li>Transaction fees (as displayed during checkout) are non-refundable</li>
                <li>Meter credits are applied upon successful payment confirmation</li>
                <li>You authorize us to charge your selected payment method</li>
                <li>All prices are in Nigerian Naira (₦) unless otherwise stated</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-white mb-4">5. Refund Policy</h2>
              <p className="text-white/70 leading-relaxed mb-4">
                Refunds may be issued under the following circumstances:
              </p>
              <ul className="list-disc list-inside text-white/70 space-y-2 ml-4">
                <li>Failed transactions where payment was deducted but meter was not credited</li>
                <li>Duplicate payments made in error</li>
                <li>Service unavailability causing inability to use purchased credits</li>
              </ul>
              <p className="text-white/70 leading-relaxed mt-4">
                Refund requests must be submitted within 7 days of the transaction. Please contact our support team with your transaction reference for assistance.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-white mb-4">6. Meter Usage and Disconnection</h2>
              <p className="text-white/70 leading-relaxed mb-4">
                Your electricity supply may be disconnected if:
              </p>
              <ul className="list-disc list-inside text-white/70 space-y-2 ml-4">
                <li>Your prepaid meter balance reaches zero</li>
                <li>There is suspected meter tampering or bypass</li>
                <li>You violate these Terms of Service</li>
                <li>Required by property management or regulatory authorities</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-white mb-4">7. Prohibited Activities</h2>
              <p className="text-white/70 leading-relaxed mb-4">
                You agree not to:
              </p>
              <ul className="list-disc list-inside text-white/70 space-y-2 ml-4">
                <li>Tamper with, bypass, or damage any meter equipment</li>
                <li>Share electricity connections with unauthorized parties</li>
                <li>Use the Service for any illegal purposes</li>
                <li>Attempt to hack, reverse-engineer, or compromise our systems</li>
                <li>Provide false information to obtain services</li>
                <li>Resell electricity or our services without authorization</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-white mb-4">8. Service Availability</h2>
              <p className="text-white/70 leading-relaxed">
                While we strive to maintain 24/7 service availability, we do not guarantee uninterrupted access. Service may be temporarily unavailable due to maintenance, technical issues, or circumstances beyond our control. We are not liable for any losses resulting from service interruptions.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-white mb-4">9. Limitation of Liability</h2>
              <p className="text-white/70 leading-relaxed">
                To the maximum extent permitted by law, ArmogridSolar shall not be liable for any indirect, incidental, special, consequential, or punitive damages arising from your use of the Service, including but not limited to loss of profits, data, or business opportunities.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-white mb-4">10. Intellectual Property</h2>
              <p className="text-white/70 leading-relaxed">
                All content, trademarks, and intellectual property on our platform are owned by ArmogridSolar or its licensors. You may not reproduce, distribute, or create derivative works without our written consent.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-white mb-4">11. Changes to Terms</h2>
              <p className="text-white/70 leading-relaxed">
                We reserve the right to modify these Terms of Service at any time. Changes will be effective upon posting to our website. Your continued use of the Service after changes constitutes acceptance of the modified terms.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-white mb-4">12. Governing Law</h2>
              <p className="text-white/70 leading-relaxed">
                These Terms of Service shall be governed by and construed in accordance with the laws of the Federal Republic of Nigeria. Any disputes arising from these terms shall be resolved in the courts of Nigeria.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-white mb-4">13. Contact Information</h2>
              <p className="text-white/70 leading-relaxed">
                For questions or concerns regarding these Terms of Service, please contact us:
              </p>
              <ul className="text-white/70 mt-4 space-y-2">
                <li><strong className="text-white">Phone:</strong> +234 703 509 0096</li>
                <li><strong className="text-white">WhatsApp:</strong> +234 703 509 0096</li>
                <li><strong className="text-white">Email:</strong> info@armogrid.com</li>
              </ul>
            </section>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-white/10 mt-16 py-8 bg-black/20 backdrop-blur-sm">
        <div className="container mx-auto px-4 text-center text-white/60 text-sm">
          <p>&copy; {new Date().getFullYear()} ArmogridSolar. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
