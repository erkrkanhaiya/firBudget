"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Monitor, Share, PlusSquare, Smartphone } from "lucide-react";

interface PwaInstallInstructionsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: "ios" | "android" | "desktop";
}

export function PwaInstallInstructionsDialog({
  open,
  onOpenChange,
  mode,
}: PwaInstallInstructionsDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Install BillBuddy</DialogTitle>
          <DialogDescription>
            Add BillBuddy to your home screen or desktop for quick access anytime — like a native app.
          </DialogDescription>
        </DialogHeader>

        {mode === "ios" && (
          <ol className="space-y-4 text-sm text-muted-foreground">
            <li className="flex items-start gap-3">
              <Share className="mt-0.5 h-5 w-5 shrink-0 text-primary" aria-hidden="true" />
              <span>
                Tap the <strong className="text-foreground">Share</strong> button in Safari.
              </span>
            </li>
            <li className="flex items-start gap-3">
              <PlusSquare className="mt-0.5 h-5 w-5 shrink-0 text-primary" aria-hidden="true" />
              <span>
                Tap <strong className="text-foreground">Add to Home Screen</strong>, then{" "}
                <strong className="text-foreground">Add</strong>.
              </span>
            </li>
          </ol>
        )}

        {mode === "android" && (
          <ol className="space-y-4 text-sm text-muted-foreground">
            <li className="flex items-start gap-3">
              <Smartphone className="mt-0.5 h-5 w-5 shrink-0 text-primary" aria-hidden="true" />
              <span>
                Tap the browser <strong className="text-foreground">menu (⋮)</strong> in Chrome.
              </span>
            </li>
            <li className="flex items-start gap-3">
              <PlusSquare className="mt-0.5 h-5 w-5 shrink-0 text-primary" aria-hidden="true" />
              <span>
                Tap <strong className="text-foreground">Install app</strong> or{" "}
                <strong className="text-foreground">Add to Home screen</strong>.
              </span>
            </li>
          </ol>
        )}

        {mode === "desktop" && (
          <ol className="space-y-4 text-sm text-muted-foreground">
            <li className="flex items-start gap-3">
              <Monitor className="mt-0.5 h-5 w-5 shrink-0 text-primary" aria-hidden="true" />
              <span>
                In Chrome or Edge, click the <strong className="text-foreground">install icon</strong>{" "}
                in the address bar, or open the browser menu.
              </span>
            </li>
            <li className="flex items-start gap-3">
              <PlusSquare className="mt-0.5 h-5 w-5 shrink-0 text-primary" aria-hidden="true" />
              <span>
                Choose <strong className="text-foreground">Install BillBuddy</strong> to add the app
                to your desktop.
              </span>
            </li>
          </ol>
        )}
      </DialogContent>
    </Dialog>
  );
}
