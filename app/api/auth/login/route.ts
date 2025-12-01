import { NextRequest, NextResponse } from 'next/server';
import { iotClient } from '@/lib/iot-client';
import { createSession } from '@/lib/auth';
import { translateErrorMessage } from '@/lib/utils';

export async function POST(request: NextRequest) {
  try {
    console.log('[Login] ===== Processing login request =====');
    const body = await request.json();
    const { username, password, type = 1 } = body;
    console.log('[Login] Username:', username, 'Type:', type);

    if (!username || !password) {
      console.error('[Login] Missing credentials');
      return NextResponse.json(
        { error: 'Username and password are required' },
        { status: 400 }
      );
    }

    // Login to IoT platform
    console.log('[Login] Calling IoT login API...');
    const response = await iotClient.login(username, password, type);
    console.log('[Login] IoT response:', JSON.stringify(response));

    // Check success in both API formats
    const isSuccess = 
      (response.success === '1') || // New format
      (response.code === 200 || response.code === 0); // Legacy format

    if (!isSuccess) {
      const rawErrorMsg = response.errorMsg || response.msg || 'Login failed';
      const errorMsg = translateErrorMessage(rawErrorMsg);
      console.error('[Login] Login failed:', rawErrorMsg, '-> Translated:', errorMsg);
      return NextResponse.json(
        { error: errorMsg },
        { status: 401 }
      );
    }

    // Extract token and userId from response
    // New format: data is the token string directly
    // Legacy format: data is an object with token property
    const token = typeof response.data === 'string' ? response.data : (response.data as any)?.token;
    const userId = typeof response.data === 'string' ? username : (response.data as any)?.userId || username;

    if (!token) {
      console.error('[Login] No token in response');
      return NextResponse.json(
        { error: 'Login failed: No token received' },
        { status: 401 }
      );
    }

    console.log('[Login] Login successful, creating session...');
    // Create session
    const sessionId = await createSession(
      userId,
      username,
      token,
      type
    );

    console.log('[Login] Session created:', sessionId);
    console.log('[Login] ===== Login completed successfully =====\n');
    return NextResponse.json({
      success: true,
      data: {
        userId,
        username,
        userType: type,
        sessionId,
      },
    });
  } catch (error: any) {
    console.error('[Login] ===== Login failed =====');
    console.error('[Login] Error:', error);
    console.error('[Login] Stack trace:', error.stack);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
