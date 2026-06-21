import Link from "next/link";
import { Button } from "@/components/ui/button";
import { AppLogo } from "@/components/AppLogo";
import { PwaInstallButton } from "@/components/pwa/PwaInstallButton";
import { LandingMobileNav } from "@/components/landing/LandingMobileNav";

interface PublicPageShellProps {
  children: React.ReactNode;
}

export function PublicPageShell({ children }: PublicPageShellProps) {
  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-50 glass border-b">
        <div className="container mx-auto flex h-16 max-w-6xl items-center justify-between gap-3 px-4">
          <AppLogo />
          <nav className="hidden items-center gap-4 md:flex" aria-label="Site navigation">
            <Link href="/" className="text-sm font-medium text-muted-foreground transition-colors hover:text-primary">
              Home
            </Link>
            <Link href="/blog" className="text-sm font-medium text-muted-foreground transition-colors hover:text-primary">
              Blog
            </Link>
            <Link href="/about" className="text-sm font-medium text-muted-foreground transition-colors hover:text-primary">
              About
            </Link>
            <Link href="/contact" className="text-sm font-medium text-muted-foreground transition-colors hover:text-primary">
              Contact
            </Link>
            <PwaInstallButton variant="outline" size="sm" className="rounded-xl" />
            <Button asChild variant="ghost" size="sm" className="rounded-xl">
              <Link href="/login">Log in</Link>
            </Button>
            <Button asChild size="sm" className="rounded-xl shadow-glow">
              <Link href="/signup">Get started</Link>
            </Button>
          </nav>
          <div className="flex items-center gap-2 md:hidden">
            <Button asChild size="sm" className="rounded-xl">
              <Link href="/signup">Start</Link>
            </Button>
            <LandingMobileNav />
          </div>
        </div>
      </header>
      {children}
      <footer className="mt-auto border-t bg-muted/30 py-10">
        <div className="container mx-auto max-w-6xl px-4 text-center text-sm text-muted-foreground">
          <nav className="mb-4 flex flex-wrap items-center justify-center gap-x-6 gap-y-2" aria-label="Footer navigation">
            <Link href="/" className="transition-colors hover:text-primary">Home</Link>
            <Link href="/blog" className="transition-colors hover:text-primary">Blog</Link>
            <Link href="/about" className="transition-colors hover:text-primary">About</Link>
            <Link href="/contact" className="transition-colors hover:text-primary">Contact</Link>
            <Link href="/signup" className="transition-colors hover:text-primary">Sign up</Link>
          </nav>
          <p>&copy; {new Date().getFullYear()} BillBuddy. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
