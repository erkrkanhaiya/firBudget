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
      <span className="relative flex shrink-0 items-center justify-center overflow-hidden rounded-xl shadow-sm ring-1 ring-border/60 transition-transform duration-200 group-hover:scale-[1.02]">
        <Image
          src="/icon-512x512.png"
          width={iconSize + 14}
          height={iconSize + 14}
          alt="BillBuddy"
          className="rounded-xl"
        />
      </span>
      <span className={`font-bold tracking-tight ${textSize}`}>
        <span className="text-foreground">Bill</span>
        <span className="text-primary">Buddy</span>
      </span>
    </Link>
  );
}
