import Link from "next/link";
import Image from "next/image";

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
    <Link
      href="/"
      className={`group flex items-center gap-2.5 transition-opacity hover:opacity-90 ${className ?? ""}`}
    >
      <span className="relative flex shrink-0 items-center justify-center overflow-hidden rounded-lg ring-1 ring-primary/20 transition-transform duration-200 group-hover:scale-[1.02]">
        <Image
          src="/icon-512x512.png"
          width={iconSize + 12}
          height={iconSize + 12}
          alt="BillBuddy"
          className="rounded-lg"
        />
      </span>
      <span className={`font-bold tracking-tight ${textSize}`}>
        <span className="text-foreground">Bill</span>
        <span className="bg-gradient-to-r from-[#3c83dc] via-[#5ca0ef] to-[#3c83dc] bg-clip-text text-transparent">Buddy</span>
      </span>
    </Link>
  );
}
