/**
 * Paystack Inline (Popup) Integration
 * Client-side utility for processing payments without redirects
 */

export interface PaystackPopupOptions {
  key: string;
  email: string;
  amount: number; // in kobo
  ref: string;
  currency?: string;
  metadata?: Record<string, any>;
  onSuccess: (transaction: PaystackTransaction) => void;
  onCancel: () => void;
  onLoad?: (response: any) => void;
}

export interface PaystackTransaction {
  reference: string;
  status: string;
  trans: string;
  transaction: string;
  trxref: string;
  message?: string;
}

declare global {
  interface Window {
    PaystackPop: any;
  }
}

/**
 * Check if Paystack script is loaded
 */
export function isPaystackLoaded(): boolean {
  return typeof window !== 'undefined' && typeof window.PaystackPop !== 'undefined';
}

/**
 * Load Paystack inline script dynamically
 */
export function loadPaystackScript(): Promise<void> {
  return new Promise((resolve, reject) => {
    // Check if already loaded
    if (isPaystackLoaded()) {
      resolve();
      return;
    }

    // Check if script tag already exists
    const existingScript = document.querySelector('script[src*="paystack"]');
    if (existingScript) {
      existingScript.addEventListener('load', () => resolve());
      existingScript.addEventListener('error', () => reject(new Error('Failed to load Paystack script')));
      return;
    }

    // Create and load script
    const script = document.createElement('script');
    script.src = 'https://js.paystack.co/v2/inline.js';
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Failed to load Paystack script'));
    document.head.appendChild(script);
  });
}

/**
 * Initialize Paystack popup payment
 */
export async function initializePaystackPopup(options: PaystackPopupOptions): Promise<void> {
  // Ensure script is loaded
  await loadPaystackScript();

  if (!isPaystackLoaded()) {
    throw new Error('Paystack script failed to load');
  }

  // Initialize popup
  const popup = new window.PaystackPop();
  popup.newTransaction({
    key: options.key,
    email: options.email,
    amount: options.amount,
    ref: options.ref,
    currency: options.currency || 'NGN',
    metadata: options.metadata,
    onSuccess: (transaction: PaystackTransaction) => {
      options.onSuccess(transaction);
    },
    onCancel: () => {
      options.onCancel();
    },
    onLoad: options.onLoad,
  });
}

/**
 * Get Paystack public key from environment
 */
export function getPaystackPublicKey(): string {
  const key = process.env.NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY;
  if (!key) {
    throw new Error('NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY is not set');
  }
  return key;
}
