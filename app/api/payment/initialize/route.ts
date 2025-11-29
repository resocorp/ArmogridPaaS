import { NextRequest, NextResponse } from 'next/server';
import { initializePayment, generatePaymentReference } from '@/lib/paystack';
import { iotClient } from '@/lib/iot-client';
import { getAdminToken } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase';
import { nairaToKobo, isValidMeterId } from '@/lib/utils';
import { MIN_RECHARGE_AMOUNT, MAX_RECHARGE_AMOUNT } from '@/lib/constants';

export async function POST(request: NextRequest) {
  try {
    console.log('\n[Payment Init] ===== Starting payment initialization =====');
    const body = await request.json();
    const { meterId, amount, email, phone, userId } = body;
    console.log('[Payment Init] Request body:', { meterId, amount, email, phone, userId });

    // Validate inputs
    if (!meterId || !isValidMeterId(meterId)) {
      console.error('[Payment Init] Invalid meter ID:', meterId);
      return NextResponse.json(
        { error: 'Valid meter ID is required' },
        { status: 400 }
      );
    }
    console.log('[Payment Init] Meter ID validation passed');

    if (!amount || amount < MIN_RECHARGE_AMOUNT || amount > MAX_RECHARGE_AMOUNT) {
      console.error('[Payment Init] Invalid amount:', amount);
      return NextResponse.json(
        { error: `Amount must be between ₦${MIN_RECHARGE_AMOUNT} and ₦${MAX_RECHARGE_AMOUNT}` },
        { status: 400 }
      );
    }
    console.log('[Payment Init] Amount validation passed');

    // Email is required by Paystack API
    if (!email || !email.includes('@')) {
      console.error('[Payment Init] Invalid email:', email);
      return NextResponse.json(
        { error: 'Valid email address is required' },
        { status: 400 }
      );
    }
    console.log('[Payment Init] Email validation passed');

    const customerEmail = email;

    // Verify meter exists
    console.log('[Payment Init] Verifying meter exists...');
    try {
      const adminToken = await getAdminToken();
      console.log('[Payment Init] Admin token obtained, checking meter...');
      const meterInfo = await iotClient.getMeterInfoById(meterId, adminToken);
      console.log('[Payment Init] Meter info response:', JSON.stringify(meterInfo));
      
      // Check if the response indicates success (handle both API formats)
      const isSuccess = 
        (meterInfo.success === '1') || // New format
        (meterInfo.code === 200 || meterInfo.code === 0); // Legacy format
      
      if (!isSuccess) {
        const errorMsg = meterInfo.errorMsg || meterInfo.msg || 'Unknown error';
        console.error('[Payment Init] Meter lookup failed:', errorMsg);
        return NextResponse.json(
          { error: `Meter not found: ${errorMsg}` },
          { status: 404 }
        );
      }
      console.log('[Payment Init] Meter verification successful');
    } catch (error: any) {
      console.error('[Payment Init] Error verifying meter:', error);
      return NextResponse.json(
        { error: `Meter not found or unavailable: ${error.message}` },
        { status: 404 }
      );
    }

    // Generate payment reference
    const reference = generatePaymentReference();
    const amountKobo = nairaToKobo(amount);
    console.log('[Payment Init] Generated reference:', reference, 'Amount in kobo:', amountKobo);

    // Create pending transaction in database
    console.log('[Payment Init] Creating transaction record in database...');
    const { error: dbError } = await supabaseAdmin.from('transactions').insert({
      meter_id: meterId,
      amount_kobo: amountKobo,
      paystack_reference: reference,
      paystack_status: 'pending',
      customer_email: customerEmail,
      customer_phone: phone || null,
      user_id: userId || null,
      buy_type: 3,
      metadata: {
        amount_naira: amount,
      },
    });
    
    if (dbError) {
      console.error('[Payment Init] Database error:', dbError);
      throw new Error(`Database error: ${dbError.message}`);
    }
    console.log('[Payment Init] Transaction record created');

    // Initialize Paystack payment
    console.log('[Payment Init] Initializing Paystack payment...');
    const paymentResponse = await initializePayment(
      customerEmail,
      amountKobo,
      reference,
      {
        meterId,
        userId,
        custom_fields: [
          {
            display_name: 'Meter ID',
            variable_name: 'meter_id',
            value: meterId,
          },
        ],
      }
    );
    console.log('[Payment Init] Paystack response:', JSON.stringify(paymentResponse));

    if (!paymentResponse.status) {
      console.error('[Payment Init] Paystack initialization failed:', paymentResponse.message);
      throw new Error(paymentResponse.message);
    }
    console.log('[Payment Init] Paystack payment initialized successfully');

    console.log('[Payment Init] ===== Payment initialization completed successfully =====\n');
    return NextResponse.json({
      success: true,
      data: {
        authorization_url: paymentResponse.data.authorization_url,
        access_code: paymentResponse.data.access_code,
        reference: paymentResponse.data.reference,
      },
    });
  } catch (error: any) {
    console.error('[Payment Init] ===== Payment initialization failed =====');
    console.error('[Payment Init] Error:', error);
    console.error('[Payment Init] Stack trace:', error.stack);
    return NextResponse.json(
      { error: error.message || 'Failed to initialize payment' },
      { status: 500 }
    );
  }
}
