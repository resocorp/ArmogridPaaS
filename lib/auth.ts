import { cookies } from 'next/headers';
import { SESSION_COOKIE_NAME, SESSION_EXPIRY } from './constants';
import { supabaseAdmin } from './supabase';
import type { UserSession } from '@/types/database';

/**
 * Session data structure
 */
export interface Session {
  userId: string;
  username: string;
  token: string;
  userType: number;
}

/**
 * Get current session from cookie
 */
export async function getSession(): Promise<Session | null> {
  const cookieStore = await cookies();
  const sessionId = cookieStore.get(SESSION_COOKIE_NAME)?.value;

  if (!sessionId) {
    return null;
  }

  try {
    const { data, error } = await supabaseAdmin
      .from('user_sessions')
      .select('*')
      .eq('id', sessionId)
      .single();

    if (error || !data) {
      return null;
    }

    // Check if session is expired
    if (data.expires_at && new Date(data.expires_at) < new Date()) {
      await deleteSession(sessionId);
      return null;
    }

    return {
      userId: data.user_id,
      username: data.username,
      token: data.token,
      userType: data.user_type,
    };
  } catch (error) {
    console.error('Error getting session:', error);
    return null;
  }
}

/**
 * Create new session
 */
export async function createSession(
  userId: string,
  username: string,
  token: string,
  userType: number
): Promise<string> {
  const expiresAt = new Date(Date.now() + SESSION_EXPIRY);

  const { data, error } = await supabaseAdmin
    .from('user_sessions')
    .insert({
      user_id: userId,
      username,
      token,
      user_type: userType,
      expires_at: expiresAt.toISOString(),
    })
    .select()
    .single();

  if (error || !data) {
    throw new Error('Failed to create session');
  }

  // Set cookie
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE_NAME, data.id, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    expires: expiresAt,
    path: '/',
  });

  return data.id;
}

/**
 * Delete session
 */
export async function deleteSession(sessionId?: string): Promise<void> {
  const cookieStore = await cookies();
  const id = sessionId || cookieStore.get(SESSION_COOKIE_NAME)?.value;

  if (id) {
    await supabaseAdmin.from('user_sessions').delete().eq('id', id);
  }

  cookieStore.delete(SESSION_COOKIE_NAME);
}

/**
 * Check if user is admin
 */
export async function isAdmin(): Promise<boolean> {
  const session = await getSession();
  return session?.userType === 0;
}

/**
 * Require authentication (throws if not authenticated)
 */
export async function requireAuth(): Promise<Session> {
  const session = await getSession();
  
  if (!session) {
    throw new Error('Unauthorized');
  }

  return session;
}

/**
 * Require admin access (throws if not admin)
 */
export async function requireAdmin(): Promise<Session> {
  const session = await requireAuth();
  
  if (session.userType !== 0) {
    throw new Error('Forbidden: Admin access required');
  }

  return session;
}

// Cache for user token to avoid repeated logins
let cachedUserToken: { token: string; expiry: number } | null = null;

/**
 * Get user token for APIs that require user authentication (getMeterInfo, etc.)
 */
export async function getUserToken(): Promise<string> {
  console.log('[Auth] Getting user token...');
  
  // Check if we have a cached token that's still valid (with 5 min buffer)
  if (cachedUserToken && cachedUserToken.expiry > Date.now() + 300000) {
    console.log('[Auth] Using cached user token');
    return cachedUserToken.token;
  }

  // Login using user credentials from environment
  const { iotClient } = await import('./iot-client');
  const username = process.env.IOT_USER_USERNAME;
  const password = process.env.IOT_USER_PASSWORD;

  if (!username || !password) {
    console.error('[Auth] User credentials not configured in environment');
    throw new Error('User credentials not configured (IOT_USER_USERNAME, IOT_USER_PASSWORD)');
  }

  console.log(`[Auth] Logging in as user: ${username}`);
  const response = await iotClient.login(username, password, 1); // userType 1 = regular user
  console.log(`[Auth] User login response:`, JSON.stringify(response));

  if (response.success === '1' && response.data) {
    console.log('[Auth] Successfully obtained user token');
    // Cache token for 1 hour
    cachedUserToken = {
      token: response.data,
      expiry: Date.now() + 3600000,
    };
    return response.data;
  }

  if ((response.code === 200 || response.code === 0) && response.data) {
    console.log('[Auth] Successfully obtained user token (legacy format)');
    cachedUserToken = {
      token: response.data,
      expiry: Date.now() + 3600000,
    };
    return response.data;
  }

  console.error('[Auth] Failed to get user token:', response);
  throw new Error(`Failed to get user token: ${response.errorMsg || response.msg || 'Unknown error'}`);
}

/**
 * Get admin token from environment or session
 */
export async function getAdminToken(): Promise<string> {
  console.log('[Auth] Getting admin token...');
  
  // Try to get from environment first (for background operations)
  const envToken = process.env.IOT_ADMIN_TOKEN;
  if (envToken) {
    console.log('[Auth] Using admin token from environment');
    return envToken;
  }

  // Try to get from session (if logged in as admin)
  const session = await getSession();
  if (session?.userType === 0) {
    console.log('[Auth] Using admin token from session');
    return session.token;
  }

  // If no admin token available, login using credentials
  console.log('[Auth] No cached token found, logging in as admin...');
  const { iotClient } = await import('./iot-client');
  const username = process.env.IOT_ADMIN_USERNAME!;
  const password = process.env.IOT_ADMIN_PASSWORD!;

  if (!username || !password) {
    console.error('[Auth] Admin credentials not configured in environment');
    throw new Error('Admin credentials not configured');
  }

  console.log(`[Auth] Logging in with username: ${username}`);
  const response = await iotClient.login(username, password, 0);
  console.log(`[Auth] Login response:`, JSON.stringify(response));

  // Handle new API format (success/errorCode/errorMsg)
  if (response.success !== undefined) {
    if (response.success === '1' && response.data) {
      console.log('[Auth] Successfully obtained admin token (new format)');
      return response.data; // Token is directly in data field
    } else {
      console.error('[Auth] Failed to get admin token (new format):', response);
      throw new Error(`Failed to get admin token: ${response.errorMsg || 'Unknown error'}`);
    }
  }

  // Handle legacy API format (code/msg)
  if (response.code !== undefined) {
    if ((response.code === 200 || response.code === 0) && response.data) {
      console.log('[Auth] Successfully obtained admin token (legacy format)');
      return response.data; // Assume token is in data field
    } else {
      console.error('[Auth] Failed to get admin token (legacy format):', response);
      throw new Error(`Failed to get admin token: ${response.msg || 'Unknown error'}`);
    }
  }

  console.error('[Auth] Unexpected response format:', response);
  throw new Error('Failed to get admin token: Unexpected response format');
}
