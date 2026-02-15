import { NextRequest, NextResponse } from 'next/server';
import { initiateTransaction, generateIvoryPayReference, calculateIvoryPayFee, getPaymentGatewayConfig } from '@/lib/ivorypay';
import { iotClient } from '@/lib/iot-client';
import { getAdminToken } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase';
import { nairaToKobo, isValidMeterId, translateErrorMessage } from '@/lib/utils';
import { MIN_RECHARGE_AMOUNT, MAX_RECHARGE_AMOUNT } from '@/lib/constants';

export async function POST(request: NextRequest) {
  try {
    console.log('\n[IvoryPay Init] ===== Starting IvoryPay payment initialization =====');
    const body = await request.json();
    const { meterId, amount, email, phone, userId } = body;
    console.log('[IvoryPay Init] Request body:', { meterId, amount, email, phone, userId });

    // Validate inputs
    if (!meterId || !isValidMeterId(meterId)) {
      console.error('[IvoryPay Init] Invalid meter ID:', meterId);
      return NextResponse.json(
        { error: 'Valid meter ID is required' },
        { status: 400 }
      );
    }

    if (!amount || amount < MIN_RECHARGE_AMOUNT || amount > MAX_RECHARGE_AMOUNT) {
      console.error('[IvoryPay Init] Invalid amount:', amount);
      return NextResponse.json(
        { error: `Amount must be between ₦${MIN_RECHARGE_AMOUNT} and ₦${MAX_RECHARGE_AMOUNT}` },
        { status: 400 }
      );
    }

    if (!email || !email.includes('@')) {
      console.error('[IvoryPay Init] Invalid email:', email);
      return NextResponse.json(
        { error: 'Valid email address is required' },
        { status: 400 }
      );
    }

    // Verify meter exists
    console.log('[IvoryPay Init] Verifying meter exists...');
    try {
      const adminToken = await getAdminToken();
      const meterInfo = await iotClient.getMeterInfoById(meterId, adminToken);
      
      const isSuccess = 
        (meterInfo.success === '1') || 
        (meterInfo.code === 200 || meterInfo.code === 0);
      
      if (!isSuccess) {
        const rawErrorMsg = meterInfo.errorMsg || meterInfo.msg || 'Unknown error';
        const errorMsg = translateErrorMessage(rawErrorMsg);
        console.error('[IvoryPay Init] Meter lookup failed:', errorMsg);
        return NextResponse.json(
          { error: `Meter not found: ${errorMsg}` },
          { status: 404 }
        );
      }
    } catch (error: any) {
      console.error('[IvoryPay Init] Error verifying meter:', error);
      return NextResponse.json(
        { error: `Meter not found or unavailable: ${error.message}` },
        { status: 404 }
      );
    }

    // Calculate fees
    const feeBreakdown = calculateIvoryPayFee(amount);
    console.log('[IvoryPay Init] Fee calculation:', feeBreakdown);

    // Generate unique reference
    const reference = generateIvoryPayReference();
    const rechargeAmountInKobo = nairaToKobo(amount);
    console.log('[IvoryPay Init] Generated reference:', reference);

    // Create pending transaction in database
    console.log('[IvoryPay Init] Creating transaction record...');
    const { error: dbError } = await supabaseAdmin.from('transactions').insert({
      meter_id: meterId,
      amount_kobo: rechargeAmountInKobo,
      ivorypay_reference: reference,
      ivorypay_status: 'pending',
      payment_gateway: 'ivorypay',
      customer_email: email,
      customer_phone: phone || null,
      user_id: userId || null,
      buy_type: 4, // New buy type for IvoryPay
      metadata: {
        amount_naira: amount,
        fee: feeBreakdown.fee,
        total_amount: feeBreakdown.totalAmount,
      },
    });

    if (dbError) {
      console.error('[IvoryPay Init] Database error:', dbError);
      throw new Error(`Database error: ${dbError.message}`);
    }

    // Get payment gateway config for default crypto
    const config = await getPaymentGatewayConfig();
    const crypto = config.ivorypayDefaultCrypto || 'USDT';

    // Create IvoryPay transaction using the transactions endpoint
    console.log('[IvoryPay Init] Creating IvoryPay transaction...');
    const transactionResponse = await initiateTransaction({
      baseFiat: 'NGN',
      amount: feeBreakdown.totalAmount,
      crypto: crypto,
      email: email,
      reference: reference,
      metadata: {
        meterId: meterId,
        originalAmount: amount,
        fee: feeBreakdown.fee,
      },
    });

    if (!transactionResponse.success) {
      console.error('[IvoryPay Init] Failed to create transaction:', transactionResponse.message);
      throw new Error(transactionResponse.message);
    }

    const txData = transactionResponse.data;
    console.log('[IvoryPay Init] Transaction created:', {
      reference: txData.reference,
      address: txData.address,
      expectedAmountInCrypto: txData.expectedAmountWithFeeInCrypto,
      crypto: txData.crypto,
    });

    // Update transaction with IvoryPay transaction details
    await supabaseAdmin
      .from('transactions')
      .update({
        crypto_amount: txData.expectedAmountWithFeeInCrypto,
        crypto_currency: txData.crypto,
        metadata: {
          amount_naira: amount,
          fee: feeBreakdown.fee,
          total_amount: feeBreakdown.totalAmount,
          ivorypay_tx_id: txData.id || txData.uuid,
          crypto_address: txData.address,
          expected_crypto_amount: txData.expectedAmountWithFeeInCrypto,
          usd_amount: txData.expectedAmountInUSD,
        },
      })
      .eq('ivorypay_reference', reference);

    // Build payment page URL with transaction details
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const paymentUrl = `${appUrl}/payment/crypto?reference=${reference}&address=${encodeURIComponent(txData.address)}&amount=${txData.expectedAmountWithFeeInCrypto}&crypto=${txData.crypto}&naira=${amount}`;
    console.log('[IvoryPay Init] Payment URL:', paymentUrl);

    console.log('[IvoryPay Init] ===== Payment initialization completed =====\n');
    return NextResponse.json({
      success: true,
      data: {
        payment_url: paymentUrl,
        reference: reference,
        ivorypay_reference: txData.reference,
        address: txData.address,
        amount: amount,
        fee: feeBreakdown.fee,
        total_amount: feeBreakdown.totalAmount,
        crypto_amount: txData.expectedAmountWithFeeInCrypto,
        crypto: txData.crypto,
        usd_amount: txData.expectedAmountInUSD,
      },
    });
  } catch (error: any) {
    console.error('[IvoryPay Init] ===== Payment initialization failed =====');
    console.error('[IvoryPay Init] Error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to initialize payment' },
      { status: 500 }
    );
  }
}
