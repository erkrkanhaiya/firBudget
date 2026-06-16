
"use client";

import type { ReactNode } from 'react';
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar';
import { AppHeader } from './AppHeader';
import { AppSidebar } from './AppSidebar';
import { Toaster } from "@/components/ui/toaster";
import React, { useState, useEffect, useCallback } from 'react';
import { InstallAppBanner } from './InstallAppBanner';
import { usePwaInstall } from '@/hooks/use-pwa-install';

interface MainLayoutProps {
  children: ReactNode;
}

const INSTALL_BANNER_SESSION_KEY = 'HisabKaro-install-banner-interacted';

export function MainLayout({ children }: MainLayoutProps) {
  const { canInstall, hasNativePrompt, install } = usePwaInstall();
  const [showInstallBanner, setShowInstallBanner] = useState(false);

  useEffect(() => {
    if (!canInstall || !hasNativePrompt) return;

    const alreadyInteracted = sessionStorage.getItem(INSTALL_BANNER_SESSION_KEY);
    if (alreadyInteracted) return;

    const timer = setTimeout(() => {
      setShowInstallBanner(true);
    }, 10000);

    return () => clearTimeout(timer);
  }, [canInstall, hasNativePrompt]);

  const handleInstallClick = useCallback(async () => {
    await install();
    setShowInstallBanner(false);
    sessionStorage.setItem(INSTALL_BANNER_SESSION_KEY, 'true');
  }, [install]);

  const handleDismissInstallBanner = useCallback(() => {
    setShowInstallBanner(false);
    sessionStorage.setItem(INSTALL_BANNER_SESSION_KEY, 'true');
  }, []);

  return (
    <SidebarProvider defaultOpen={true}>
      <AppSidebar />
      <SidebarInset>
        <AppHeader />
        <main className="flex-1 p-4 md:p-6 lg:p-8">
          {children}
        </main>
        <Toaster />
        {showInstallBanner && hasNativePrompt && (
          <InstallAppBanner
            onInstall={handleInstallClick}
            onDismiss={handleDismissInstallBanner}
          />
        )}
      </SidebarInset>
    </SidebarProvider>
  );
}
