import { NextRequest, NextResponse } from 'next/server';
import { verifyWebhookSignature, autoSwapToUsdt } from '@/lib/ivorypay';
import { iotClient } from '@/lib/iot-client';
import { getAdminToken } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase';
import { generateSaleId, translateErrorMessage } from '@/lib/utils';
import { BUY_TYPE } from '@/lib/constants';
import { sendPaymentSuccessSms, sendPaymentFailedSms } from '@/lib/sms';
import type { IvoryPayWebhookEvent, IvoryPayCrypto } from '@/types/ivorypay';

const IVORYPAY_BUY_TYPE = 4; // New buy type for IvoryPay

export async function POST(request: NextRequest) {
  try {
    console.log('\n[IvoryPay Webhook] ===== Received IvoryPay webhook =====');
    const body = await request.json();
    const signature = request.headers.get('x-ivorypay-signature');
    console.log('[IvoryPay Webhook] Signature present:', !!signature);
    console.log('[IvoryPay Webhook] Event:', body.event);

    if (!signature) {
      console.error('[IvoryPay Webhook] Missing signature');
      return NextResponse.json(
        { error: 'Missing signature' },
        { status: 400 }
      );
    }

    // Verify webhook signature (IvoryPay uses data object for signature)
    console.log('[IvoryPay Webhook] Verifying signature...');
    const isValid = verifyWebhookSignature(body.data, signature);
    if (!isValid) {
      console.error('[IvoryPay Webhook] Invalid signature');
      return NextResponse.json(
        { error: 'Invalid signature' },
        { status: 401 }
      );
    }
    console.log('[IvoryPay Webhook] Signature verified');

    const event: IvoryPayWebhookEvent = body;
    const { data } = event;
    const reference = data.reference;

    // Log webhook event
    console.log('[IvoryPay Webhook] Logging webhook event...');
    await supabaseAdmin.from('webhook_logs').insert({
      event_type: `ivorypay.${event.event}`,
      reference: reference,
      payload: event as any,
      processed: false,
    });

    // Handle different event types
    if (event.event === 'transaction.success') {
      await handleTransactionSuccess(data);
    } else if (event.event === 'transaction.failed') {
      await handleTransactionFailed(data);
    } else if (event.event === 'virtualAccountTransfer.success') {
      await handleVirtualAccountTransfer(data);
    }

    console.log('[IvoryPay Webhook] ===== Webhook processing completed =====\n');
    return NextResponse.json({ received: true });
  } catch (error: any) {
    console.error('[IvoryPay Webhook] ===== Webhook processing failed =====');
    console.error('[IvoryPay Webhook] Error:', error);
    return NextResponse.json(
      { error: 'Webhook processing failed' },
      { status: 500 }
    );
  }
}

async function handleTransactionSuccess(data: any) {
  const reference = data.reference;
  console.log('[IvoryPay Webhook] Processing transaction.success for reference:', reference);

  // Try to find transaction by ivorypay_reference
  let { data: transaction, error: txError } = await supabaseAdmin
    .from('transactions')
    .select('*')
    .eq('ivorypay_reference', reference)
    .single();

  // If not found, try metadata payment_link_reference
  if (!transaction) {
    const { data: txByMetadata } = await supabaseAdmin
      .from('transactions')
      .select('*')
      .filter('metadata->payment_link_reference', 'eq', reference)
      .single();
    
    transaction = txByMetadata;
  }

  if (!transaction) {
    // Check if this is a registration payment
    const { data: registration } = await supabaseAdmin
      .from('customer_registrations')
      .select('*')
      .eq('ivorypay_reference', reference)
      .single();

    if (registration) {
      await handleRegistrationSuccess(registration, data);
      return;
    }

    console.error('[IvoryPay Webhook] Transaction not found:', reference);
    return;
  }

  // Skip if already processed
  if (transaction.ivorypay_status === 'success' && transaction.sale_id) {
    console.log('[IvoryPay Webhook] Transaction already processed, skipping');
    return;
  }

  const meterId = transaction.meter_id;
  console.log('[IvoryPay Webhook] Processing for meterId:', meterId);

  try {
    // Get admin token
    const adminToken = await getAdminToken();
    console.log('[IvoryPay Webhook] Admin token obtained');

    // Generate sale ID
    const saleId = generateSaleId();
    console.log('[IvoryPay Webhook] Generated sale ID:', saleId);

    // Credit meter via IoT platform
    console.log('[IvoryPay Webhook] Calling salePower API...');
    const saleResponse = await iotClient.salePower(
      {
        meterId,
        saleMoney: transaction.amount_kobo,
        buyType: IVORYPAY_BUY_TYPE,
        saleId,
      },
      adminToken
    );
    console.log('[IvoryPay Webhook] SalePower response:', JSON.stringify(saleResponse));

    const isSuccess =
      saleResponse.success === '1' ||
      saleResponse.code === 200 ||
      saleResponse.code === 0;

    if (isSuccess) {
      console.log('[IvoryPay Webhook] Meter credited successfully');

      // Update transaction as successful
      await supabaseAdmin
        .from('transactions')
        .update({
          ivorypay_status: 'success',
          sale_id: saleId,
          crypto_amount: data.receivedAmountInCrypto,
          crypto_currency: data.crypto,
          metadata: {
            ...transaction.metadata,
            ivorypay_response: data,
            credited_at: new Date().toISOString(),
          },
        })
        .eq('id', transaction.id);

      // Update webhook log
      await supabaseAdmin
        .from('webhook_logs')
        .update({ processed: true })
        .eq('reference', reference);

      console.log(`[IvoryPay Webhook] Successfully credited meter ${meterId} with ₦${transaction.amount_kobo / 100}`);

      // Auto-swap to USDT if enabled and not already USDT
      if (data.crypto && data.crypto !== 'USDT' && data.receivedAmountInCrypto) {
        console.log('[IvoryPay Webhook] Initiating auto-swap to USDT...');
        const swapResult = await autoSwapToUsdt(
          data.crypto as IvoryPayCrypto,
          data.receivedAmountInCrypto
        );
        if (swapResult) {
          console.log('[IvoryPay Webhook] Auto-swap completed:', swapResult.data.status);
        }
      }

      // Send SMS notification
      if (transaction.customer_phone) {
        try {
          await sendPaymentSuccessSms({
            name: transaction.metadata?.customerName || 'Customer',
            phone: transaction.customer_phone,
            amount: transaction.amount_kobo / 100,
            meterId: meterId,
            reference: reference,
            balance: (saleResponse as any).balance || saleResponse.data?.balance,
          });
          console.log('[IvoryPay Webhook] Payment success SMS sent');
        } catch (smsError) {
          console.error('[IvoryPay Webhook] Failed to send SMS:', smsError);
        }
      }
    } else {
      const rawErrorMsg = saleResponse.errorMsg || saleResponse.msg || 'Failed to credit meter';
      const errorMsg = translateErrorMessage(rawErrorMsg);
      console.error('[IvoryPay Webhook] SalePower failed:', errorMsg);
      throw new Error(errorMsg);
    }
  } catch (error: any) {
    console.error('[IvoryPay Webhook] Error processing webhook:', error);

    // Log error
    await supabaseAdmin
      .from('webhook_logs')
      .update({
        error: error.message,
        processed: false,
      })
      .eq('reference', reference);

    // Update transaction with error
    await supabaseAdmin
      .from('transactions')
      .update({
        metadata: {
          ...transaction.metadata,
          processing_error: error.message,
        },
      })
      .eq('id', transaction.id);
  }
}

async function handleTransactionFailed(data: any) {
  const reference = data.reference;
  console.log('[IvoryPay Webhook] Processing transaction.failed for reference:', reference);

  const { data: transaction } = await supabaseAdmin
    .from('transactions')
    .select('*')
    .eq('ivorypay_reference', reference)
    .single();

  if (!transaction) {
    console.error('[IvoryPay Webhook] Transaction not found:', reference);
    return;
  }

  await supabaseAdmin
    .from('transactions')
    .update({
      ivorypay_status: 'failed',
      metadata: {
        ...transaction.metadata,
        failure_reason: data.failureReason || 'Payment failed',
      },
    })
    .eq('id', transaction.id);

  // Send failure SMS
  if (transaction.customer_phone) {
    try {
      await sendPaymentFailedSms({
        name: transaction.metadata?.customerName || 'Customer',
        phone: transaction.customer_phone,
        amount: transaction.amount_kobo / 100,
        reference: reference,
        meterId: transaction.meter_id,
      });
    } catch (smsError) {
      console.error('[IvoryPay Webhook] Failed to send failure SMS:', smsError);
    }
  }
}

async function handleVirtualAccountTransfer(data: any) {
  console.log('[IvoryPay Webhook] Processing virtualAccountTransfer.success');
  console.log('[IvoryPay Webhook] Virtual account transfer data:', JSON.stringify(data));

  const customerReference = data.customerReference;
  const amount = data.amountAfterFee || data.amount;
  const reference = data.reference;

  // Find the virtual account by customer reference
  const { data: virtualAccount } = await supabaseAdmin
    .from('virtual_accounts')
    .select('*')
    .eq('customer_reference', customerReference)
    .single();

  if (!virtualAccount) {
    console.error('[IvoryPay Webhook] Virtual account not found for customerReference:', customerReference);
    return;
  }

  console.log('[IvoryPay Webhook] Found virtual account for meter:', virtualAccount.meter_id);

  // Find pending transaction for this meter with on-ramp payment type
  let { data: transaction } = await supabaseAdmin
    .from('transactions')
    .select('*')
    .eq('meter_id', virtualAccount.meter_id)
    .eq('payment_gateway', 'ivorypay_onramp')
    .eq('ivorypay_status', 'pending')
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  // If no pending transaction, create one from the transfer
  if (!transaction) {
    console.log('[IvoryPay Webhook] No pending transaction found, creating from transfer');
    const amountKobo = Math.round(amount * 100);
    
    const { data: newTx, error: insertError } = await supabaseAdmin
      .from('transactions')
      .insert({
        meter_id: virtualAccount.meter_id,
        amount_kobo: amountKobo,
        ivorypay_reference: reference,
        ivorypay_status: 'pending',
        payment_gateway: 'ivorypay_onramp',
        customer_email: virtualAccount.customer_email,
        customer_phone: virtualAccount.customer_phone,
        buy_type: 5, // On-ramp buy type
        metadata: {
          amount_naira: amount,
          payment_type: 'onramp',
          virtual_account_transfer: data,
          customer: {
            firstName: virtualAccount.customer_first_name,
            lastName: virtualAccount.customer_last_name,
          },
        },
      })
      .select()
      .single();

    if (insertError) {
      console.error('[IvoryPay Webhook] Failed to create transaction:', insertError);
      return;
    }
    transaction = newTx;
  }

  // Skip if already processed
  if (transaction.ivorypay_status === 'success' && transaction.sale_id) {
    console.log('[IvoryPay Webhook] Transaction already processed, skipping');
    return;
  }

  const meterId = transaction.meter_id;
  console.log('[IvoryPay Webhook] Processing on-ramp payment for meterId:', meterId);

  try {
    // Get admin token
    const adminToken = await getAdminToken();
    console.log('[IvoryPay Webhook] Admin token obtained');

    // Generate sale ID
    const saleId = generateSaleId();
    console.log('[IvoryPay Webhook] Generated sale ID:', saleId);

    // Credit meter via IoT platform
    console.log('[IvoryPay Webhook] Calling salePower API...');
    const saleResponse = await iotClient.salePower(
      {
        meterId,
        saleMoney: transaction.amount_kobo,
        buyType: 5, // On-ramp buy type
        saleId,
      },
      adminToken
    );
    console.log('[IvoryPay Webhook] SalePower response:', JSON.stringify(saleResponse));

    const isSuccess =
      saleResponse.success === '1' ||
      saleResponse.code === 200 ||
      saleResponse.code === 0;

    if (isSuccess) {
      console.log('[IvoryPay Webhook] Meter credited successfully via on-ramp');

      // Update transaction as successful
      await supabaseAdmin
        .from('transactions')
        .update({
          ivorypay_status: 'success',
          ivorypay_reference: reference,
          sale_id: saleId,
          metadata: {
            ...transaction.metadata,
            ivorypay_response: data,
            credited_at: new Date().toISOString(),
            sender_account: data.senderAccountNumber,
            sender_name: data.senderAccountName,
            sender_bank: data.senderBankName,
          },
        })
        .eq('id', transaction.id);

      // Update webhook log
      await supabaseAdmin
        .from('webhook_logs')
        .update({ processed: true })
        .eq('reference', reference);

      console.log(`[IvoryPay Webhook] Successfully credited meter ${meterId} with ₦${transaction.amount_kobo / 100} via bank transfer`);

      // Send SMS notification
      if (transaction.customer_phone || virtualAccount.customer_phone) {
        try {
          await sendPaymentSuccessSms({
            name: virtualAccount.customer_first_name || 'Customer',
            phone: transaction.customer_phone || virtualAccount.customer_phone,
            amount: transaction.amount_kobo / 100,
            meterId: meterId,
            reference: reference,
            balance: (saleResponse as any).balance || saleResponse.data?.balance,
          });
          console.log('[IvoryPay Webhook] Payment success SMS sent');
        } catch (smsError) {
          console.error('[IvoryPay Webhook] Failed to send SMS:', smsError);
        }
      }
    } else {
      const rawErrorMsg = saleResponse.errorMsg || saleResponse.msg || 'Failed to credit meter';
      const errorMsg = translateErrorMessage(rawErrorMsg);
      console.error('[IvoryPay Webhook] SalePower failed:', errorMsg);
      throw new Error(errorMsg);
    }
  } catch (error: any) {
    console.error('[IvoryPay Webhook] Error processing on-ramp webhook:', error);

    // Log error
    await supabaseAdmin
      .from('webhook_logs')
      .update({
        error: error.message,
        processed: false,
      })
      .eq('reference', reference);

    // Update transaction with error
    await supabaseAdmin
      .from('transactions')
      .update({
        metadata: {
          ...transaction.metadata,
          processing_error: error.message,
        },
      })
      .eq('id', transaction.id);
  }
}

async function handleRegistrationSuccess(registration: any, data: any) {
  console.log('[IvoryPay Webhook] Processing registration payment success');

  if (registration.payment_status === 'success') {
    console.log('[IvoryPay Webhook] Registration already processed');
    return;
  }

  await supabaseAdmin
    .from('customer_registrations')
    .update({
      payment_status: 'success',
      updated_at: new Date().toISOString(),
    })
    .eq('id', registration.id);

  // Import and call notification function
  const { notifyAdminOfRegistration } = await import('@/lib/notifications');
  
  await notifyAdminOfRegistration({
    name: registration.name,
    email: registration.email,
    phone: registration.phone,
    roomNumber: registration.room_number,
    locationName: registration.location_name || 'Unknown',
    amountPaid: registration.amount_paid / 100,
    reference: data.reference,
  });

  console.log('[IvoryPay Webhook] Registration processed successfully');
}
