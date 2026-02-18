import { NextRequest, NextResponse } from 'next/server';
import { initiateBuyCrypto, generateUuidV4 } from '@/lib/ivorypay';
import { iotClient } from '@/lib/iot-client';
import { getAdminToken } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase';
import { MIN_RECHARGE_AMOUNT, MAX_RECHARGE_AMOUNT } from '@/lib/constants';

/**
 * POST /api/payment/ivorypay/bank-transfer
 * Initialize a bank transfer payment using IvoryPay Buy Crypto API
 * NO KYC REQUIRED - generates temporary bank account for each transaction
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { meterId, amount, email } = body;

    console.log('[Bank Transfer] Initializing payment:', { meterId, amount, email });

    // Validate required fields
    if (!meterId || !amount || !email) {
      return NextResponse.json(
        { error: 'Missing required fields: meterId, amount, email' },
        { status: 400 }
      );
    }

    // Validate amount
    const amountNum = parseFloat(amount);
    if (isNaN(amountNum) || amountNum < MIN_RECHARGE_AMOUNT || amountNum > MAX_RECHARGE_AMOUNT) {
      return NextResponse.json(
        { error: `Amount must be between ₦${MIN_RECHARGE_AMOUNT} and ₦${MAX_RECHARGE_AMOUNT}` },
        { status: 400 }
      );
    }

    // Validate email
    if (!email.includes('@')) {
      return NextResponse.json(
        { error: 'Invalid email address' },
        { status: 400 }
      );
    }

    // Verify meter exists
    console.log('[Bank Transfer] Verifying meter:', meterId);
    const adminToken = await getAdminToken();
    const meterInfo = await iotClient.getMeterInfoById(meterId, adminToken);

    if (meterInfo.success !== '1' || !meterInfo.data) {
      return NextResponse.json(
        { error: 'Meter not found. Please check your meter ID.' },
        { status: 404 }
      );
    }

    console.log('[Bank Transfer] Meter verified:', meterInfo.data.roomNo);

    // Generate unique reference (must be UUIDv4)
    const reference = generateUuidV4();
    const amountKobo = Math.round(amountNum * 100);

    // Calculate business fee (optional - set to 0 if not charging extra)
    const businessFee = 0;

    // Initiate Buy Crypto (Bank Transfer)
    console.log('[Bank Transfer] Calling IvoryPay Buy Crypto API...');
    const buyResponse = await initiateBuyCrypto({
      fiatAmount: amountNum,
      reference,
      fiatCurrency: 'NGN',
      email,
      businessFeeInFiat: businessFee,
      note: `Meter recharge for ${meterId}`,
      redirectUrl: `${process.env.NEXT_PUBLIC_APP_URL || 'https://armogrid.vercel.app'}/payment/success`,
    });

    if (!buyResponse.success) {
      console.error('[Bank Transfer] IvoryPay API error:', buyResponse.message);
      return NextResponse.json(
        { error: buyResponse.message || 'Failed to initiate bank transfer' },
        { status: 400 }
      );
    }

    const { transferDetails } = buyResponse.data;
    console.log('[Bank Transfer] Got bank details:', {
      bank: transferDetails.bank,
      accountNumber: transferDetails.accountNumber,
      amountPayable: transferDetails.amountPayable,
      expiresAt: transferDetails.expiresAt,
    });

    // Create pending transaction record
    const { data: transaction, error: txError } = await supabaseAdmin
      .from('transactions')
      .insert({
        meter_id: meterId,
        amount_kobo: amountKobo,
        ivorypay_reference: reference,
        ivorypay_status: 'pending',
        payment_gateway: 'ivorypay_bank_transfer',
        customer_email: email,
        buy_type: 5,
        metadata: {
          amount_naira: amountNum,
          payment_type: 'bank_transfer',
          room_no: meterInfo.data.roomNo,
          transfer_details: transferDetails,
          ref_code: buyResponse.data.refCode,
        },
      })
      .select()
      .single();

    if (txError) {
      console.error('[Bank Transfer] Failed to create transaction:', txError);
      // Continue anyway - payment can still work
    }

    // Return bank transfer details to frontend
    return NextResponse.json({
      success: true,
      data: {
        reference,
        refCode: buyResponse.data.refCode,
        bankDetails: {
          accountName: transferDetails.accountName,
          accountNumber: transferDetails.accountNumber,
          bankName: transferDetails.bank,
          amount: transferDetails.amountPayable,
          currency: transferDetails.currency,
          expiresAt: transferDetails.expiresAt,
        },
        meterId,
        roomNo: meterInfo.data.roomNo,
        transactionId: transaction?.id,
      },
    });
  } catch (error: any) {
    console.error('[Bank Transfer] Error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to initialize bank transfer payment' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/payment/ivorypay/bank-transfer?reference=xxx
 * Check bank transfer payment status
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const reference = searchParams.get('reference');

    if (!reference) {
      return NextResponse.json(
        { error: 'Missing reference parameter' },
        { status: 400 }
      );
    }

    // Check transaction status in database
    const { data: transaction } = await supabaseAdmin
      .from('transactions')
      .select('*')
      .eq('ivorypay_reference', reference)
      .single();

    if (!transaction) {
      return NextResponse.json(
        { error: 'Transaction not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        reference,
        status: transaction.ivorypay_status,
        meterId: transaction.meter_id,
        amount: transaction.amount_kobo / 100,
        saleId: transaction.sale_id,
        creditedAt: transaction.metadata?.credited_at,
      },
    });
  } catch (error: any) {
    console.error('[Bank Transfer Status] Error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to check payment status' },
      { status: 500 }
    );
  }
}
