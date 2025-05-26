import { Coins } from 'lucide-react';
import Link from 'next/link';

interface AppLogoProps {
  className?: string;
  iconSize?: number;
  textSize?: string;
}

export function AppLogo({ className, iconSize = 28, textSize = "text-2xl" }: AppLogoProps) {
  return (
    <Link href="/" className={`flex items-center gap-2 ${className}`}>
      <Coins className="text-primary" size={iconSize} />
      <h1 className={`font-bold ${textSize} text-primary`}>HisabHoga</h1>
    </Link>
  );
}
