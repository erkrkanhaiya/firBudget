
"use client";

import { usePathname } from 'next/navigation';
import type { ReactNode } from 'react';
import { MainLayout } from './MainLayout';
import { Toaster } from "@/components/ui/toaster";

interface PageWrapperProps {
  children: ReactNode;
}

const AUTH_ROUTES = ['/login', '/signup'];

export function PageWrapper({ children }: PageWrapperProps) {
  const pathname = usePathname();
  const isAuthRoute = AUTH_ROUTES.includes(pathname);

  if (isAuthRoute) {
    return (
      <>
        {children}
        <Toaster /> {/* Ensure Toaster is available for auth routes */}
      </>
    );
  }

  // MainLayout already includes Toaster for other routes
  return <MainLayout>{children}</MainLayout>;
}
