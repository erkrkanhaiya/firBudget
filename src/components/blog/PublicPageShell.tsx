import Link from "next/link";
import { Button } from "@/components/ui/button";
import { AppLogo } from "@/components/AppLogo";
import { PwaInstallButton } from "@/components/pwa/PwaInstallButton";

interface PublicPageShellProps {
  children: React.ReactNode;
}

export function PublicPageShell({ children }: PublicPageShellProps) {
  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
          <AppLogo />
          <nav className="flex items-center gap-4" aria-label="Site navigation">
            <Link href="/" className="hidden text-sm font-medium text-muted-foreground transition-colors hover:text-primary sm:inline">
              Home
            </Link>
            <Link href="/blog" className="text-sm font-medium text-muted-foreground transition-colors hover:text-primary">
              Blog
            </Link>
            <Link href="/about" className="hidden text-sm font-medium text-muted-foreground transition-colors hover:text-primary sm:inline">
              About
            </Link>
            <PwaInstallButton variant="outline" size="sm" />
            <Button asChild variant="outline" size="sm" className="hidden sm:inline-flex">
              <Link href="/login">Log in</Link>
            </Button>
            <Button asChild size="sm">
              <Link href="/signup">Get started</Link>
            </Button>
          </nav>
        </div>
      </header>
      {children}
      <footer className="mt-auto border-t bg-muted/40 py-8">
        <div className="container mx-auto max-w-6xl px-4 text-center text-sm text-muted-foreground">
          <nav className="mb-4 flex flex-wrap items-center justify-center gap-x-6 gap-y-2" aria-label="Footer navigation">
            <Link href="/" className="hover:text-primary">Home</Link>
            <Link href="/blog" className="hover:text-primary">Blog</Link>
            <Link href="/about" className="hover:text-primary">About</Link>
            <Link href="/contact" className="hover:text-primary">Contact</Link>
            <Link href="/signup" className="hover:text-primary">Sign up</Link>
          </nav>
          <p>&copy; {new Date().getFullYear()} BillBuddy. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
