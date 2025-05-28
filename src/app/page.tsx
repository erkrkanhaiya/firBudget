import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import {
  Coins,
  Sparkles,
  Users,
  TrendingUp,
  ShieldCheck,
  MessageCircle,
} from "lucide-react";
import { AppLogo } from "@/components/AppLogo";

export default function LandingPage() {
  return (
    <div className="flex flex-col min-h-screen">
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 flex justify-center">
        <div className="container flex h-16 items-center justify-between">
          <AppLogo />
          <nav className="flex items-center gap-4">
            <Link
              href="/about"
              className="text-sm font-medium text-muted-foreground transition-colors hover:text-primary"
            >
              About
            </Link>
            <Link
              href="/contact"
              className="text-sm font-medium text-muted-foreground transition-colors hover:text-primary"
            >
              Contact
            </Link>
            <Button asChild variant="outline" size="sm">
              <Link href="/login">Login</Link>
            </Button>
            <Button asChild size="sm">
              <Link href="/signup">Sign Up</Link>
            </Button>
          </nav>
        </div>
      </header>

      <main className="flex-1">
        {/* Hero Section */}
        <section className="py-20 md:py-32 bg-gradient-to-b from-background to-muted/50">
          <div className="container mx-auto text-center">
            <div className="flex justify-center">
              <Image
                src="/icon-512x512.png"
                width={200}
                height={200}
                alt="Picture of the author"
                className="mb-6"
              />
            </div>
            <h1 className="text-4xl md:text-6xl font-bold tracking-tight mb-6">
              Effortless Expense Sharing with HisabKaro
            </h1>
            <p className="text-lg md:text-xl text-muted-foreground mb-10 max-w-3xl mx-auto">
              Stop stressing over shared bills. HisabKaro makes it simple to
              track group expenses, split costs fairly, and settle up with ease.
              Perfect for trips, roommates, and any shared financial life.
            </p>
            <div className="flex justify-center gap-4">
              <Button asChild size="lg">
                <Link href="/signup">Get Started for Free</Link>
              </Button>
              <Button asChild variant="outline" size="lg">
                <Link href="/about">Learn More</Link>
              </Button>
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section id="features" className="py-16 md:py-24 bg-background">
          <div className="container mx-auto">
            <h2 className="text-3xl md:text-4xl font-bold text-center mb-12">
              Why Choose HisabKaro?
            </h2>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
              <Card className="shadow-lg hover:shadow-xl transition-shadow">
                <CardHeader className="items-center text-center">
                  <div className="p-3 rounded-full bg-primary/10 text-primary mb-3">
                    <Sparkles className="h-8 w-8" />
                  </div>
                  <CardTitle>Intuitive Tracking</CardTitle>
                </CardHeader>
                <CardContent className="text-center">
                  <p className="text-muted-foreground">
                    Easily add expenses, assign participants, and see who owes
                    what in real-time.
                  </p>
                </CardContent>
              </Card>
              <Card className="shadow-lg hover:shadow-xl transition-shadow">
                <CardHeader className="items-center text-center">
                  <div className="p-3 rounded-full bg-primary/10 text-primary mb-3">
                    <Users className="h-8 w-8" />
                  </div>
                  <CardTitle>Flexible Groups</CardTitle>
                </CardHeader>
                <CardContent className="text-center">
                  <p className="text-muted-foreground">
                    Create groups for any occasion – trips, households, events,
                    and more. Set them as public or private.
                  </p>
                </CardContent>
              </Card>
              <Card className="shadow-lg hover:shadow-xl transition-shadow">
                <CardHeader className="items-center text-center">
                  <div className="p-3 rounded-full bg-primary/10 text-primary mb-3">
                    <TrendingUp className="h-8 w-8" />
                  </div>
                  <CardTitle>Clear Balances</CardTitle>
                </CardHeader>
                <CardContent className="text-center">
                  <p className="text-muted-foreground">
                    Get a clear overview of your balances within each group and
                    across all your activities.
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        {/* How It Works Section */}
        <section className="py-16 md:py-24 bg-muted/50">
          <div className="container mx-auto">
            <h2 className="text-3xl md:text-4xl font-bold text-center mb-12">
              How It Works
            </h2>
            <div className="grid md:grid-cols-3 gap-8 text-center">
              <div className="flex flex-col items-center">
                <div className="p-4 rounded-full bg-primary text-primary-foreground mb-4 text-2xl font-bold h-12 w-12 flex items-center justify-center">
                  1
                </div>
                <h3 className="text-xl font-semibold mb-2">Create a Group</h3>
                <p className="text-muted-foreground">
                  Start by creating a group for your shared activity and invite
                  members.
                </p>
              </div>
              <div className="flex flex-col items-center">
                <div className="p-4 rounded-full bg-primary text-primary-foreground mb-4 text-2xl font-bold h-12 w-12 flex items-center justify-center">
                  2
                </div>
                <h3 className="text-xl font-semibold mb-2">Add Expenses</h3>
                <p className="text-muted-foreground">
                  Log expenses as they happen, specifying who paid and how to
                  split.
                </p>
              </div>
              <div className="flex flex-col items-center">
                <div className="p-4 rounded-full bg-primary text-primary-foreground mb-4 text-2xl font-bold h-12 w-12 flex items-center justify-center">
                  3
                </div>
                <h3 className="text-xl font-semibold mb-2">Settle Up</h3>
                <p className="text-muted-foreground">
                  View balances and easily settle debts with group members.
                </p>
              </div>
            </div>
            <div className="mt-12 text-center">
              <Image
                src="https://placehold.co/800x450.png"
                alt="HisabKaro App Screenshot"
                width={800}
                height={450}
                className="rounded-lg shadow-xl mx-auto"
                data-ai-hint="app screenshot dashboard"
              />
            </div>
          </div>
        </section>

        {/* Call to Action Section */}
        <section className="py-20 md:py-32 bg-background">
          <div className="container mx-auto text-center">
            <h2 className="text-3xl md:text-4xl font-bold mb-6">
              Ready to Simplify Your Shared Expenses?
            </h2>
            <p className="text-lg text-muted-foreground mb-8 max-w-2xl mx-auto">
              Join thousands of users who trust HisabKaro for fair and
              transparent expense management.
            </p>
            <Button asChild size="lg">
              <Link href="/signup">Sign Up Now - It's Free!</Link>
            </Button>
          </div>
        </section>
      </main>

      <footer className="py-8 border-t bg-muted/30">
        <div className="container mx-auto text-center text-muted-foreground text-sm">
          <div className="flex flex-col sm:flex-row justify-center items-center gap-4 mb-4">
            <Link href="/about" className="hover:text-primary">
              About Us
            </Link>
            <Link href="/contact" className="hover:text-primary">
              Contact
            </Link>
            <Link href="#" className="hover:text-primary">
              Privacy Policy
            </Link>{" "}
            {/* Add actual link later */}
            <Link href="#" className="hover:text-primary">
              Terms of Service
            </Link>{" "}
            {/* Add actual link later */}
          </div>
          <p>
            &copy; {new Date().getFullYear()} HisabKaro. All rights reserved.
          </p>
          <p className="text-xs mt-2">
            Built with Next.js, Firebase, and ShadCN UI. Icons by Lucide.
          </p>
        </div>
      </footer>
    </div>
  );
}
