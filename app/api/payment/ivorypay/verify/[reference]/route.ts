import { NextRequest, NextResponse } from 'next/server';
import { verifyTransaction } from '@/lib/ivorypay';
import { supabaseAdmin } from '@/lib/supabase';

export async function GET(
  request: NextRequest,
  { params }: { params: { reference: string } }
) {
  try {
    const { reference } = params;

    if (!reference) {
      return NextResponse.json(
        { error: 'Reference is required' },
        { status: 400 }
      );
    }

    // Try to find transaction by ivorypay_reference first
    let { data: transaction } = await supabaseAdmin
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
      return NextResponse.json(
        { error: 'Transaction not found' },
        { status: 404 }
      );
    }

    // If transaction is already successful, return cached status
    if (transaction.ivorypay_status === 'success') {
      return NextResponse.json({
        success: true,
        data: {
          status: 'success',
          reference: reference,
          amount: transaction.amount_kobo,
          meterId: transaction.meter_id,
          transactionStatus: transaction.ivorypay_status,
          saleId: transaction.sale_id,
          cryptoAmount: transaction.crypto_amount,
          cryptoCurrency: transaction.crypto_currency,
        },
      });
    }

    // Try to verify with IvoryPay API using payment link reference
    const paymentLinkReference = transaction.metadata?.payment_link_reference;
    
    if (paymentLinkReference) {
      try {
        const verification = await verifyTransaction(paymentLinkReference);

        if (verification.success && verification.data.status === 'success') {
          // Update transaction if verified successfully
          await supabaseAdmin
            .from('transactions')
            .update({
              ivorypay_status: 'success',
              crypto_amount: verification.data.receivedAmountInCrypto,
              crypto_currency: verification.data.crypto,
              metadata: {
                ...transaction.metadata,
                verification_response: verification.data,
                verified_at: new Date().toISOString(),
              },
            })
            .eq('id', transaction.id);

          return NextResponse.json({
            success: true,
            data: {
              status: 'success',
              reference: reference,
              amount: transaction.amount_kobo,
              meterId: transaction.meter_id,
              transactionStatus: 'success',
              cryptoAmount: verification.data.receivedAmountInCrypto,
              cryptoCurrency: verification.data.crypto,
            },
          });
        }

        return NextResponse.json({
          success: true,
          data: {
            status: verification.data.status,
            reference: reference,
            amount: transaction.amount_kobo,
            meterId: transaction.meter_id,
            transactionStatus: transaction.ivorypay_status,
          },
        });
      } catch (verifyError) {
        console.error('IvoryPay verification error:', verifyError);
        // Fall through to return current transaction status
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        status: transaction.ivorypay_status || 'pending',
        reference: reference,
        amount: transaction.amount_kobo,
        meterId: transaction.meter_id,
        transactionStatus: transaction.ivorypay_status,
        saleId: transaction.sale_id,
      },
    });
  } catch (error: any) {
    console.error('Payment verification error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to verify payment' },
      { status: 500 }
    );
  }
}
