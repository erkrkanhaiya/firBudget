import { Coins } from "lucide-react";
import Link from "next/link";
import Image from "next/image"; // Keep Image import if other parts of app use it, but AppLogo won't

interface AppLogoProps {
  className?: string;
  iconSize?: number;
  textSize?: string;
}

export function AppLogo({
  className,
  iconSize = 28,
  textSize = "text-2xl",
}: AppLogoProps) {
  return (
    <Link href="/" className={`flex items-center gap-2 ${className}`}>
      {/* Reverted to Coins icon */}
      <Image
        src="/icon-512x512.png"
        width={45}
        height={45}
        alt="Picture of the author"
      />
      {/* <Coins className="text-primary" size={iconSize} /> */}
      <h1 className={`font-bold ${textSize} text-primary`}>HisabKaro</h1>
    </Link>
  );
}
