
"use client";

import { Button } from "@/components/ui/button";
import { DownloadCloud, X } from "lucide-react";

interface InstallAppBannerProps {
  onInstall: () => void;
  onDismiss: () => void;
}

export function InstallAppBanner({ onInstall, onDismiss }: InstallAppBannerProps) {
  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 p-4 bg-background border-t border-border shadow-lg print:hidden">
      <div className="container mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="text-center sm:text-left">
          <p className="font-semibold text-lg">Install BillBuddy</p>
          <p className="text-sm text-muted-foreground">
            Add our app to your home screen for a quick and easy access!
          </p>
        </div>
        <div className="flex gap-2 shrink-0">
          <Button onClick={onInstall} size="sm">
            <DownloadCloud className="mr-2 h-4 w-4" />
            Install
          </Button>
          <Button variant="outline" onClick={onDismiss} size="sm">
            <X className="mr-2 h-4 w-4" />
            Not now
          </Button>
        </div>
      </div>
    </div>
  );
}
