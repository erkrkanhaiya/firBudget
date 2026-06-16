import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AppLogo } from "@/components/AppLogo";
import { Target, Handshake, Lightbulb } from "lucide-react";
import { buildPageMetadata, buildOrganizationJsonLd, buildWebPageJsonLd, siteConfig } from "@/lib/seo";
import { JsonLd } from "@/components/seo/JsonLd";

export const metadata: Metadata = buildPageMetadata({
  title: "About Us — Free Expense Splitter for Groups",
  description:
    "Learn about HisabKaro, the free bill splitting app built to help friends, roommates, and travel groups track shared expenses, split costs fairly, and settle up with transparency.",
  path: "/about",
  keywords: [
    "about HisabKaro",
    "expense splitter company",
    "bill sharing mission",
    "group finance transparency",
  ],
});

export default function AboutPage() {
  return (
    <>
      <JsonLd
        data={[
          buildOrganizationJsonLd(),
          buildWebPageJsonLd(
            "/about",
            `About ${siteConfig.name}`,
            "Learn about HisabKaro — the free group expense splitter and bill sharing app."
          ),
        ]}
      />
      <div className="flex min-h-screen flex-col">
        <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
          <div className="container mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
            <AppLogo />
            <nav className="flex items-center gap-4" aria-label="About page navigation">
              <Link href="/" className="text-sm font-medium text-muted-foreground transition-colors hover:text-primary">
                Home
              </Link>
              <Link href="/contact" className="text-sm font-medium text-muted-foreground transition-colors hover:text-primary">
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

        <main className="flex-1 py-12 md:py-20">
          <div className="container mx-auto max-w-6xl px-4">
            <section className="mb-16 text-center">
              <h1 className="mb-4 text-4xl font-bold tracking-tight md:text-5xl">
                About HisabKaro — Free Group Expense Splitter
              </h1>
              <p className="mx-auto max-w-3xl text-lg text-muted-foreground md:text-xl">
                Simplifying shared expenses for everyone, everywhere. We believe managing money
                together should be transparent, fair, and stress-free.
              </p>
            </section>

            <section className="mb-16">
              <Image
                src="https://placehold.co/1200x400.png"
                alt="HisabKaro team collaboration — group expense sharing and bill splitting"
                width={1200}
                height={400}
                className="mx-auto mb-12 rounded-lg shadow-xl"
              />
              <Card className="mx-auto max-w-4xl shadow-lg">
                <CardHeader>
                  <CardTitle className="text-center text-2xl">Our Story</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4 text-muted-foreground">
                  <p>
                    HisabKaro was born from a simple idea: make splitting bills and tracking
                    shared expenses as effortless as possible. Whether you are dividing a trip
                    budget, sharing rent with roommates, or managing group event costs — money
                    should never strain relationships.
                  </p>
                  <p>
                    We built a free expense splitter that is intuitive, flexible for any group
                    scenario, and clear enough so everyone knows exactly who owes whom. Track
                    expenses, split equally or custom, and settle up via UPI or cash.
                  </p>
                  <p>
                    Our focus is a user-friendly experience that empowers people to manage
                    shared finances collaboratively — with fairness, transparency, and trust.
                  </p>
                </CardContent>
              </Card>
            </section>

            <section className="mb-16">
              <h2 className="mb-12 text-center text-3xl font-bold md:text-4xl">Our Values</h2>
              <div className="mx-auto grid max-w-5xl gap-8 md:grid-cols-3">
                <Card className="text-center">
                  <CardHeader>
                    <div className="mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 p-3 text-primary">
                      <Target className="h-8 w-8" aria-hidden="true" />
                    </div>
                    <CardTitle>Transparency</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-muted-foreground">
                      Clear expense tracking so every group member knows where they stand.
                    </p>
                  </CardContent>
                </Card>
                <Card className="text-center">
                  <CardHeader>
                    <div className="mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 p-3 text-primary">
                      <Handshake className="h-8 w-8" aria-hidden="true" />
                    </div>
                    <CardTitle>Fairness</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-muted-foreground">
                      Tools to split bills equitably — equal or custom amounts per person.
                    </p>
                  </CardContent>
                </Card>
                <Card className="text-center">
                  <CardHeader>
                    <div className="mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 p-3 text-primary">
                      <Lightbulb className="h-8 w-8" aria-hidden="true" />
                    </div>
                    <CardTitle>Simplicity</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-muted-foreground">
                      An intuitive bill sharing app that anyone can use in seconds.
                    </p>
                  </CardContent>
                </Card>
              </div>
            </section>

            <section className="text-center">
              <h2 className="mb-4 text-3xl font-bold">Start Splitting Bills for Free</h2>
              <p className="mb-8 text-muted-foreground">
                Join groups, track expenses, and settle up with HisabKaro today.
              </p>
              <Button asChild size="lg">
                <Link href="/signup">Get Started with HisabKaro</Link>
              </Button>
            </section>
          </div>
        </main>

        <footer className="border-t bg-muted/30 py-8">
          <div className="container mx-auto text-center text-sm text-muted-foreground">
            <p>&copy; {new Date().getFullYear()} HisabKaro. All rights reserved.</p>
          </div>
        </footer>
      </div>
    </>
  );
}
