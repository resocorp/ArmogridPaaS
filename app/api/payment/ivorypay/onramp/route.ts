import { NextRequest, NextResponse } from 'next/server';
import { 
  createVirtualAccount, 
  getVirtualAccountByReference,
  generateCustomerReference,
  generateIvoryPayReference,
  calculateIvoryPayFee 
} from '@/lib/ivorypay';
import { iotClient } from '@/lib/iot-client';
import { getAdminToken } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase';
import { nairaToKobo, isValidMeterId, translateErrorMessage } from '@/lib/utils';
import { MIN_RECHARGE_AMOUNT, MAX_RECHARGE_AMOUNT } from '@/lib/constants';

export async function POST(request: NextRequest) {
  try {
    console.log('\n[IvoryPay OnRamp] ===== Starting on-ramp payment initialization =====');
    const body = await request.json();
    const { 
      meterId, 
      amount, 
      email, 
      phone, 
      firstName, 
      lastName,
      dob,
      bvn,
      gender,
      userId 
    } = body;
    
    console.log('[IvoryPay OnRamp] Request body:', { 
      meterId, 
      amount, 
      email, 
      phone, 
      firstName, 
      lastName, 
      userId 
    });

    // Validate inputs
    if (!meterId || !isValidMeterId(meterId)) {
      console.error('[IvoryPay OnRamp] Invalid meter ID:', meterId);
      return NextResponse.json(
        { error: 'Valid meter ID is required' },
        { status: 400 }
      );
    }

    if (!amount || amount < MIN_RECHARGE_AMOUNT || amount > MAX_RECHARGE_AMOUNT) {
      console.error('[IvoryPay OnRamp] Invalid amount:', amount);
      return NextResponse.json(
        { error: `Amount must be between ₦${MIN_RECHARGE_AMOUNT} and ₦${MAX_RECHARGE_AMOUNT}` },
        { status: 400 }
      );
    }

    if (!email || !email.includes('@')) {
      console.error('[IvoryPay OnRamp] Invalid email:', email);
      return NextResponse.json(
        { error: 'Valid email address is required' },
        { status: 400 }
      );
    }

    if (!firstName || !lastName) {
      console.error('[IvoryPay OnRamp] Missing name:', { firstName, lastName });
      return NextResponse.json(
        { error: 'First name and last name are required for bank transfer payments' },
        { status: 400 }
      );
    }

    if (!phone) {
      console.error('[IvoryPay OnRamp] Missing phone');
      return NextResponse.json(
        { error: 'Phone number is required for bank transfer payments' },
        { status: 400 }
      );
    }

    // For Nigerian virtual accounts, BVN and DOB are required
    if (!bvn || !dob || !gender) {
      console.error('[IvoryPay OnRamp] Missing KYC info:', { bvn: !!bvn, dob: !!dob, gender: !!gender });
      return NextResponse.json(
        { error: 'BVN, date of birth, and gender are required for bank transfer payments in Nigeria' },
        { status: 400 }
      );
    }

    // Verify meter exists
    console.log('[IvoryPay OnRamp] Verifying meter exists...');
    try {
      const adminToken = await getAdminToken();
      const meterInfo = await iotClient.getMeterInfoById(meterId, adminToken);
      
      const isSuccess = 
        (meterInfo.success === '1') || 
        (meterInfo.code === 200 || meterInfo.code === 0);
      
      if (!isSuccess) {
        const rawErrorMsg = meterInfo.errorMsg || meterInfo.msg || 'Unknown error';
        const errorMsg = translateErrorMessage(rawErrorMsg);
        console.error('[IvoryPay OnRamp] Meter lookup failed:', errorMsg);
        return NextResponse.json(
          { error: `Meter not found: ${errorMsg}` },
          { status: 404 }
        );
      }
    } catch (error: any) {
      console.error('[IvoryPay OnRamp] Error verifying meter:', error);
      return NextResponse.json(
        { error: `Meter not found or unavailable: ${error.message}` },
        { status: 404 }
      );
    }

    // Generate unique references
    const customerReference = generateCustomerReference(meterId);
    const paymentReference = generateIvoryPayReference();
    const rechargeAmountInKobo = nairaToKobo(amount);
    const feeBreakdown = calculateIvoryPayFee(amount);
    
    console.log('[IvoryPay OnRamp] Generated references:', { customerReference, paymentReference });

    // Check if user already has a virtual account
    let virtualAccount;
    try {
      // Try to get existing virtual account for this meter
      const { data: existingVA } = await supabaseAdmin
        .from('virtual_accounts')
        .select('*')
        .eq('meter_id', meterId)
        .eq('status', 'active')
        .single();

      if (existingVA) {
        console.log('[IvoryPay OnRamp] Using existing virtual account:', existingVA.account_number);
        virtualAccount = {
          accountNumber: existingVA.account_number,
          bankName: existingVA.bank_name,
          bankIdentifier: existingVA.bank_identifier,
          uuid: existingVA.ivorypay_uuid,
          customerReference: existingVA.customer_reference,
        };
      }
    } catch (error) {
      console.log('[IvoryPay OnRamp] No existing virtual account found, will create new one');
    }

    // Create new virtual account if none exists
    if (!virtualAccount) {
      console.log('[IvoryPay OnRamp] Creating new virtual account...');
      try {
        const vaResponse = await createVirtualAccount({
          firstName,
          lastName,
          email,
          phoneNumber: phone,
          dob,
          bvn,
          gender,
          customerReference,
        });

        if (vaResponse.status !== 'success' && !vaResponse.success) {
          throw new Error(vaResponse.message || 'Failed to create virtual account');
        }

        virtualAccount = vaResponse.data;
        console.log('[IvoryPay OnRamp] Virtual account created:', {
          accountNumber: virtualAccount.accountNumber,
          bankName: virtualAccount.bankName,
        });

        // Save virtual account to database
        await supabaseAdmin.from('virtual_accounts').insert({
          meter_id: meterId,
          account_number: virtualAccount.accountNumber,
          bank_name: virtualAccount.bankName,
          bank_identifier: virtualAccount.bankIdentifier,
          currency: virtualAccount.currency || 'NGN',
          customer_reference: virtualAccount.customerReference,
          ivorypay_uuid: virtualAccount.uuid,
          customer_email: email,
          customer_phone: phone,
          customer_first_name: firstName,
          customer_last_name: lastName,
          status: 'active',
        });
      } catch (error: any) {
        console.error('[IvoryPay OnRamp] Failed to create virtual account:', error);
        return NextResponse.json(
          { error: `Failed to create virtual bank account: ${error.message}` },
          { status: 500 }
        );
      }
    }

    // Create pending transaction in database
    console.log('[IvoryPay OnRamp] Creating transaction record...');
    const { error: dbError } = await supabaseAdmin.from('transactions').insert({
      meter_id: meterId,
      amount_kobo: rechargeAmountInKobo,
      ivorypay_reference: paymentReference,
      ivorypay_status: 'pending',
      payment_gateway: 'ivorypay_onramp',
      customer_email: email,
      customer_phone: phone,
      user_id: userId || null,
      buy_type: 5, // New buy type for IvoryPay On-Ramp
      metadata: {
        amount_naira: amount,
        fee: feeBreakdown.fee,
        total_amount: feeBreakdown.totalAmount,
        payment_type: 'onramp',
        virtual_account: {
          accountNumber: virtualAccount.accountNumber,
          bankName: virtualAccount.bankName,
          customerReference: virtualAccount.customerReference,
        },
        customer: {
          firstName,
          lastName,
          email,
          phone,
        },
      },
    });

    if (dbError) {
      console.error('[IvoryPay OnRamp] Database error:', dbError);
      throw new Error(`Database error: ${dbError.message}`);
    }

    // Build payment page URL
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const paymentUrl = `${appUrl}/payment/bank-transfer?reference=${paymentReference}&account=${virtualAccount.accountNumber}&bank=${encodeURIComponent(virtualAccount.bankName)}&amount=${amount}&naira=${feeBreakdown.totalAmount}`;
    
    console.log('[IvoryPay OnRamp] Payment URL:', paymentUrl);
    console.log('[IvoryPay OnRamp] ===== On-ramp initialization completed =====\n');

    return NextResponse.json({
      success: true,
      data: {
        payment_url: paymentUrl,
        reference: paymentReference,
        account_number: virtualAccount.accountNumber,
        bank_name: virtualAccount.bankName,
        amount: amount,
        fee: feeBreakdown.fee,
        total_amount: feeBreakdown.totalAmount,
        customer_reference: virtualAccount.customerReference,
        instructions: `Transfer exactly ₦${feeBreakdown.totalAmount.toLocaleString()} to the account above. Your meter will be credited automatically once payment is confirmed.`,
      },
    });
  } catch (error: any) {
    console.error('[IvoryPay OnRamp] ===== On-ramp initialization failed =====');
    console.error('[IvoryPay OnRamp] Error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to initialize on-ramp payment' },
      { status: 500 }
    );
  }
}
