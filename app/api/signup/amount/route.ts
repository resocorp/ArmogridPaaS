import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

// Force dynamic rendering to prevent caching
export const dynamic = 'force-dynamic';
export const revalidate = 0;

const DEFAULT_SIGNUP_AMOUNT = 2000; // Default ₦2,000

export async function GET() {
  try {
    console.log('[Signup Amount] Fetching signup_amount from admin_settings...');
    
    const { data, error } = await supabaseAdmin
      .from('admin_settings')
      .select('value')
      .eq('key', 'signup_amount')
      .single();

    if (error) {
      console.log('[Signup Amount] Error or not found:', error.message);
      // Return default amount if setting not found
      return NextResponse.json({
        success: true,
        amount: DEFAULT_SIGNUP_AMOUNT,
        source: 'default',
      }, {
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate',
        },
      });
    }

    const amount = parseInt(data.value) || DEFAULT_SIGNUP_AMOUNT;
    console.log('[Signup Amount] Found amount:', amount);

    return NextResponse.json({
      success: true,
      amount,
      source: 'database',
    }, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate',
      },
    });
  } catch (error: any) {
    console.error('[Signup Amount] Error:', error);
    return NextResponse.json({
      success: true,
      amount: DEFAULT_SIGNUP_AMOUNT,
      source: 'error_fallback',
    }, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate',
      },
    });
  }
}
