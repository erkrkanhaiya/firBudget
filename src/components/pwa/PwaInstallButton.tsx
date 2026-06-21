"use client";

import { useState } from "react";
import { Download, Smartphone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { usePwaInstall } from "@/hooks/use-pwa-install";
import { PwaInstallInstructionsDialog } from "@/components/pwa/PwaInstallInstructionsDialog";
import { cn } from "@/lib/utils";

type PwaInstallButtonProps = {
  variant?: "default" | "outline" | "secondary" | "ghost";
  size?: "default" | "sm" | "lg" | "icon";
  className?: string;
  showIcon?: boolean;
  label?: string;
};

function getInstructionMode(isIos: boolean): "ios" | "android" | "desktop" {
  if (isIos) return "ios";
  if (typeof window !== "undefined" && /android/i.test(window.navigator.userAgent)) {
    return "android";
  }
  return "desktop";
}

export function PwaInstallButton({
  variant = "outline",
  size = "sm",
  className,
  showIcon = true,
  label = "Download app",
}: PwaInstallButtonProps) {
  const { isInstalled, isIos, hasNativePrompt, install } = usePwaInstall();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogMode, setDialogMode] = useState<"ios" | "android" | "desktop">("desktop");

  if (isInstalled) {
    return (
      <Button variant="ghost" size={size} className={cn("pointer-events-none opacity-70", className)} disabled>
        {showIcon && <Smartphone className="mr-2 h-4 w-4" />}
        App installed
      </Button>
    );
  }

  const handleClick = async () => {
    if (hasNativePrompt) {
      await install();
      return;
    }

    setDialogMode(getInstructionMode(isIos));
    setDialogOpen(true);
  };

  return (
    <>
      <Button type="button" variant={variant} size={size} className={className} onClick={handleClick}>
        {showIcon && <Download className="mr-2 h-4 w-4" />}
        {label}
      </Button>
      <PwaInstallInstructionsDialog open={dialogOpen} onOpenChange={setDialogOpen} mode={dialogMode} />
    </>
  );
}
