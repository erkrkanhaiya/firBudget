
"use client";

import type { ReactNode } from 'react';
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar';
import { AppHeader } from './AppHeader';
import { AppSidebar } from './AppSidebar';
import { Toaster } from "@/components/ui/toaster";
import { UserProvider } from '@/contexts/UserContext';
import { LanguageProvider } from '@/contexts/LanguageContext';
import { CurrencyProvider } from '@/contexts/CurrencyContext';
import React, { useState, useEffect, useCallback } from 'react';
import { InstallAppBanner } from './InstallAppBanner';

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: Array<string>;
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed';
    platform: string;
  }>;
  prompt(): Promise<void>;
}

interface MainLayoutProps {
  children: ReactNode;
}

const INSTALL_BANNER_SESSION_KEY = 'balancebeam-install-banner-interacted';

export function MainLayout({ children }: MainLayoutProps) {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showInstallBanner, setShowInstallBanner] = useState(false);

  useEffect(() => {
    const handler = (e: Event) => {
      const event = e as BeforeInstallPromptEvent;
      // Prevent the mini-infobar from appearing on mobile
      event.preventDefault();
      // Stash the event so it can be triggered later.
      setDeferredPrompt(event);

      // Check if banner was already interacted with this session
      const alreadyInteracted = sessionStorage.getItem(INSTALL_BANNER_SESSION_KEY);
      if (!alreadyInteracted) {
        // Show the banner after a delay
        const timer = setTimeout(() => {
          setShowInstallBanner(true);
        }, 10000); // 10 seconds delay
        return () => clearTimeout(timer);
      }
    };

    window.addEventListener('beforeinstallprompt', handler);

    return () => {
      window.removeEventListener('beforeinstallprompt', handler);
    };
  }, []);

  const handleInstallClick = useCallback(async () => {
    if (!deferredPrompt) {
      return;
    }
    // Show the install prompt
    deferredPrompt.prompt();
    // Wait for the user to respond to the prompt
    await deferredPrompt.userChoice;
    // We've used the prompt, and can't use it again, discard it
    setDeferredPrompt(null);
    setShowInstallBanner(false);
    sessionStorage.setItem(INSTALL_BANNER_SESSION_KEY, 'true');
  }, [deferredPrompt]);

  const handleDismissInstallBanner = useCallback(() => {
    setShowInstallBanner(false);
    sessionStorage.setItem(INSTALL_BANNER_SESSION_KEY, 'true');
  }, []);

  return (
    <UserProvider>
      <LanguageProvider>
        <CurrencyProvider>
          <SidebarProvider defaultOpen={true}>
            <AppSidebar />
            <SidebarInset>
              <AppHeader />
              <main className="flex-1 p-4 md:p-6 lg:p-8">
                {children}
              </main>
              <Toaster />
              {showInstallBanner && deferredPrompt && (
                <InstallAppBanner
                  onInstall={handleInstallClick}
                  onDismiss={handleDismissInstallBanner}
                />
              )}
            </SidebarInset>
          </SidebarProvider>
        </CurrencyProvider>
      </LanguageProvider>
    </UserProvider>
  );
}
