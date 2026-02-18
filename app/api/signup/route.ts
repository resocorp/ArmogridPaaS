import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { sendRegistrationSms, sendRegistrationAlertToAdmin } from '@/lib/sms';

// Force dynamic rendering to prevent caching
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function POST(request: NextRequest) {
  try {
    console.log('\n[Signup] ===== Starting FREE customer registration =====');
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

    // Create registration in database - FREE registration (no payment required)
    const { data: registration, error: dbError } = await supabaseAdmin
      .from('customer_registrations')
      .insert({
        name: name.trim(),
        email: email.trim().toLowerCase(),
        phone: phone.trim(),
        room_number: roomNumbers.join(', '),
        location_id: locationId,
        location_name: locationName || null,
        amount_paid: 0,
        payment_status: 'completed',
      })
      .select()
      .single();

    if (dbError) {
      console.error('[Signup] Database error:', dbError);
      throw new Error(`Database error: ${dbError.message}`);
    }
    console.log('[Signup] FREE registration record created:', registration.id);

    // Send SMS notifications (don't block on failure)
    const smsData = {
      name: name.trim(),
      phone: phone.trim(),
      email: email.trim().toLowerCase(),
      roomNumber: roomNumbers.join(', '),
      locationName: locationName || undefined,
    };

    // Send confirmation SMS to customer
    sendRegistrationSms(smsData)
      .then(success => {
        console.log(`[Signup] Customer SMS ${success ? 'sent' : 'failed'} to ${phone}`);
      })
      .catch(err => {
        console.error('[Signup] Customer SMS error:', err);
      });

    // Send alert SMS to admin phones
    sendRegistrationAlertToAdmin(smsData)
      .then(success => {
        console.log(`[Signup] Admin SMS alert ${success ? 'sent' : 'failed'}`);
      })
      .catch(err => {
        console.error('[Signup] Admin SMS error:', err);
      });

    console.log('[Signup] ===== FREE registration completed =====\n');
    return NextResponse.json({
      success: true,
      data: {
        registrationId: registration.id,
        roomCount,
        message: 'Registration successful! Meter is free - just run your connection to the meter.',
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
