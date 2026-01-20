'use client';

import { useState } from 'react';
import { Zap, ChevronDown, ChevronUp, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

interface FAQItem {
  question: string;
  answer: string;
  category: string;
}

const faqs: FAQItem[] = [
  // Getting Started
  {
    category: 'Getting Started',
    question: 'What is ArmogridSolar?',
    answer: 'ArmogridSolar is a smart IoT prepaid electricity meter management platform. We provide instant meter recharge, real-time usage analytics, and remote meter control for residential and commercial properties.',
  },
  {
    category: 'Getting Started',
    question: 'How do I sign up for a new meter?',
    answer: 'To sign up for a new meter, visit our homepage and click on the "Sign Up" tab. Fill in your details including full name, email, phone number, room number, and select your location. After paying the one-time setup fee, our team will install your meter within 24-48 hours.',
  },
  {
    category: 'Getting Started',
    question: 'What is the minimum recharge amount?',
    answer: 'The minimum recharge amount is ₦500. There is no maximum limit, but we recommend recharging based on your typical usage patterns to avoid overpaying.',
  },
  // Payments & Billing
  {
    category: 'Payments & Billing',
    question: 'What payment methods do you accept?',
    answer: 'We accept all major payment methods through Paystack, including debit/credit cards (Visa, Mastercard, Verve), bank transfers, and USSD payments. All transactions are secured with bank-level encryption.',
  },
  {
    category: 'Payments & Billing',
    question: 'Are there any transaction fees?',
    answer: 'Yes, Paystack charges a small processing fee: 1.5% of the transaction amount plus ₦100 for transactions above ₦2,500. The ₦100 flat fee is waived for transactions below ₦2,500. The maximum fee is capped at ₦2,000.',
  },
  {
    category: 'Payments & Billing',
    question: 'How long does it take for my meter to be credited?',
    answer: 'Once payment is confirmed, your meter is credited instantly—typically within 60 seconds. You will receive an SMS and email confirmation with your recharge details.',
  },
  {
    category: 'Payments & Billing',
    question: 'What happens if my payment fails but money was deducted?',
    answer: 'If your payment fails but money was deducted, please wait 24 hours for automatic reversal. If the amount is not refunded, contact our support team with your transaction reference, and we will resolve it within 24-48 hours.',
  },
  // Meter Management
  {
    category: 'Meter Management',
    question: 'How do I check my meter balance?',
    answer: 'You can check your meter balance by logging into your dashboard. Your current balance, recent transactions, and usage statistics are all displayed in real-time.',
  },
  {
    category: 'Meter Management',
    question: 'Can I recharge someone else\'s meter?',
    answer: 'Yes! You can recharge any meter registered on our platform. Simply use the Quick Recharge feature on our homepage, enter the meter ID, amount, and your email for the receipt.',
  },
  {
    category: 'Meter Management',
    question: 'What happens when my meter balance is low?',
    answer: 'When your balance drops below a set threshold, you will receive SMS and email notifications alerting you to recharge. This helps prevent unexpected power disconnection.',
  },
  {
    category: 'Meter Management',
    question: 'Can I control my meter remotely?',
    answer: 'Yes, property managers and authorized users can remotely disconnect or reconnect meters through the admin dashboard. This feature is useful for managing vacant properties or addressing payment issues.',
  },
  // Technical Support
  {
    category: 'Technical Support',
    question: 'My meter is not responding. What should I do?',
    answer: 'First, check if there is a power outage in your area. If power is available, try resetting your meter by switching it off and on. If the issue persists, contact our support team immediately at +234 703 509 0096.',
  },
  {
    category: 'Technical Support',
    question: 'How do I report a faulty meter?',
    answer: 'Contact our support team via WhatsApp at +234 703 509 0096 or email info@armogrid.com. Provide your meter ID, location, and a description of the issue. Our technicians will respond within 24 hours.',
  },
  {
    category: 'Technical Support',
    question: 'Is ArmogridSolar available 24/7?',
    answer: 'Yes! Our online recharge platform is available 24/7, 365 days a year. Customer support is available during business hours (8 AM - 8 PM), but you can always reach us via WhatsApp for urgent issues.',
  },
];

export default function FAQsPage() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const [activeCategory, setActiveCategory] = useState<string>('All');

  const categories = ['All', ...Array.from(new Set(faqs.map(faq => faq.category)))];
  
  const filteredFaqs = activeCategory === 'All' 
    ? faqs 
    : faqs.filter(faq => faq.category === activeCategory);

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
              Frequently Asked Questions
            </h1>
            <p className="text-xl text-white/70">
              Find answers to common questions about our prepaid electricity service
            </p>
          </div>

          {/* Category Filter */}
          <div className="flex flex-wrap gap-2 justify-center mb-8">
            {categories.map((category) => (
              <button
                key={category}
                onClick={() => setActiveCategory(category)}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                  activeCategory === category
                    ? 'bg-armogrid-red text-white'
                    : 'bg-white/10 text-white/70 hover:bg-white/20 hover:text-white'
                }`}
              >
                {category}
              </button>
            ))}
          </div>

          {/* FAQ List */}
          <div className="space-y-4">
            {filteredFaqs.map((faq, index) => (
              <div
                key={index}
                className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl overflow-hidden"
              >
                <button
                  onClick={() => setOpenIndex(openIndex === index ? null : index)}
                  className="w-full px-6 py-4 flex items-center justify-between text-left hover:bg-white/5 transition-colors"
                >
                  <span className="font-medium text-white pr-4">{faq.question}</span>
                  {openIndex === index ? (
                    <ChevronUp className="w-5 h-5 text-armogrid-red flex-shrink-0" />
                  ) : (
                    <ChevronDown className="w-5 h-5 text-white/50 flex-shrink-0" />
                  )}
                </button>
                {openIndex === index && (
                  <div className="px-6 pb-4">
                    <p className="text-white/70 leading-relaxed">{faq.answer}</p>
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Contact CTA */}
          <div className="mt-12 text-center bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-8">
            <h2 className="text-2xl font-bold text-white mb-2">Still have questions?</h2>
            <p className="text-white/70 mb-6">
              Can't find the answer you're looking for? Our support team is here to help.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <a href="https://wa.me/2347035090096" target="_blank" rel="noopener noreferrer">
                <Button className="bg-green-600 hover:bg-green-700 text-white">
                  Chat on WhatsApp
                </Button>
              </a>
              <a href="mailto:info@armogrid.com">
                <Button className="bg-white/10 text-white border border-white/20 hover:bg-white/20">
                  Email Support
                </Button>
              </a>
            </div>
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
