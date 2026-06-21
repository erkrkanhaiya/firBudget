import type { Metadata } from "next";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { AppLogo } from "@/components/AppLogo";
import { Mail, MessageSquare } from "lucide-react";
import { buildPageMetadata, buildWebPageJsonLd, siteConfig } from "@/lib/seo";
import { JsonLd } from "@/components/seo/JsonLd";

export const metadata: Metadata = buildPageMetadata({
  title: "Contact Us — Expense Splitter Support",
  description:
    "Contact BillBuddy for support, feedback, or questions about our free group expense splitter and bill sharing app. We help with split bills, balances, and settle up features.",
  path: "/contact",
  keywords: [
    "BillBuddy contact",
    "expense splitter support",
    "bill sharing help",
    "group expense app support",
  ],
});

export default function ContactPage() {
  return (
    <>
      <JsonLd
        data={buildWebPageJsonLd(
          "/contact",
          `Contact ${siteConfig.name}`,
          "Get in touch with the BillBuddy team for support and feedback."
        )}
      />
      <div className="flex min-h-screen flex-col">
        <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
          <div className="container mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
            <AppLogo />
            <nav className="flex items-center gap-4" aria-label="Contact page navigation">
              <Link href="/" className="text-sm font-medium text-muted-foreground transition-colors hover:text-primary">
                Home
              </Link>
              <Link href="/about" className="text-sm font-medium text-muted-foreground transition-colors hover:text-primary">
                About
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
                Contact BillBuddy Support
              </h1>
              <p className="mx-auto max-w-2xl text-lg text-muted-foreground md:text-xl">
                Questions about splitting bills, group expenses, or your account?
                We would love to hear from you.
              </p>
            </section>

            <div className="mx-auto grid max-w-5xl items-start gap-12 md:grid-cols-2">
              <section aria-labelledby="contact-form-heading">
                <Card className="shadow-lg">
                  <CardHeader>
                    <CardTitle id="contact-form-heading" className="text-2xl">
                      Send Us a Message
                    </CardTitle>
                    <CardDescription>
                      This form is for demonstration. Email us directly at {siteConfig.email}.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <Label htmlFor="name">Full Name</Label>
                      <Input id="name" placeholder="Your Name" />
                    </div>
                    <div>
                      <Label htmlFor="email">Email Address</Label>
                      <Input id="email" type="email" placeholder="you@example.com" />
                    </div>
                    <div>
                      <Label htmlFor="subject">Subject</Label>
                      <Input id="subject" placeholder="Expense splitter question..." />
                    </div>
                    <div>
                      <Label htmlFor="message">Message</Label>
                      <Textarea id="message" placeholder="Your message here..." rows={5} />
                    </div>
                    <Button className="w-full" disabled>
                      <Mail className="mr-2 h-4 w-4" aria-hidden="true" />
                      Send Message (Demo)
                    </Button>
                  </CardContent>
                </Card>
              </section>

              <section className="space-y-8" aria-labelledby="contact-info-heading">
                <h2 id="contact-info-heading" className="sr-only">
                  Contact information
                </h2>
                <Card className="shadow-md">
                  <CardHeader>
                    <CardTitle>Contact Information</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex items-center gap-3">
                      <Mail className="h-5 w-5 text-primary" aria-hidden="true" />
                      <p className="text-muted-foreground">
                        <span className="font-medium text-foreground">Email:</span>{" "}
                        <a href={`mailto:${siteConfig.email}`} className="text-primary hover:underline">
                          {siteConfig.email}
                        </a>
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <MessageSquare className="h-5 w-5 text-primary" aria-hidden="true" />
                      <p className="text-muted-foreground">
                        <span className="font-medium text-foreground">Support:</span> Bill splitting,
                        group expenses, settle up
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </section>
            </div>
          </div>
        </main>

        <footer className="border-t bg-muted/30 py-8">
          <div className="container mx-auto text-center text-sm text-muted-foreground">
            <p>&copy; {new Date().getFullYear()} BillBuddy. All rights reserved.</p>
          </div>
        </footer>
      </div>
    </>
  );
}
