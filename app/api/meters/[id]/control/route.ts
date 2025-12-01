import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, getAdminToken } from '@/lib/auth';
import { iotClient } from '@/lib/iot-client';
import { translateErrorMessage } from '@/lib/utils';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await requireAuth(); // Ensure user is authenticated
    const { id: meterId } = params;
    const body = await request.json();
    const { type } = body;

    if (!meterId) {
      return NextResponse.json(
        { error: 'Meter ID is required' },
        { status: 400 }
      );
    }

    if (type === undefined || ![0, 1, 2].includes(type)) {
      return NextResponse.json(
        { error: 'Valid control type is required (0=Off, 1=On, 2=Prepaid)' },
        { status: 400 }
      );
    }

    // Use admin token for meter control (users control meters via admin token in background)
    const adminToken = await getAdminToken();

    // Control meter
    console.log(`[Meter Control] Controlling meter ${meterId} with type ${type}`);
    const response = await iotClient.controlMeter(meterId, type, adminToken);
    console.log(`[Meter Control] IoT response:`, JSON.stringify(response));

    // Check both old and new API formats
    const isSuccess = 
      (response.success === '1') || // New format
      (response.code === 200 || response.code === 0); // Legacy format

    if (!isSuccess) {
      const rawErrorMsg = response.errorMsg || response.msg || 'Failed to control meter';
      const errorMsg = translateErrorMessage(rawErrorMsg);
      console.error(`[Meter Control] Control failed:`, rawErrorMsg, '-> Translated:', errorMsg);
      return NextResponse.json(
        { error: errorMsg },
        { status: 400 }
      );
    }

    console.log(`[Meter Control] Control successful`);
    return NextResponse.json({
      success: true,
      message: 'Meter control command sent successfully',
      data: response.data,
    });
  } catch (error: any) {
    if (error.message === 'Unauthorized') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    console.error('Meter control error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
