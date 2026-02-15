import { NextRequest, NextResponse } from 'next/server';
import { getPaymentGatewayConfig, isIvoryPayConfigured } from '@/lib/ivorypay';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

/**
 * GET /api/payment/config - Get active payment gateway configuration (public endpoint)
 */
export async function GET(request: NextRequest) {
  try {
    const config = await getPaymentGatewayConfig();
    const ivorypayConfigured = isIvoryPayConfigured();

    // Check if Paystack is configured
    const paystackConfigured = !!(
      process.env.PAYSTACK_SECRET_KEY && 
      process.env.NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY
    );

    // Determine effective active gateway
    let effectiveGateway = config.activeGateway;
    
    // If selected gateway is not configured, fallback to the other
    if (effectiveGateway === 'ivorypay' && !ivorypayConfigured) {
      effectiveGateway = 'paystack';
    } else if (effectiveGateway === 'paystack' && !paystackConfigured) {
      effectiveGateway = 'ivorypay';
    }

    return NextResponse.json({
      success: true,
      data: {
        activeGateway: effectiveGateway,
        paystackEnabled: config.paystackEnabled && paystackConfigured,
        ivorypayEnabled: config.ivorypayEnabled && ivorypayConfigured,
        ivorypayDefaultCrypto: config.ivorypayDefaultCrypto,
      },
    });
  } catch (error: any) {
    console.error('Get payment config error:', error);
    return NextResponse.json({
      success: true,
      data: {
        activeGateway: 'paystack',
        paystackEnabled: true,
        ivorypayEnabled: false,
        ivorypayDefaultCrypto: 'USDT',
      },
    });
  }
}
