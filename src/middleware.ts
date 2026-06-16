
import { NextResponse } from 'next/server';

// This middleware is currently conceptual and doesn't enforce strict auth checks
// because Firebase client-side auth is handled differently.
// True server-side protection would require Firebase Session Cookies or ID token verification.

// const PROTECTED_ROUTES = ['/dashboard', '/groups', '/profile', '/expenses', '/activity'];
// const AUTH_ROUTES = ['/login', '/signup']; 

export function middleware() {
  // Client-side UserContext and Firebase onAuthStateChanged will handle most redirect logic
  // based on authentication state. This middleware can be kept simple or used for other purposes
  // like localization redirects or A/B testing in a more advanced setup.

  // Example: If you wanted to redirect all root access to /dashboard if a certain cookie exists
  // (though not the Firebase auth token directly):
  // if (pathname === '/' && request.cookies.has('some-app-preference-cookie')) {
  //   return NextResponse.redirect(new URL('/dashboard', request.url));
  // }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - manifest.json (PWA manifest)
     * - icons/ (PWA icons)
     */
    '/((?!api|_next/static|_next/image|favicon.ico|manifest.json|icons/).*)',
  ],
};
