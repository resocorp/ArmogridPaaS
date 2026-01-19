import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { generatePaymentReference, initializePayment, calculatePaystackFee } from '@/lib/paystack';
import { nairaToKobo } from '@/lib/utils';

export async function POST(request: NextRequest) {
  try {
    console.log('\n[Signup] ===== Starting customer registration =====');
    const body = await request.json();
    const { name, email, phone, roomNumber, locationId, locationName } = body;

    // Validate inputs
    if (!name || name.trim().length < 2) {
      return NextResponse.json(
        { error: 'Valid name is required (minimum 2 characters)' },
        { status: 400 }
      );
    }

    if (!email || !email.includes('@')) {
      return NextResponse.json(
        { error: 'Valid email address is required' },
        { status: 400 }
      );
    }

    if (!phone || phone.length < 10) {
      return NextResponse.json(
        { error: 'Valid phone number is required' },
        { status: 400 }
      );
    }

    if (!roomNumber || roomNumber.trim().length < 1) {
      return NextResponse.json(
        { error: 'Room number is required' },
        { status: 400 }
      );
    }

    if (!locationId) {
      return NextResponse.json(
        { error: 'Location is required' },
        { status: 400 }
      );
    }

    // Get signup amount from settings
    const { data: settingData } = await supabaseAdmin
      .from('admin_settings')
      .select('value')
      .eq('key', 'signup_amount')
      .single();

    const signupAmountNaira = parseInt(settingData?.value || '50000');
    console.log('[Signup] Signup amount (Naira):', signupAmountNaira);

    // Calculate Paystack fees
    const feeBreakdown = calculatePaystackFee(signupAmountNaira, 'local');
    const totalAmountKobo = nairaToKobo(feeBreakdown.totalAmount);
    const signupAmountKobo = nairaToKobo(signupAmountNaira);

    console.log('[Signup] Fee breakdown:', {
      signupAmount: signupAmountNaira,
      fee: feeBreakdown.fee,
      totalAmount: feeBreakdown.totalAmount,
    });

    // Generate payment reference
    const reference = generatePaymentReference();
    console.log('[Signup] Generated reference:', reference);

    // Create pending registration in database
    const { data: registration, error: dbError } = await supabaseAdmin
      .from('customer_registrations')
      .insert({
        name: name.trim(),
        email: email.trim().toLowerCase(),
        phone: phone.trim(),
        room_number: roomNumber.trim(),
        location_id: locationId,
        location_name: locationName || null,
        amount_paid: signupAmountKobo,
        paystack_reference: reference,
        payment_status: 'pending',
      })
      .select()
      .single();

    if (dbError) {
      console.error('[Signup] Database error:', dbError);
      throw new Error(`Database error: ${dbError.message}`);
    }
    console.log('[Signup] Registration record created:', registration.id);

    // Initialize Paystack payment with signup success callback
    console.log('[Signup] Initializing Paystack payment...');
    const callbackUrl = `${process.env.NEXT_PUBLIC_APP_URL}/signup/success?reference=${reference}&name=${encodeURIComponent(name)}`;
    const paymentResponse = await initializePayment(
      email,
      totalAmountKobo,
      reference,
      {
        type: 'customer_registration',
        registrationId: registration.id,
        name,
        phone,
        roomNumber,
        locationId,
        locationName,
        signupAmount: signupAmountNaira,
        paystackFee: feeBreakdown.fee,
        totalCharged: feeBreakdown.totalAmount,
        custom_fields: [
          { display_name: 'Name', variable_name: 'name', value: name },
          { display_name: 'Phone', variable_name: 'phone', value: phone },
          { display_name: 'Room Number', variable_name: 'room_number', value: roomNumber },
          { display_name: 'Location', variable_name: 'location', value: locationName || locationId },
        ],
      },
      callbackUrl
    );

    if (!paymentResponse.status) {
      console.error('[Signup] Paystack initialization failed:', paymentResponse.message);
      throw new Error(paymentResponse.message);
    }
    console.log('[Signup] Paystack payment initialized successfully');

    console.log('[Signup] ===== Registration initialization completed =====\n');
    return NextResponse.json({
      success: true,
      data: {
        authorization_url: paymentResponse.data.authorization_url,
        access_code: paymentResponse.data.access_code,
        reference: paymentResponse.data.reference,
        registrationId: registration.id,
        amount: signupAmountNaira,
        fee: feeBreakdown.fee,
        total: feeBreakdown.totalAmount,
      },
    });
  } catch (error: any) {
    console.error('[Signup] ===== Registration failed =====');
    console.error('[Signup] Error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to process registration' },
      { status: 500 }
    );
  }
}
