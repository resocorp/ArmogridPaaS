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

/**
 * Get admin token from environment or session
 */
export async function getAdminToken(): Promise<string> {
  // Try to get from environment first (for background operations)
  const envToken = process.env.IOT_ADMIN_TOKEN;
  if (envToken) return envToken;

  // Try to get from session (if logged in as admin)
  const session = await getSession();
  if (session?.userType === 0) return session.token;

  // Fall back to logging in with admin credentials
  const { iotClient } = await import('./iot-client');
  const username = process.env.IOT_ADMIN_USERNAME;
  const password = process.env.IOT_ADMIN_PASSWORD;

  if (!username || !password) {
    throw new Error('Admin credentials not configured');
  }

  const response = await iotClient.login(username, password, 0);

  // Handle new API format (success/errorCode/errorMsg)
  if (response.success !== undefined) {
    if (response.success === '1' && response.data) return response.data;
    throw new Error(`Failed to get admin token: ${response.errorMsg || 'Unknown error'}`);
  }

  // Handle legacy API format (code/msg)
  if (response.code !== undefined) {
    if ((response.code === 200 || response.code === 0) && response.data) return response.data;
    throw new Error(`Failed to get admin token: ${response.msg || 'Unknown error'}`);
  }

  throw new Error('Failed to get admin token: Unexpected response format');
}
