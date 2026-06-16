"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Share, PlusSquare } from "lucide-react";

interface PwaIosInstallDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function PwaIosInstallDialog({ open, onOpenChange }: PwaIosInstallDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Install HisabKaro on your iPhone</DialogTitle>
          <DialogDescription>
            Add HisabKaro to your home screen for quick access anytime — like a native app.
          </DialogDescription>
        </DialogHeader>
        <ol className="space-y-4 text-sm text-muted-foreground">
          <li className="flex items-start gap-3">
            <Share className="mt-0.5 h-5 w-5 shrink-0 text-primary" aria-hidden="true" />
            <span>
              Tap the <strong className="text-foreground">Share</strong> button in Safari&apos;s toolbar
              (bottom on iPhone, top on iPad).
            </span>
          </li>
          <li className="flex items-start gap-3">
            <PlusSquare className="mt-0.5 h-5 w-5 shrink-0 text-primary" aria-hidden="true" />
            <span>
              Scroll and tap <strong className="text-foreground">Add to Home Screen</strong>, then tap{" "}
              <strong className="text-foreground">Add</strong>.
            </span>
          </li>
        </ol>
      </DialogContent>
    </Dialog>
  );
}
