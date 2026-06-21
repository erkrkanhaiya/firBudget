
"use client";

import { Button } from "@/components/ui/button";
import { DownloadCloud, X } from "lucide-react";

interface InstallAppBannerProps {
  onInstall: () => void;
  onDismiss: () => void;
}

export function InstallAppBanner({ onInstall, onDismiss }: InstallAppBannerProps) {
  return (
    <div className="fixed inset-x-0 bottom-[4.25rem] z-40 border-t border-border/60 bg-background/95 p-4 shadow-soft-lg backdrop-blur-xl md:bottom-0 print:hidden pb-[max(1rem,env(safe-area-inset-bottom))]">
      <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 sm:flex-row">
        <div className="text-center sm:text-left">
          <p className="text-lg font-semibold">Install BillBuddy</p>
          <p className="text-sm text-muted-foreground">
            Add to your home screen for quick access anytime.
          </p>
        </div>
        <div className="flex shrink-0 gap-2">
          <Button onClick={onInstall} size="sm" className="rounded-xl">
            <DownloadCloud className="mr-2 h-4 w-4" />
            Install
          </Button>
          <Button variant="outline" onClick={onDismiss} size="sm" className="rounded-xl">
            <X className="mr-2 h-4 w-4" />
            Not now
          </Button>
        </div>
      </div>
    </div>
  );
}
