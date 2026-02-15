import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { generatePaymentReference, initializePayment, calculatePaystackFee } from '@/lib/paystack';
import { createPaymentLink, generateIvoryPayReference, calculateIvoryPayFee } from '@/lib/ivorypay';
import { nairaToKobo } from '@/lib/utils';
import type { PaymentGateway } from '@/types/ivorypay';

// Force dynamic rendering to prevent caching
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function POST(request: NextRequest) {
  try {
    console.log('\n[Signup] ===== Starting customer registration =====');
    const body = await request.json();
    const { name, email, phone, roomNumber, locationId, locationName, paymentGateway } = body;
    const gateway: PaymentGateway = paymentGateway || 'paystack';

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

    // Parse room numbers (comma-separated)
    const roomNumbers = roomNumber.split(',').map((r: string) => r.trim()).filter((r: string) => r.length > 0);
    const roomCount = roomNumbers.length;
    
    if (roomCount === 0) {
      return NextResponse.json(
        { error: 'At least one room number is required' },
        { status: 400 }
      );
    }
    console.log('[Signup] Room numbers:', roomNumbers, 'Count:', roomCount);

    // Get signup amount from settings (per room)
    const { data: settingData } = await supabaseAdmin
      .from('admin_settings')
      .select('value')
      .eq('key', 'signup_amount')
      .single();

    const unitAmountNaira = parseInt(settingData?.value || '2000');
    const signupAmountNaira = unitAmountNaira * roomCount;
    console.log('[Signup] Unit amount:', unitAmountNaira, 'Total for', roomCount, 'rooms:', signupAmountNaira);

    // Calculate fees based on payment gateway
    const signupAmountKobo = nairaToKobo(signupAmountNaira);
    let feeBreakdown: { originalAmount: number; fee: number; totalAmount: number; feeDescription: string };
    
    if (gateway === 'ivorypay') {
      feeBreakdown = calculateIvoryPayFee(signupAmountNaira);
    } else {
      const paystackFee = calculatePaystackFee(signupAmountNaira, 'local');
      feeBreakdown = {
        originalAmount: signupAmountNaira,
        fee: paystackFee.fee,
        totalAmount: paystackFee.totalAmount,
        feeDescription: paystackFee.feeDescription,
      };
    }
    
    const totalAmountKobo = nairaToKobo(feeBreakdown.totalAmount);

    console.log('[Signup] Fee breakdown:', {
      gateway,
      signupAmount: signupAmountNaira,
      fee: feeBreakdown.fee,
      totalAmount: feeBreakdown.totalAmount,
    });

    // Generate payment reference based on gateway
    const reference = gateway === 'ivorypay' 
      ? generateIvoryPayReference() 
      : generatePaymentReference();
    console.log('[Signup] Generated reference:', reference);

    // Create pending registration in database (store all rooms as comma-separated)
    const { data: registration, error: dbError } = await supabaseAdmin
      .from('customer_registrations')
      .insert({
        name: name.trim(),
        email: email.trim().toLowerCase(),
        phone: phone.trim(),
        room_number: roomNumbers.join(', '),
        location_id: locationId,
        location_name: locationName || null,
        amount_paid: signupAmountKobo,
        paystack_reference: gateway === 'paystack' ? reference : null,
        ivorypay_reference: gateway === 'ivorypay' ? reference : null,
        payment_gateway: gateway,
        payment_status: 'pending',
      })
      .select()
      .single();

    if (dbError) {
      console.error('[Signup] Database error:', dbError);
      throw new Error(`Database error: ${dbError.message}`);
    }
    console.log('[Signup] Registration record created:', registration.id);

    if (gateway === 'ivorypay') {
      // Initialize IvoryPay payment
      console.log('[Signup] Initializing IvoryPay payment...');
      const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
      
      const paymentLinkResponse = await createPaymentLink({
        name: `Customer Registration - ${name}`,
        description: `Registration for ${roomCount} room(s) at ${locationName || 'location'}`,
        baseFiat: 'NGN',
        amount: feeBreakdown.totalAmount,
        successMessage: `Thank you ${name}! Your registration has been received.`,
        redirectLink: `${appUrl}/signup/success?reference=${reference}&name=${encodeURIComponent(name)}&gateway=ivorypay`,
      });

      if (!paymentLinkResponse.success) {
        console.error('[Signup] IvoryPay initialization failed:', paymentLinkResponse.message);
        throw new Error(paymentLinkResponse.message);
      }
      console.log('[Signup] IvoryPay payment initialized successfully');

      const paymentUrl = `https://pl.ivorypay.io/pay/${paymentLinkResponse.data.reference}`;

      console.log('[Signup] ===== Registration initialization completed =====\n');
      return NextResponse.json({
        success: true,
        data: {
          payment_url: paymentUrl,
          reference: reference,
          registrationId: registration.id,
          roomCount,
          unitAmount: unitAmountNaira,
          amount: signupAmountNaira,
          fee: feeBreakdown.fee,
          total: feeBreakdown.totalAmount,
        },
      });
    } else {
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
          roomNumbers,
          roomCount,
          locationId,
          locationName,
          unitAmount: unitAmountNaira,
          signupAmount: signupAmountNaira,
          paystackFee: feeBreakdown.fee,
          totalCharged: feeBreakdown.totalAmount,
          custom_fields: [
            { display_name: 'Name', variable_name: 'name', value: name },
            { display_name: 'Phone', variable_name: 'phone', value: phone },
            { display_name: 'Room(s)', variable_name: 'room_number', value: roomNumbers.join(', ') },
            { display_name: 'Room Count', variable_name: 'room_count', value: String(roomCount) },
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
          roomCount,
          unitAmount: unitAmountNaira,
          amount: signupAmountNaira,
          fee: feeBreakdown.fee,
          total: feeBreakdown.totalAmount,
        },
      });
    }
  } catch (error: any) {
    console.error('[Signup] ===== Registration failed =====');
    console.error('[Signup] Error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to process registration' },
      { status: 500 }
    );
  }
}
