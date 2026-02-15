import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase';
import { getPaymentGatewayConfig, isIvoryPayConfigured } from '@/lib/ivorypay';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

/**
 * GET /api/admin/payment-settings - Get payment gateway configuration
 */
export async function GET(request: NextRequest) {
  try {
    await requireAdmin();

    const config = await getPaymentGatewayConfig();
    const ivorypayConfigured = isIvoryPayConfigured();

    // Check if Paystack is configured
    const paystackConfigured = !!(
      process.env.PAYSTACK_SECRET_KEY && 
      process.env.NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY
    );

    return NextResponse.json({
      success: true,
      data: {
        ...config,
        paystackConfigured,
        ivorypayConfigured,
      },
    });
  } catch (error: any) {
    console.error('Get payment settings error:', error);
    
    if (error.message === 'Unauthorized' || error.message.includes('Admin')) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    return NextResponse.json({ error: 'Failed to fetch payment settings' }, { status: 500 });
  }
}

/**
 * PUT /api/admin/payment-settings - Update payment gateway configuration
 */
export async function PUT(request: NextRequest) {
  try {
    await requireAdmin();

    const body = await request.json();
    const { settings } = body;

    if (!settings || typeof settings !== 'object') {
      return NextResponse.json({ error: 'Settings object is required' }, { status: 400 });
    }

    // Validate settings keys
    const allowedKeys = [
      'active_payment_gateway',
      'paystack_enabled',
      'ivorypay_enabled',
      'ivorypay_default_crypto',
      'ivorypay_auto_swap_to_usdt',
    ];

    // Validate active_payment_gateway value
    if (settings.active_payment_gateway && 
        !['paystack', 'ivorypay'].includes(settings.active_payment_gateway)) {
      return NextResponse.json({ 
        error: 'Invalid payment gateway. Must be "paystack" or "ivorypay"' 
      }, { status: 400 });
    }

    // Validate ivorypay_default_crypto value
    if (settings.ivorypay_default_crypto && 
        !['USDT', 'USDC', 'SOL'].includes(settings.ivorypay_default_crypto)) {
      return NextResponse.json({ 
        error: 'Invalid crypto currency. Must be "USDT", "USDC", or "SOL"' 
      }, { status: 400 });
    }

    const updates = Object.entries(settings)
      .filter(([key]) => allowedKeys.includes(key))
      .map(([key, value]) => ({
        key,
        value: String(value),
        updated_at: new Date().toISOString(),
      }));

    if (updates.length === 0) {
      return NextResponse.json({ error: 'No valid settings provided' }, { status: 400 });
    }

    const { error } = await supabaseAdmin
      .from('admin_settings')
      .upsert(updates, { onConflict: 'key' });

    if (error) {
      console.error('Failed to update payment settings:', error);
      return NextResponse.json({ error: 'Failed to update settings' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: 'Payment settings updated successfully',
    });
  } catch (error: any) {
    console.error('Update payment settings error:', error);
    
    if (error.message === 'Unauthorized' || error.message.includes('Admin')) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    return NextResponse.json({ error: 'Failed to update payment settings' }, { status: 500 });
  }
}
