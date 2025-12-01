import { NextRequest, NextResponse } from 'next/server';
import { verifyWebhookSignature } from '@/lib/paystack';
import { iotClient } from '@/lib/iot-client';
import { getAdminToken } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase';
import { generateSaleId, translateErrorMessage } from '@/lib/utils';
import { BUY_TYPE } from '@/lib/constants';
import type { PaystackWebhookEvent } from '@/types/payment';

export async function POST(request: NextRequest) {
  try {
    console.log('\n[Webhook] ===== Received Paystack webhook =====');
    const body = await request.text();
    const signature = request.headers.get('x-paystack-signature');
    console.log('[Webhook] Signature present:', !!signature);

    if (!signature) {
      console.error('[Webhook] Missing signature');
      return NextResponse.json(
        { error: 'Missing signature' },
        { status: 400 }
      );
    }

    // Verify webhook signature
    console.log('[Webhook] Verifying signature...');
    const isValid = verifyWebhookSignature(body, signature);
    if (!isValid) {
      console.error('[Webhook] Invalid signature');
      return NextResponse.json(
        { error: 'Invalid signature' },
        { status: 401 }
      );
    }
    console.log('[Webhook] Signature verified');

    const event: PaystackWebhookEvent = JSON.parse(body);
    console.log('[Webhook] Event type:', event.event);
    console.log('[Webhook] Reference:', event.data.reference);

    // Log webhook event
    console.log('[Webhook] Logging webhook event to database...');
    await supabaseAdmin.from('webhook_logs').insert({
      event_type: event.event,
      reference: event.data.reference,
      payload: event as any,
      processed: false,
    });

    // Only process successful charge events
    if (event.event !== 'charge.success') {
      console.log('[Webhook] Not a charge.success event, skipping processing');
      return NextResponse.json({ received: true });
    }

    const { reference, status, metadata } = event.data;
    const meterId = metadata?.meterId;
    console.log('[Webhook] Processing charge.success for meterId:', meterId, 'status:', status);

    if (!meterId) {
      console.error('[Webhook] No meterId in webhook metadata');
      return NextResponse.json({ received: true });
    }

    // Get transaction from database
    console.log('[Webhook] Looking up transaction with reference:', reference);
    const { data: transaction, error: txError } = await supabaseAdmin
      .from('transactions')
      .select('*')
      .eq('paystack_reference', reference)
      .single();

    if (txError || !transaction) {
      console.error('[Webhook] Transaction not found:', reference, 'Error:', txError);
      return NextResponse.json({ received: true });
    }
    console.log('[Webhook] Transaction found:', transaction.id);

    // Skip if already processed
    if (transaction.paystack_status === 'success' && transaction.sale_id) {
      console.log('[Webhook] Transaction already processed, skipping');
      return NextResponse.json({ received: true });
    }

    try {
      if (status === 'success') {
        console.log('[Webhook] Payment successful, crediting meter...');
        // Get admin token
        const adminToken = await getAdminToken();
        console.log('[Webhook] Admin token obtained');

        // Generate sale ID
        const saleId = generateSaleId();
        console.log('[Webhook] Generated sale ID:', saleId);

        // Credit meter via IoT platform
        console.log('[Webhook] Calling salePower API...');
        const saleResponse = await iotClient.salePower(
          {
            meterId,
            saleMoney: transaction.amount_kobo,
            buyType: BUY_TYPE.PAYSTACK,
            saleId,
          },
          adminToken
        );
        console.log('[Webhook] SalePower response:', JSON.stringify(saleResponse));

        // Check success in both API formats
        const isSuccess = 
          (saleResponse.success === '1') || // New format
          (saleResponse.code === 200 || saleResponse.code === 0); // Legacy format

        if (isSuccess) {
          console.log('[Webhook] Meter credited successfully, updating database...');
          // Update transaction as successful
          await supabaseAdmin
            .from('transactions')
            .update({
              paystack_status: 'success',
              sale_id: saleId,
              metadata: {
                ...transaction.metadata,
                iot_response: saleResponse,
                credited_at: new Date().toISOString(),
              },
            })
            .eq('id', transaction.id);

          // Update webhook log as processed
          await supabaseAdmin
            .from('webhook_logs')
            .update({ processed: true })
            .eq('reference', reference);

          console.log(`[Webhook] Successfully credited meter ${meterId} with ₦${transaction.amount_kobo / 100}`);
        } else {
          const rawErrorMsg = saleResponse.errorMsg || saleResponse.msg || 'Failed to credit meter';
          const errorMsg = translateErrorMessage(rawErrorMsg);
          console.error('[Webhook] SalePower failed:', rawErrorMsg, '-> Translated:', errorMsg);
          throw new Error(errorMsg);
        }
      } else {
        // Payment failed
        console.log('[Webhook] Payment status is not success:', status);
        await supabaseAdmin
          .from('transactions')
          .update({
            paystack_status: 'failed',
            metadata: {
              ...transaction.metadata,
              failure_reason: event.data.gateway_response,
            },
          })
          .eq('id', transaction.id);
      }
    } catch (error: any) {
      console.error('[Webhook] Error processing webhook:', error);
      console.error('[Webhook] Stack trace:', error.stack);
      
      // Log error in webhook_logs
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

    console.log('[Webhook] ===== Webhook processing completed =====\n');
    return NextResponse.json({ received: true });
  } catch (error: any) {
    console.error('[Webhook] ===== Webhook processing failed =====');
    console.error('[Webhook] Error:', error);
    console.error('[Webhook] Stack trace:', error.stack);
    return NextResponse.json(
      { error: 'Webhook processing failed' },
      { status: 500 }
    );
  }
}
