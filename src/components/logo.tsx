import { WalletCards } from 'lucide-react';
import type { SVGProps } from 'react';
import { cn } from "@/lib/utils";

interface LogoProps extends SVGProps<SVGSVGElement> {
  iconOnly?: boolean;
}

export function Logo({ iconOnly = false, className, ...props }: LogoProps) {
  return (
    <div className="flex items-center gap-2" aria-label="ShareSync Logo">
      <WalletCards className={cn('h-7 w-7 text-primary', className)} {...props} />
      {!iconOnly && (
        <span className="text-xl font-semibold text-foreground">
          ShareSync
        </span>
      )}
    </div>
  );
}
