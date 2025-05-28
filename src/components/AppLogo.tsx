
import Image from 'next/image';
import Link from 'next/link';

interface AppLogoProps {
  className?: string;
  iconSize?: number;
  textSize?: string;
}

export function AppLogo({ className, iconSize = 28, textSize = "text-2xl" }: AppLogoProps) {
  return (
    <Link href="/" className={`flex items-center gap-2 ${className}`}>
      <Image 
        src="/logo.png" // Path relative to the 'public' directory
        alt="HisabKaro Logo"
        width={iconSize} 
        height={iconSize}
        className="object-contain"
        priority // Adding priority might help if it's LCP
      />
      <h1 className={`font-bold ${textSize} text-primary`}>HisabKaro</h1>
    </Link>
  );
}
