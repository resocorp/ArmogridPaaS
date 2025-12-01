import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin, getAdminToken } from '@/lib/auth';
import { iotClient } from '@/lib/iot-client';
import { supabaseAdmin } from '@/lib/supabase';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ meterId: string }> }
) {
  try {
    const session = await requireAdmin();
    const adminToken = await getAdminToken();
    const { meterId } = await params;

    const body = await request.json();
    const { amount, note } = body; // amount in Naira

    if (!amount || amount <= 0) {
      return NextResponse.json(
        { error: 'Invalid recharge amount' },
        { status: 400 }
      );
    }

    // Convert to kobo for IoT API
    const amountKobo = Math.round(amount * 100);

    // Generate unique sale ID
    const saleId = `ADMIN-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    // Call IoT API to credit meter
    const response = await iotClient.salePower(
      {
        meterId,
        saleMoney: amountKobo,
        buyType: 0, // 0 = Cash (admin manual credit)
        saleId,
      },
      adminToken
    );

    // Handle new API format
    if (response.success !== undefined) {
      if (response.success === '1') {
        // Log the manual recharge in Supabase
        await supabaseAdmin.from('transactions').insert({
          meter_id: meterId,
          amount_kobo: amountKobo,
          paystack_reference: saleId,
          paystack_status: 'success',
          sale_id: saleId,
          buy_type: 0,
          user_id: session.userId,
          metadata: {
            type: 'admin_manual_recharge',
            admin_username: session.username,
            note: note || 'Manual admin recharge',
          },
        });

        return NextResponse.json({
          success: true,
          message: `Successfully credited ₦${amount.toLocaleString()} to meter`,
          saleId,
          newBalance: response.data?.balance,
        });
      } else {
        return NextResponse.json(
          { error: response.errorMsg || 'Failed to recharge meter' },
          { status: 400 }
        );
      }
    }

    // Handle legacy format
    if (response.code === 200 || response.code === 0) {
      // Log the manual recharge
      await supabaseAdmin.from('transactions').insert({
        meter_id: meterId,
        amount_kobo: amountKobo,
        paystack_reference: saleId,
        paystack_status: 'success',
        sale_id: saleId,
        buy_type: 0,
        user_id: session.userId,
        metadata: {
          type: 'admin_manual_recharge',
          admin_username: session.username,
          note: note || 'Manual admin recharge',
        },
      });

      return NextResponse.json({
        success: true,
        message: `Successfully credited ₦${amount.toLocaleString()} to meter`,
        saleId,
        newBalance: response.data?.balance,
      });
    }

    return NextResponse.json(
      { error: response.msg || 'Failed to recharge meter' },
      { status: 400 }
    );
  } catch (error: any) {
    console.error('Manual recharge error:', error);
    
    if (error.message === 'Unauthorized' || error.message.includes('Admin')) {
      return NextResponse.json(
        { error: 'Admin access required' },
        { status: 403 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to recharge meter' },
      { status: 500 }
    );
  }
}
