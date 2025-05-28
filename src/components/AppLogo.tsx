
import Image from 'next/image';
import Link from 'next/link';

interface AppLogoProps {
  className?: string;
  iconSize?: number; // This will now control width and height of the Image
  textSize?: string;
}

export function AppLogo({ className, iconSize = 28, textSize = "text-2xl" }: AppLogoProps) {
  return (
    <Link href="/" className={`flex items-center gap-2 ${className}`}>
      <Image 
        src="/logo.png" // Assuming the new logo is at public/logo.png
        alt="HisabKaro Logo"
        width={iconSize} 
        height={iconSize}
        className="object-contain" // Ensures the logo scales nicely
      />
      <h1 className={`font-bold ${textSize} text-primary`}>HisabKaro</h1>
    </Link>
  );
}
