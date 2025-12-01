import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin, getAdminToken } from '@/lib/auth';
import { iotClient } from '@/lib/iot-client';
import { supabaseAdmin } from '@/lib/supabase';

// GET - Check if credentials exist for a meter
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ meterId: string }> }
) {
  try {
    await requireAdmin();
    const { meterId } = await params;
    const { searchParams } = new URL(request.url);
    const roomNo = searchParams.get('roomNo');

    if (!roomNo) {
      return NextResponse.json(
        { error: 'roomNo is required' },
        { status: 400 }
      );
    }

    const { data, error } = await supabaseAdmin
      .from('meter_credentials')
      .select('*')
      .eq('room_no', roomNo)
      .single();

    if (error && error.code !== 'PGRST116') {
      console.error('Error fetching credentials:', error);
      return NextResponse.json(
        { error: 'Failed to fetch credentials' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      linked: !!data,
      data: data ? {
        username: data.username,
        hasToken: !!data.iot_token,
        lastSyncAt: data.last_sync_at,
        meterData: data.meter_data,
      } : null,
    });
  } catch (error: any) {
    console.error('Get credentials error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to get credentials' },
      { status: 500 }
    );
  }
}

// POST - Save credentials and sync meter data
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ meterId: string }> }
) {
  try {
    await requireAdmin();
    const { meterId } = await params;
    const body = await request.json();
    const { roomNo, projectId, projectName, username, password } = body;

    if (!roomNo || !username || !password) {
      return NextResponse.json(
        { error: 'roomNo, username, and password are required' },
        { status: 400 }
      );
    }

    console.log(`[Credentials] Linking account for ${roomNo}: ${username}`);

    // Try to login with the credentials to verify they work
    // Note: iotClient.login() handles MD5 hashing internally
    console.log(`[Credentials] Attempting login for ${username}...`);
    const loginResponse = await iotClient.login(username, password, 1);
    
    console.log(`[Credentials] Login response:`, JSON.stringify(loginResponse));

    // Check for success
    const isSuccess = loginResponse.success === '1' || 
                     loginResponse.code === 200 || 
                     loginResponse.code === 0;

    if (!isSuccess) {
      return NextResponse.json(
        { error: loginResponse.errorMsg || loginResponse.msg || 'Invalid credentials' },
        { status: 401 }
      );
    }

    const userToken = loginResponse.data;
    if (!userToken) {
      return NextResponse.json(
        { error: 'Failed to obtain user token' },
        { status: 401 }
      );
    }

    console.log(`[Credentials] Login successful, fetching meter info...`);

    // Get detailed meter info using the user token
    const meterInfoResponse = await iotClient.getMeterInfo(roomNo, userToken);
    console.log(`[Credentials] Meter info response:`, JSON.stringify(meterInfoResponse));

    const meterInfoSuccess = meterInfoResponse.success === '1' || 
                            meterInfoResponse.code === 200 || 
                            meterInfoResponse.code === 0;

    const meterData = meterInfoSuccess ? meterInfoResponse.data : null;

    // Calculate token expiry (24 hours from now)
    const tokenExpiresAt = new Date();
    tokenExpiresAt.setHours(tokenExpiresAt.getHours() + 24);

    // Upsert credentials to Supabase
    // Note: We store plain password so iotClient.login() can use it for token refresh
    const { data, error } = await supabaseAdmin
      .from('meter_credentials')
      .upsert({
        room_no: roomNo,
        project_id: projectId || '',
        project_name: projectName || null,
        username: username,
        password_hash: password, // Store plain password (iotClient.login handles hashing)
        iot_token: userToken,
        token_expires_at: tokenExpiresAt.toISOString(),
        last_sync_at: new Date().toISOString(),
        meter_data: meterData,
      }, {
        onConflict: 'room_no',
      })
      .select()
      .single();

    if (error) {
      console.error('Error saving credentials:', error);
      return NextResponse.json(
        { error: 'Failed to save credentials' },
        { status: 500 }
      );
    }

    console.log(`[Credentials] Saved credentials for ${roomNo}`);

    return NextResponse.json({
      success: true,
      message: 'Credentials saved and meter synced',
      data: {
        roomNo,
        username,
        meterData,
        lastSyncAt: data.last_sync_at,
      },
    });
  } catch (error: any) {
    console.error('Save credentials error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to save credentials' },
      { status: 500 }
    );
  }
}

// DELETE - Remove credentials
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ meterId: string }> }
) {
  try {
    await requireAdmin();
    const { searchParams } = new URL(request.url);
    const roomNo = searchParams.get('roomNo');

    if (!roomNo) {
      return NextResponse.json(
        { error: 'roomNo is required' },
        { status: 400 }
      );
    }

    const { error } = await supabaseAdmin
      .from('meter_credentials')
      .delete()
      .eq('room_no', roomNo);

    if (error) {
      console.error('Error deleting credentials:', error);
      return NextResponse.json(
        { error: 'Failed to delete credentials' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Credentials removed',
    });
  } catch (error: any) {
    console.error('Delete credentials error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to delete credentials' },
      { status: 500 }
    );
  }
}
