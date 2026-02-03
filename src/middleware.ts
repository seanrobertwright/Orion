import { auth } from '@/lib/auth';
import { NextResponse } from 'next/server';

export default auth((req) => {
  const { pathname } = req.nextUrl;
  const isAuthenticated = !!req.auth;

  // Protected routes
  const protectedRoutes = ['/dashboard', '/profile', '/jobs'];
  const isProtectedRoute = protectedRoutes.some(route => pathname.startsWith(route));

  // Redirect unauthenticated users to login
  if (isProtectedRoute && !isAuthenticated) {
    return NextResponse.redirect(new URL('/login', req.url));
  }

  // Redirect authenticated users away from login
  if (pathname === '/login' && isAuthenticated) {
    return NextResponse.redirect(new URL('/dashboard', req.url));
  }

  return NextResponse.next();
});

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
};
