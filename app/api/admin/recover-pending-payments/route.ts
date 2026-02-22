import { NextRequest, NextResponse } from 'next/server';
import { verifyPayment } from '@/lib/paystack';
import { iotClient } from '@/lib/iot-client';
import { getAdminToken } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase';
import { generateSaleId, translateErrorMessage } from '@/lib/utils';
import { BUY_TYPE } from '@/lib/constants';
import { requireAdmin } from '@/lib/auth';

export const dynamic = 'force-dynamic';

/**
 * POST /api/admin/recover-pending-payments
 * Scans all pending Paystack transactions, verifies them with Paystack,
 * and credits the meter for any that were actually paid.
 * Admin-only endpoint.
 */
export async function POST(request: NextRequest) {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  const since: string | undefined = body.since;   // ISO date string e.g. "2026-02-22"
  const until: string | undefined = body.until;   // ISO date string e.g. "2026-02-22"
  const dryRun: boolean = body.dryRun === true;

  const results: {
    reference: string;
    meterId: string;
    amountNaira: number;
    paystackStatus: string;
    action: string;
    error?: string;
  }[] = [];

  try {
    // Fetch pending Paystack transactions (not admin manual ones)
    let query = supabaseAdmin
      .from('transactions')
      .select('*')
      .eq('paystack_status', 'pending')
      .like('paystack_reference', 'AG_%')
      .is('sale_id', null)
      .order('created_at', { ascending: true });

    if (since) query = query.gte('created_at', since);
    if (until) query = query.lte('created_at', until);

    const { data: pendingTxns, error: fetchError } = await query;

    if (fetchError) {
      return NextResponse.json({ error: fetchError.message }, { status: 500 });
    }

    if (!pendingTxns || pendingTxns.length === 0) {
      return NextResponse.json({ message: 'No pending transactions found', results: [] });
    }

    console.log(`[Recovery] Found ${pendingTxns.length} pending transactions to check (since=${since ?? 'all'}, until=${until ?? 'all'}, dryRun=${dryRun})`);

    if (dryRun) {
      return NextResponse.json({
        message: `DRY RUN: ${pendingTxns.length} pending transactions found. No credits applied.`,
        dryRun: true,
        results: pendingTxns.map(t => ({
          reference: t.paystack_reference,
          meterId: t.meter_id,
          amountNaira: t.amount_kobo / 100,
          createdAt: t.created_at,
          paystackStatus: 'pending',
          action: 'would verify and credit',
        })),
      });
    }

    const adminToken = await getAdminToken();

    for (const transaction of pendingTxns) {
      const ref = transaction.paystack_reference;
      const meterId = transaction.meter_id;
      const amountNaira = transaction.amount_kobo / 100;

      try {
        console.log(`[Recovery] Verifying ${ref} (meter ${meterId}, ₦${amountNaira})...`);
        const verification = await verifyPayment(ref);

        if (!verification.status) {
          results.push({ reference: ref, meterId, amountNaira, paystackStatus: 'unknown', action: 'skipped - verification API error' });
          continue;
        }

        const paystackStatus = verification.data?.status;

        if (paystackStatus !== 'success') {
          // Payment was not successful — mark as failed
          await supabaseAdmin
            .from('transactions')
            .update({ paystack_status: paystackStatus === 'abandoned' || paystackStatus === 'failed' ? 'failed' : 'pending' })
            .eq('id', transaction.id);

          results.push({ reference: ref, meterId, amountNaira, paystackStatus, action: paystackStatus === 'abandoned' || paystackStatus === 'failed' ? 'marked failed' : 'skipped - not yet paid' });
          continue;
        }

        // Payment confirmed — credit the meter
        const saleId = generateSaleId();
        console.log(`[Recovery] Payment confirmed for ${ref}, crediting meter ${meterId}...`);

        const saleResponse = await iotClient.salePower(
          {
            meterId,
            saleMoney: transaction.amount_kobo,
            buyType: BUY_TYPE.PAYSTACK,
            saleId,
          },
          adminToken
        );

        const isSuccess =
          saleResponse.success === '1' ||
          saleResponse.code === 200 ||
          saleResponse.code === 0;

        if (isSuccess) {
          await supabaseAdmin
            .from('transactions')
            .update({
              paystack_status: 'success',
              sale_id: saleId,
              metadata: {
                ...transaction.metadata,
                iot_response: saleResponse,
                credited_at: new Date().toISOString(),
                recovered_by: 'admin_recovery_endpoint',
              },
            })
            .eq('id', transaction.id);

          // Log recovery in webhook_logs for audit trail
          await supabaseAdmin.from('webhook_logs').insert({
            event_type: 'charge.success.recovered',
            reference: ref,
            payload: { recovered: true, saleId, paystackStatus } as any,
            processed: true,
          });

          results.push({ reference: ref, meterId, amountNaira, paystackStatus: 'success', action: `credited - saleId: ${saleId}` });
          console.log(`[Recovery] ✓ Credited meter ${meterId} ₦${amountNaira} (${ref})`);
        } else {
          const rawError = saleResponse.errorMsg || saleResponse.msg || 'IoT credit failed';
          const errorMsg = translateErrorMessage(rawError);

          await supabaseAdmin
            .from('transactions')
            .update({
              metadata: {
                ...transaction.metadata,
                recovery_error: errorMsg,
                recovery_attempted_at: new Date().toISOString(),
              },
            })
            .eq('id', transaction.id);

          results.push({ reference: ref, meterId, amountNaira, paystackStatus: 'success', action: 'failed to credit meter', error: errorMsg });
          console.error(`[Recovery] ✗ Failed to credit meter ${meterId} for ${ref}: ${errorMsg}`);
        }
      } catch (err: any) {
        console.error(`[Recovery] Error processing ${ref}:`, err.message);
        results.push({ reference: ref, meterId, amountNaira, paystackStatus: 'unknown', action: 'error', error: err.message });
      }
    }

    const credited = results.filter(r => r.action.startsWith('credited')).length;
    const failed = results.filter(r => r.action === 'failed to credit meter').length;
    const skipped = results.length - credited - failed;

    console.log(`[Recovery] Done. Credited: ${credited}, Failed: ${failed}, Skipped: ${skipped}`);

    return NextResponse.json({
      message: `Recovery complete. Credited: ${credited}, Failed: ${failed}, Skipped: ${skipped}`,
      credited,
      failed,
      skipped,
      results,
    });
  } catch (error: any) {
    console.error('[Recovery] Fatal error:', error);
    return NextResponse.json({ error: error.message || 'Recovery failed' }, { status: 500 });
  }
}
