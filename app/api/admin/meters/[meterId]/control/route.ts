import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin, getAdminToken } from '@/lib/auth';
import { iotClient } from '@/lib/iot-client';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ meterId: string }> }
) {
  try {
    await requireAdmin();
    const adminToken = await getAdminToken();
    const { meterId } = await params;

    const body = await request.json();
    const { type } = body; // 0 = Off, 1 = On, 2 = Prepaid mode

    if (type === undefined || ![0, 1, 2].includes(type)) {
      return NextResponse.json(
        { error: 'Invalid control type. Use 0 (Off), 1 (On), or 2 (Prepaid)' },
        { status: 400 }
      );
    }

    const response = await iotClient.controlMeter(meterId, type, adminToken);

    // Handle new API format
    if (response.success !== undefined) {
      if (response.success === '1') {
        return NextResponse.json({
          success: true,
          message: type === 0 ? 'Meter turned off' : type === 1 ? 'Meter turned on' : 'Prepaid mode restored',
        });
      } else {
        return NextResponse.json(
          { error: response.errorMsg || 'Failed to control meter' },
          { status: 400 }
        );
      }
    }

    // Handle legacy format
    if (response.code === 200 || response.code === 0) {
      return NextResponse.json({
        success: true,
        message: type === 0 ? 'Meter turned off' : type === 1 ? 'Meter turned on' : 'Prepaid mode restored',
      });
    }

    return NextResponse.json(
      { error: response.msg || 'Failed to control meter' },
      { status: 400 }
    );
  } catch (error: any) {
    console.error('Meter control error:', error);
    
    if (error.message === 'Unauthorized' || error.message.includes('Admin')) {
      return NextResponse.json(
        { error: 'Admin access required' },
        { status: 403 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to control meter' },
      { status: 500 }
    );
  }
}
