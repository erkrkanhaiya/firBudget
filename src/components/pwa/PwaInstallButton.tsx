"use client";

import { useState } from "react";
import { Download, Smartphone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { usePwaInstall } from "@/hooks/use-pwa-install";
import { PwaIosInstallDialog } from "@/components/pwa/PwaIosInstallDialog";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

type PwaInstallButtonProps = {
  variant?: "default" | "outline" | "secondary" | "ghost";
  size?: "default" | "sm" | "lg" | "icon";
  className?: string;
  showIcon?: boolean;
  label?: string;
};

export function PwaInstallButton({
  variant = "outline",
  size = "sm",
  className,
  showIcon = true,
  label = "Download app",
}: PwaInstallButtonProps) {
  const { canInstall, isInstalled, isIos, hasNativePrompt, install } = usePwaInstall();
  const [iosDialogOpen, setIosDialogOpen] = useState(false);
  const { toast } = useToast();

  if (isInstalled) {
    return (
      <Button variant="ghost" size={size} className={cn("pointer-events-none opacity-70", className)} disabled>
        {showIcon && <Smartphone className="mr-2 h-4 w-4" />}
        App installed
      </Button>
    );
  }

  if (!canInstall) return null;

  const handleClick = async () => {
    if (hasNativePrompt) {
      await install();
      return;
    }

    if (isIos) {
      setIosDialogOpen(true);
      return;
    }

    toast({
      title: "Install HisabKaro",
      description: "Open your browser menu and choose “Install app” or “Add to Home screen”.",
    });
  };

  return (
    <>
      <Button type="button" variant={variant} size={size} className={className} onClick={handleClick}>
        {showIcon && <Download className="mr-2 h-4 w-4" />}
        {label}
      </Button>
      <PwaIosInstallDialog open={iosDialogOpen} onOpenChange={setIosDialogOpen} />
    </>
  );
}
