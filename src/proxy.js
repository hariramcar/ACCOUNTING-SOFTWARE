import { NextResponse } from 'next/server';
import { jwtVerify } from 'jose';

const secretKey = process.env.JWT_SECRET_KEY || 'super-secret-key-for-development';
const encodedKey = new TextEncoder().encode(secretKey);

const ADMIN_ROUTES = [
  '/profit',
  '/accounts',
  '/inventory',
  '/history',
  '/users',
  '/export',
];

export async function proxy(request) {
  const { pathname } = request.nextUrl;

  // Always allow public routes
  if (
    pathname === '/login' ||
    pathname.startsWith('/store') ||
    pathname.startsWith('/api/ping') ||
    pathname === '/favicon.ico' ||
    pathname === '/manifest.webmanifest' ||
    pathname.startsWith('/icons')
  ) {
    // If user visits /login, check if they explicitly want to switch accounts or view login
    if (pathname === '/login') {
      const isSwitching = request.nextUrl.searchParams.has('switch') || request.nextUrl.searchParams.has('switched');
      if (isSwitching) {
        // Allow user to access login screen to switch credentials
        return NextResponse.next();
      }

      const sessionCookie = request.cookies.get('session')?.value;
      if (sessionCookie) {
        try {
          const { payload } = await jwtVerify(sessionCookie, encodedKey, { algorithms: ['HS256'] });
          if (payload && payload.userId) {
            // If they are visiting /login but didn't specify switch, let the login page render with active account switcher
            return NextResponse.next();
          }
        } catch (_) {
          // Token is invalid or expired -> wipe it cleanly
          const response = NextResponse.next();
          response.cookies.set('session', '', { path: '/', maxAge: 0, expires: new Date(0) });
          return response;
        }
      }
    }
    return NextResponse.next();
  }

  // Read session cookie
  const sessionCookie = request.cookies.get('session')?.value;
  if (!sessionCookie) {
    const loginUrl = new URL('/login', request.url);
    return NextResponse.redirect(loginUrl);
  }

  let sessionPayload = null;
  try {
    const { payload } = await jwtVerify(sessionCookie, encodedKey, {
      algorithms: ['HS256'],
    });
    sessionPayload = payload;
  } catch (err) {
    // Invalid or expired token -> redirect to login and clear cookie
    const loginUrl = new URL('/login', request.url);
    const response = NextResponse.redirect(loginUrl);
    response.cookies.delete('session');
    return response;
  }

  if (!sessionPayload || !sessionPayload.userId) {
    const loginUrl = new URL('/login', request.url);
    return NextResponse.redirect(loginUrl);
  }

  // Root Dashboard (Executive financials) is restricted to ADMIN
  if (pathname === '/') {
    if (sessionPayload.role !== 'ADMIN') {
      return NextResponse.redirect(new URL('/expenses', request.url));
    }
  }

  // Restrict ADMIN-only sections from STAFF
  const isAdminRoute = ADMIN_ROUTES.some(route => pathname === route || pathname.startsWith(`${route}/`));
  if (isAdminRoute && sessionPayload.role !== 'ADMIN') {
    return NextResponse.redirect(new URL('/expenses', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - static assets
     */
    '/((?!_next/static|_next/image|favicon.ico|manifest.webmanifest|icons).*)',
  ],
};
