import { NextResponse } from 'next/server';
import { jwtVerify } from 'jose';

const secretKey = process.env.JWT_SECRET_KEY || 'super-secret-key-for-development';
const encodedKey = new TextEncoder().encode(secretKey);

export async function middleware(request) {
  const { pathname } = request.nextUrl;

  // Do not redirect for these paths
  const publicPaths = ['/login', '/api'];
  const isPublicPath = publicPaths.some(p => pathname.startsWith(p));

  if (isPublicPath) {
    return NextResponse.next();
  }

  // Get the session cookie
  const sessionCookie = request.cookies.get('session')?.value;

  if (!sessionCookie) {
    // No session cookie, redirect to login
    const loginUrl = new URL('/login', request.url);
    return NextResponse.redirect(loginUrl);
  }

  try {
    // Verify the JWT
    await jwtVerify(sessionCookie, encodedKey, {
      algorithms: ['HS256'],
    });
    
    // Session is valid, allow request
    return NextResponse.next();
  } catch (error) {
    // Session is invalid or expired, clear cookie and redirect to login
    const response = NextResponse.redirect(new URL('/login', request.url));
    response.cookies.delete('session');
    return response;
  }
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico, sitemap.xml, robots.txt (metadata files)
     */
    '/((?!_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt).*)',
  ],
};
