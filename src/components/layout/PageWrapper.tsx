
"use client";

import { usePathname } from 'next/navigation';
import type { ReactNode } from 'react';
import { MainLayout } from './MainLayout';
import { Toaster } from "@/components/ui/toaster";

interface PageWrapperProps {
  children: ReactNode;
}

const AUTH_ROUTES = ['/login', '/signup'];
const PUBLIC_LANDING_ROUTES = ['/', '/about', '/contact']; // Added new public routes

export function PageWrapper({ children }: PageWrapperProps) {
  const pathname = usePathname();
  const isAuthRoute = AUTH_ROUTES.includes(pathname);
  const isPublicLandingRoute = PUBLIC_LANDING_ROUTES.includes(pathname);

  if (isAuthRoute || isPublicLandingRoute) { // If it's an auth route OR a public landing route
    return (
      <>
        {children}
        <Toaster /> {/* Ensure Toaster is available */}
      </>
    );
  }

  // MainLayout already includes Toaster for other routes
  return <MainLayout>{children}</MainLayout>;
}
