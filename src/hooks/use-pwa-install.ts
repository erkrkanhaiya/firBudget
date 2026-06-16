"use client";

import { useCallback, useEffect, useState } from "react";
import type { BeforeInstallPromptEvent } from "@/lib/pwa";
import { isIosDevice, isStandaloneApp } from "@/lib/pwa";

export function usePwaInstall() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isIos, setIsIos] = useState(false);

  useEffect(() => {
    setIsInstalled(isStandaloneApp());
    setIsIos(isIosDevice());

    const handler = (event: Event) => {
      event.preventDefault();
      setDeferredPrompt(event as BeforeInstallPromptEvent);
    };

    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const install = useCallback(async () => {
    if (!deferredPrompt) return false;

    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    setDeferredPrompt(null);

    if (outcome === "accepted") {
      setIsInstalled(true);
      return true;
    }

    return false;
  }, [deferredPrompt]);

  const canInstall = !isInstalled && (Boolean(deferredPrompt) || isIos);

  return {
    canInstall,
    isInstalled,
    isIos,
    hasNativePrompt: Boolean(deferredPrompt),
    install,
  };
}
