'use client';

import { Zap, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

export default function PrivacyPolicyPage() {
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
              Privacy Policy
            </h1>
            <p className="text-white/70">
              Last updated: January 2026
            </p>
          </div>

          {/* Privacy Content */}
          <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-8 space-y-8">
            <section>
              <h2 className="text-2xl font-bold text-white mb-4">1. Introduction</h2>
              <p className="text-white/70 leading-relaxed">
                ArmogridSolar ("we," "our," or "us") is committed to protecting your privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our prepaid electricity meter services, website, and mobile applications.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-white mb-4">2. Information We Collect</h2>
              <p className="text-white/70 leading-relaxed mb-4">
                We collect information that you provide directly to us, including:
              </p>
              <h3 className="text-lg font-semibold text-white mb-2">Personal Information</h3>
              <ul className="list-disc list-inside text-white/70 space-y-2 ml-4 mb-4">
                <li>Full name</li>
                <li>Email address</li>
                <li>Phone number</li>
                <li>Residential address and room number</li>
                <li>Property/location information</li>
              </ul>
              <h3 className="text-lg font-semibold text-white mb-2">Payment Information</h3>
              <ul className="list-disc list-inside text-white/70 space-y-2 ml-4 mb-4">
                <li>Transaction history and amounts</li>
                <li>Payment method details (processed securely by Paystack)</li>
                <li>Billing information</li>
              </ul>
              <h3 className="text-lg font-semibold text-white mb-2">Usage Information</h3>
              <ul className="list-disc list-inside text-white/70 space-y-2 ml-4">
                <li>Meter readings and electricity consumption data</li>
                <li>Recharge history and patterns</li>
                <li>Device information and IP addresses</li>
                <li>Browser type and operating system</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-white mb-4">3. How We Use Your Information</h2>
              <p className="text-white/70 leading-relaxed mb-4">
                We use the collected information for the following purposes:
              </p>
              <ul className="list-disc list-inside text-white/70 space-y-2 ml-4">
                <li>To provide and maintain our prepaid electricity services</li>
                <li>To process your payments and recharge transactions</li>
                <li>To send you transaction confirmations and receipts</li>
                <li>To notify you about low balance and service updates</li>
                <li>To provide customer support and respond to inquiries</li>
                <li>To monitor and analyze usage patterns for service improvement</li>
                <li>To detect and prevent fraud or unauthorized access</li>
                <li>To comply with legal obligations and regulatory requirements</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-white mb-4">4. Information Sharing</h2>
              <p className="text-white/70 leading-relaxed mb-4">
                We may share your information with:
              </p>
              <ul className="list-disc list-inside text-white/70 space-y-2 ml-4">
                <li><strong className="text-white">Property Managers:</strong> Basic account and consumption information for properties you reside in</li>
                <li><strong className="text-white">Payment Processors:</strong> Paystack for secure payment processing</li>
                <li><strong className="text-white">Service Providers:</strong> Third parties who assist in operating our services</li>
                <li><strong className="text-white">Legal Authorities:</strong> When required by law or to protect our rights</li>
              </ul>
              <p className="text-white/70 leading-relaxed mt-4">
                We do not sell, rent, or trade your personal information to third parties for marketing purposes.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-white mb-4">5. Data Security</h2>
              <p className="text-white/70 leading-relaxed">
                We implement industry-standard security measures to protect your information, including:
              </p>
              <ul className="list-disc list-inside text-white/70 space-y-2 ml-4 mt-4">
                <li>SSL/TLS encryption for all data transmissions</li>
                <li>Secure payment processing through PCI-DSS compliant Paystack</li>
                <li>Regular security audits and vulnerability assessments</li>
                <li>Access controls and authentication mechanisms</li>
                <li>Encrypted database storage for sensitive information</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-white mb-4">6. Data Retention</h2>
              <p className="text-white/70 leading-relaxed">
                We retain your personal information for as long as your account is active or as needed to provide services. Transaction records are kept for a minimum of 7 years to comply with financial regulations. You may request deletion of your account, subject to our legal retention obligations.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-white mb-4">7. Your Rights</h2>
              <p className="text-white/70 leading-relaxed mb-4">
                You have the following rights regarding your personal information:
              </p>
              <ul className="list-disc list-inside text-white/70 space-y-2 ml-4">
                <li><strong className="text-white">Access:</strong> Request a copy of the personal data we hold about you</li>
                <li><strong className="text-white">Correction:</strong> Request correction of inaccurate or incomplete data</li>
                <li><strong className="text-white">Deletion:</strong> Request deletion of your personal data (subject to legal requirements)</li>
                <li><strong className="text-white">Objection:</strong> Object to certain processing of your data</li>
                <li><strong className="text-white">Portability:</strong> Request transfer of your data in a structured format</li>
              </ul>
              <p className="text-white/70 leading-relaxed mt-4">
                To exercise these rights, please contact us using the information provided below.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-white mb-4">8. Cookies and Tracking</h2>
              <p className="text-white/70 leading-relaxed">
                We use cookies and similar tracking technologies to enhance your experience on our platform. These help us remember your preferences, analyze site traffic, and improve our services. You can control cookie settings through your browser preferences.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-white mb-4">9. Third-Party Services</h2>
              <p className="text-white/70 leading-relaxed">
                Our platform integrates with third-party services such as Paystack for payments and Vercel for hosting. These services have their own privacy policies, and we encourage you to review them. We are not responsible for the privacy practices of third-party services.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-white mb-4">10. Children's Privacy</h2>
              <p className="text-white/70 leading-relaxed">
                Our services are not intended for individuals under 18 years of age. We do not knowingly collect personal information from children. If you believe we have inadvertently collected such information, please contact us immediately.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-white mb-4">11. Changes to This Policy</h2>
              <p className="text-white/70 leading-relaxed">
                We may update this Privacy Policy from time to time. We will notify you of any material changes by posting the new policy on this page and updating the "Last updated" date. Your continued use of our services after changes constitutes acceptance of the updated policy.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-white mb-4">12. Contact Us</h2>
              <p className="text-white/70 leading-relaxed">
                If you have any questions, concerns, or requests regarding this Privacy Policy or our data practices, please contact us:
              </p>
              <ul className="text-white/70 mt-4 space-y-2">
                <li><strong className="text-white">Phone:</strong> +234 703 509 0096</li>
                <li><strong className="text-white">WhatsApp:</strong> +234 703 509 0096</li>
                <li><strong className="text-white">Email:</strong> info@armogrid.com</li>
                <li><strong className="text-white">Address:</strong> Lagos, Nigeria</li>
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
