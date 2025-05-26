// src/components/layout/protected-app-layout.tsx
"use client";

import type { ReactNode } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { AppLayout } from '@/components/layout/app-layout';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { Loader2 } from 'lucide-react';

export function ProtectedAppLayout({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    if (!loading) {
      if (!user && pathname !== '/login') {
        router.push('/login');
      } else if (user && pathname === '/login') {
        router.push('/');
      }
    }
  }, [user, loading, pathname, router]);

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  // If trying to access a protected route without being logged in,
  // and not yet redirected by useEffect (e.g. initial load before effect runs)
  if (!user && pathname !== '/login') {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }
  
  // If logged in and on the login page (about to be redirected)
  if (user && pathname === '/login') {
     return (
      <div className="flex h-screen items-center justify-center bg-background">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }


  if (pathname === '/login') {
    return <>{children}</>; // Render login page without AppLayout
  }

  // For all other authenticated routes, if user is present
  if (user) {
    return <AppLayout>{children}</AppLayout>;
  }
  
  // Fallback, should ideally not be reached if redirection logic is correct
  // Typically shown when user is null and path is not /login (handled above, but good to have a fallback)
  return (
      <div className="flex h-screen items-center justify-center bg-background">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
}
