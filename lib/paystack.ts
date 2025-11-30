import crypto from 'crypto';
import type { InitializePaymentResponse, VerifyPaymentResponse } from '@/types/payment';
import { PAYSTACK_FEE } from '@/lib/constants';

const PAYSTACK_SECRET_KEY = process.env.PAYSTACK_SECRET_KEY!;
const PAYSTACK_PUBLIC_KEY = process.env.NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY!;

if (!PAYSTACK_SECRET_KEY) {
  throw new Error('Missing PAYSTACK_SECRET_KEY environment variable');
}

/**
 * Calculate Paystack transaction fee (Nigeria - NGN)
 * 
 * Local transactions: 1.5% + ₦100 (capped at ₦2,000)
 * - ₦100 fee is waived for transactions under ₦2,500
 * 
 * International transactions:
 * - Mastercard/Visa/Verve: 3.9% + ₦100
 * - American Express: 4.5%
 * 
 * @param amount - Amount in Naira
 * @param cardType - Type of card: 'local', 'international', or 'amex'
 * @returns Fee breakdown with total amount to charge
 */
export function calculatePaystackFee(
  amount: number, 
  cardType: 'local' | 'international' | 'amex' = 'local'
): {
  originalAmount: number;
  fee: number;
  totalAmount: number;
  feeDescription: string;
} {
  let fee: number;
  let feeDescription: string;

  if (cardType === 'amex') {
    // American Express: 4.5%
    fee = Math.ceil(amount * PAYSTACK_FEE.INTERNATIONAL_AMEX_PERCENTAGE);
    feeDescription = '4.5%';
  } else if (cardType === 'international') {
    // International cards (Mastercard/Visa/Verve): 3.9% + ₦100
    fee = Math.ceil((amount * PAYSTACK_FEE.INTERNATIONAL_PERCENTAGE) + PAYSTACK_FEE.INTERNATIONAL_FLAT);
    feeDescription = '3.9% + ₦100';
  } else {
    // Local cards: 1.5% + ₦100 (capped at ₦2,000)
    // ₦100 fee is waived for transactions under ₦2,500
    const percentageFee = Math.ceil(amount * PAYSTACK_FEE.LOCAL_PERCENTAGE);
    const flatFee = amount >= PAYSTACK_FEE.LOCAL_FLAT_THRESHOLD ? PAYSTACK_FEE.LOCAL_FLAT : 0;
    
    fee = percentageFee + flatFee;
    fee = Math.min(fee, PAYSTACK_FEE.LOCAL_CAP); // Cap at ₦2,000
    
    if (amount < PAYSTACK_FEE.LOCAL_FLAT_THRESHOLD) {
      feeDescription = '1.5% (₦100 fee waived)';
    } else {
      feeDescription = '1.5% + ₦100 (capped at ₦2,000)';
    }
  }

  return {
    originalAmount: amount,
    fee,
    totalAmount: amount + fee,
    feeDescription,
  };
}

/**
 * Calculate the amount to charge customer (including fees)
 * This is what will be sent to Paystack
 * 
 * @param rechargeAmount - The amount customer wants to recharge (in Naira)
 * @param cardType - Type of card: 'local', 'international', or 'amex'
 * @returns Amount to charge in kobo (including fees)
 */
export function calculateChargeAmount(
  rechargeAmount: number, 
  cardType: 'local' | 'international' | 'amex' = 'local'
): number {
  const { totalAmount } = calculatePaystackFee(rechargeAmount, cardType);
  return totalAmount * 100; // Convert to kobo
}

/**
 * Initialize Paystack payment
 */
export async function initializePayment(
  email: string,
  amount: number, // in kobo
  reference: string,
  metadata?: Record<string, any>
): Promise<InitializePaymentResponse> {
  const response = await fetch('https://api.paystack.co/transaction/initialize', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      email,
      amount,
      reference,
      currency: 'NGN',
      metadata,
      callback_url: `${process.env.NEXT_PUBLIC_APP_URL}/payment/success`,
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to initialize payment');
  }

  return response.json();
}

/**
 * Verify Paystack payment
 */
export async function verifyPayment(reference: string): Promise<VerifyPaymentResponse> {
  const response = await fetch(`https://api.paystack.co/transaction/verify/${reference}`, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
    },
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to verify payment');
  }

  return response.json();
}

/**
 * Verify Paystack webhook signature
 */
export function verifyWebhookSignature(payload: string, signature: string): boolean {
  const hash = crypto
    .createHmac('sha512', PAYSTACK_SECRET_KEY)
    .update(payload)
    .digest('hex');
  
  return hash === signature;
}

/**
 * Get Paystack public key (for client-side)
 */
export function getPaystackPublicKey(): string {
  return PAYSTACK_PUBLIC_KEY;
}

/**
 * Generate unique payment reference
 */
export function generatePaymentReference(): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 9);
  return `AG_${timestamp}_${random}`.toUpperCase();
}
