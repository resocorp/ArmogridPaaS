/**
 * Paystack webhook endpoint (plural path)
 * This re-exports the handler from /api/webhook/paystack to support both paths
 * Paystack dashboard is configured to call /api/webhooks/paystack
 */
export { POST } from '@/app/api/webhook/paystack/route';
