import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// This is a conceptual middleware.
// In a real app, you'd check for a valid session token (e.g., from a cookie).
// For this demo, it doesn't actually check authentication state as that's client-side.
// A proper auth solution would involve httpOnly cookies or server-side session management.

const PROTECTED_ROUTES = ['/dashboard', '/groups', '/profile', '/expenses', '/activity'];
const AUTH_ROUTES = ['/login', '/signup']; // Example, signup not implemented

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  
  // This is a simplified check. In a real app, verify an actual auth token.
  // For now, we're assuming if they go to login, they are not "authenticated" for this purpose.
  const isAuthenticated = request.cookies.has('auth-token-placeholder'); // Placeholder

  if (PROTECTED_ROUTES.some(route => pathname.startsWith(route))) {
    if (!isAuthenticated && pathname !== '/login') { // Allow access to login page itself
      // If trying to access a protected route without being "authenticated", redirect to login.
      // But since our auth is client-side mocked, this won't effectively protect server-rendered content.
      // This is more of a navigation hint for client-side routing.
      // For actual protection, you'd handle this server-side or with proper session cookies.
      // return NextResponse.redirect(new URL('/login', request.url));
    }
  }

  if (AUTH_ROUTES.some(route => pathname.startsWith(route))) {
    if (isAuthenticated) {
      // If "authenticated" and trying to access login/signup, redirect to dashboard.
      // return NextResponse.redirect(new URL('/dashboard', request.url));
    }
  }

  return NextResponse.next();
}

// See "Matching Paths" below to learn more
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
};
