import crypto from 'crypto';
import type {
  IvoryPayCreatePaymentLinkRequest,
  IvoryPayCreatePaymentLinkResponse,
  IvoryPayInitiateTransactionRequest,
  IvoryPayInitiateTransactionResponse,
  IvoryPayVerifyTransactionResponse,
  IvoryPaySwapRequest,
  IvoryPaySwapResponse,
  IvoryPayCrypto,
  PaymentGateway,
} from '@/types/ivorypay';
import { supabaseAdmin } from '@/lib/supabase';

const IVORYPAY_SECRET_KEY = process.env.IVORYPAY_SECRET_KEY!;
const IVORYPAY_PUBLIC_KEY = process.env.NEXT_PUBLIC_IVORYPAY_PUBLIC_KEY!;
const IVORYPAY_API_URL = 'https://api.ivorypay.io/v1';

/**
 * Get IvoryPay API headers
 */
function getHeaders(): HeadersInit {
  return {
    'Authorization': IVORYPAY_SECRET_KEY,
    'Content-Type': 'application/json',
  };
}

/**
 * Create a payment link
 */
export async function createPaymentLink(
  request: IvoryPayCreatePaymentLinkRequest
): Promise<IvoryPayCreatePaymentLinkResponse> {
  // Ensure amount is a string as per IvoryPay API docs
  const payload = {
    ...request,
    amount: String(request.amount),
  };

  console.log('[IvoryPay] Creating payment link with payload:', JSON.stringify(payload));
  console.log('[IvoryPay] Using API URL:', `${IVORYPAY_API_URL}/payment-links`);
  console.log('[IvoryPay] Authorization key present:', !!IVORYPAY_SECRET_KEY);

  const response = await fetch(`${IVORYPAY_API_URL}/payment-links`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify(payload),
  });

  const responseText = await response.text();
  console.log('[IvoryPay] Response status:', response.status);
  console.log('[IvoryPay] Response body:', responseText);

  if (!response.ok) {
    let errorMessage = `HTTP ${response.status}: ${response.statusText}`;
    try {
      const errorData = JSON.parse(responseText);
      errorMessage = errorData.message || errorMessage;
    } catch {
      errorMessage = responseText || errorMessage;
    }
    throw new Error(errorMessage);
  }

  return JSON.parse(responseText);
}

/**
 * Initiate a transaction
 */
export async function initiateTransaction(
  request: IvoryPayInitiateTransactionRequest
): Promise<IvoryPayInitiateTransactionResponse> {
  console.log('[IvoryPay] Initiating transaction with payload:', JSON.stringify(request));
  console.log('[IvoryPay] Using API URL:', `${IVORYPAY_API_URL}/transactions`);

  const response = await fetch(`${IVORYPAY_API_URL}/transactions`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify(request),
  });

  const responseText = await response.text();
  console.log('[IvoryPay] Response status:', response.status);
  console.log('[IvoryPay] Response body:', responseText);

  if (!response.ok) {
    let errorMessage = `HTTP ${response.status}: ${response.statusText}`;
    try {
      const errorData = JSON.parse(responseText);
      errorMessage = errorData.message || errorMessage;
    } catch {
      errorMessage = responseText || errorMessage;
    }
    throw new Error(errorMessage);
  }

  return JSON.parse(responseText);
}

/**
 * Verify a transaction
 */
export async function verifyTransaction(
  reference: string
): Promise<IvoryPayVerifyTransactionResponse> {
  const response = await fetch(
    `${IVORYPAY_API_URL}/transactions/${reference}/verify`,
    {
      method: 'GET',
      headers: getHeaders(),
    }
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to verify transaction');
  }

  return response.json();
}

/**
 * Initiate a swap between cryptocurrencies
 */
export async function initiateSwap(
  request: IvoryPaySwapRequest
): Promise<IvoryPaySwapResponse> {
  const response = await fetch(`${IVORYPAY_API_URL}/swaps`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify(request),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to initiate swap');
  }

  return response.json();
}

/**
 * Execute a swap
 */
export async function executeSwap(swapId: string): Promise<IvoryPaySwapResponse> {
  const response = await fetch(`${IVORYPAY_API_URL}/swaps/${swapId}/execute`, {
    method: 'POST',
    headers: getHeaders(),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to execute swap');
  }

  return response.json();
}

/**
 * Fetch a swap by ID
 */
export async function fetchSwap(swapId: string): Promise<IvoryPaySwapResponse> {
  const response = await fetch(`${IVORYPAY_API_URL}/swaps/${swapId}`, {
    method: 'GET',
    headers: getHeaders(),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to fetch swap');
  }

  return response.json();
}

/**
 * Verify IvoryPay webhook signature
 * IvoryPay uses HMAC SHA512 with the secret key and JSON.stringify(req.body.data)
 */
export function verifyWebhookSignature(
  data: any,
  signature: string
): boolean {
  const hash = crypto
    .createHmac('sha512', IVORYPAY_SECRET_KEY)
    .update(JSON.stringify(data))
    .digest('hex');

  return hash === signature;
}

/**
 * Get IvoryPay public key (for client-side)
 */
export function getIvoryPayPublicKey(): string {
  return IVORYPAY_PUBLIC_KEY;
}

/**
 * Generate unique payment reference for IvoryPay
 */
export function generateIvoryPayReference(): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 10);
  return `IP_${timestamp}_${random}`.toUpperCase();
}

/**
 * Auto-swap received crypto to USDT
 * This is called after a successful payment to convert to USDT
 */
export async function autoSwapToUsdt(
  inputCrypto: IvoryPayCrypto,
  amount: number
): Promise<IvoryPaySwapResponse | null> {
  // Don't swap if already USDT
  if (inputCrypto === 'USDT') {
    return null;
  }

  try {
    // Initiate swap
    const swapResponse = await initiateSwap({
      inputCryptocurrency: inputCrypto,
      outputCryptocurrency: 'USDT',
      inputCryptocurrencyAmount: amount,
    });

    if (!swapResponse.success) {
      throw new Error('Failed to initiate swap');
    }

    // Execute swap
    const executeResponse = await executeSwap(swapResponse.data.uuid);
    
    return executeResponse;
  } catch (error) {
    console.error('Auto-swap to USDT failed:', error);
    return null;
  }
}

/**
 * Get active payment gateway from admin settings
 */
export async function getActivePaymentGateway(): Promise<PaymentGateway> {
  try {
    const { data } = await supabaseAdmin
      .from('admin_settings')
      .select('value')
      .eq('key', 'active_payment_gateway')
      .single();

    return (data?.value as PaymentGateway) || 'paystack';
  } catch (error) {
    console.error('Failed to get active payment gateway:', error);
    return 'paystack';
  }
}

/**
 * Get payment gateway configuration
 */
export async function getPaymentGatewayConfig(): Promise<{
  activeGateway: PaymentGateway;
  paystackEnabled: boolean;
  ivorypayEnabled: boolean;
  ivorypayDefaultCrypto: IvoryPayCrypto;
  ivorypayAutoSwapToUsdt: boolean;
}> {
  try {
    const { data } = await supabaseAdmin
      .from('admin_settings')
      .select('key, value')
      .in('key', [
        'active_payment_gateway',
        'paystack_enabled',
        'ivorypay_enabled',
        'ivorypay_default_crypto',
        'ivorypay_auto_swap_to_usdt',
      ]);

    const settings: Record<string, string> = {};
    data?.forEach((s: any) => {
      settings[s.key] = s.value;
    });

    return {
      activeGateway: (settings.active_payment_gateway as PaymentGateway) || 'paystack',
      paystackEnabled: settings.paystack_enabled !== 'false',
      ivorypayEnabled: settings.ivorypay_enabled === 'true',
      ivorypayDefaultCrypto: (settings.ivorypay_default_crypto as IvoryPayCrypto) || 'USDT',
      ivorypayAutoSwapToUsdt: settings.ivorypay_auto_swap_to_usdt !== 'false',
    };
  } catch (error) {
    console.error('Failed to get payment gateway config:', error);
    return {
      activeGateway: 'paystack',
      paystackEnabled: true,
      ivorypayEnabled: false,
      ivorypayDefaultCrypto: 'USDT',
      ivorypayAutoSwapToUsdt: true,
    };
  }
}

/**
 * Check if IvoryPay is configured
 */
export function isIvoryPayConfigured(): boolean {
  return !!(IVORYPAY_SECRET_KEY && IVORYPAY_PUBLIC_KEY);
}

/**
 * IvoryPay fee structure (approximately 1% for transactions)
 */
export const IVORYPAY_FEE = {
  PERCENTAGE: 0.01, // 1%
} as const;

/**
 * Calculate IvoryPay fee
 */
export function calculateIvoryPayFee(amount: number): {
  originalAmount: number;
  fee: number;
  totalAmount: number;
  feeDescription: string;
} {
  const fee = Math.ceil(amount * IVORYPAY_FEE.PERCENTAGE);
  
  return {
    originalAmount: amount,
    fee,
    totalAmount: amount + fee,
    feeDescription: '1% IvoryPay fee',
  };
}
