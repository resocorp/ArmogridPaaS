import { NextRequest, NextResponse } from 'next/server';
import { SESSION_COOKIE_NAME, PUBLIC_ROUTES } from '@/lib/constants';

/**
 * API prefixes that are accessible without a session cookie.
 * Note: Admin API routes (/api/admin/*) are protected by requireAdmin() in each
 * route handler (which does a Supabase DB lookup). The middleware only handles
 * the cheap cookie-presence check to avoid unnecessary DB hits on protected pages.
 */
const PUBLIC_API_PREFIXES = [
  '/api/auth/login',
  '/api/payment/initialize',
  '/api/payment/verify',
  '/api/payment/config',
  '/api/webhook/',
  '/api/projects',
  '/api/signup',
  '/api/cron/',
  '/api/meters/validate',
];

const PUBLIC_PATHS = new Set(PUBLIC_ROUTES);

function isPublicPath(pathname: string): boolean {
  if (PUBLIC_PATHS.has(pathname)) return true;
  if (PUBLIC_API_PREFIXES.some(p => pathname.startsWith(p))) return true;
  return false;
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Always allow public paths
  if (isPublicPath(pathname)) return NextResponse.next();

  const sessionCookie = request.cookies.get(SESSION_COOKIE_NAME);

  // No session cookie → redirect to login (pages) or 401 (API routes)
  if (!sessionCookie?.value) {
    if (pathname.startsWith('/api/')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('from', pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Session cookie present — allow through.
  // Admin authorization (userType check) is handled by requireAdmin() in each API route handler,
  // and by the client-side auth check in /admin/page.tsx for the admin page itself.
  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except Next.js internals and static assets.
     */
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};
