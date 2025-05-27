
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { AppLogo } from '@/components/AppLogo';
import { Mail, MessageSquare, Twitter, Facebook, Instagram } from 'lucide-react';

export default function ContactPage() {
  return (
    <div className="flex flex-col min-h-screen">
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-16 items-center justify-between">
          <AppLogo />
          <nav className="flex items-center gap-4">
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
        <div className="container mx-auto">
          <section className="text-center mb-16">
            <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-4">Get in Touch</h1>
            <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto">
              We'd love to hear from you! Whether you have a question, feedback, or just want to say hello, feel free to reach out.
            </p>
          </section>

          <div className="grid md:grid-cols-2 gap-12 items-start">
            <section>
              <Card className="shadow-lg">
                <CardHeader>
                  <CardTitle className="text-2xl">Send Us a Message</CardTitle>
                  <CardDescription>Please note: This form is for demonstration purposes only and does not currently send emails.</CardDescription>
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
                    <Input id="subject" placeholder="Regarding..." />
                  </div>
                  <div>
                    <Label htmlFor="message">Message</Label>
                    <Textarea id="message" placeholder="Your message here..." rows={5} />
                  </div>
                  <Button className="w-full" disabled>
                    <Mail className="mr-2 h-4 w-4" /> Send Message (Disabled)
                  </Button>
                </CardContent>
              </Card>
            </section>

            <section className="space-y-8">
              <Card className="shadow-md">
                <CardHeader>
                  <CardTitle>Contact Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center gap-3">
                    <Mail className="h-5 w-5 text-primary" />
                    <p className="text-muted-foreground">
                      <span className="font-medium text-foreground">Email:</span> support@balancebeam.example.com
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <MessageSquare className="h-5 w-5 text-primary" />
                     <p className="text-muted-foreground">
                      <span className="font-medium text-foreground">Live Chat:</span> Coming Soon!
                    </p>
                  </div>
                </CardContent>
              </Card>

              <Card className="shadow-md">
                <CardHeader>
                  <CardTitle>Follow Us</CardTitle>
                </CardHeader>
                <CardContent className="flex gap-4">
                  <Button variant="outline" size="icon" asChild>
                    <Link href="#" aria-label="BalanceBeam on Twitter">
                      <Twitter className="h-5 w-5" />
                    </Link>
                  </Button>
                  <Button variant="outline" size="icon" asChild>
                     <Link href="#" aria-label="BalanceBeam on Facebook">
                      <Facebook className="h-5 w-5" />
                    </Link>
                  </Button>
                   <Button variant="outline" size="icon" asChild>
                     <Link href="#" aria-label="BalanceBeam on Instagram">
                      <Instagram className="h-5 w-5" />
                    </Link>
                  </Button>
                </CardContent>
              </Card>
               <Card className="shadow-md">
                <CardHeader>
                  <CardTitle>Our Office (Conceptual)</CardTitle>
                </CardHeader>
                <CardContent className="space-y-1 text-muted-foreground">
                    <p>123 Beam Street,</p>
                    <p>Balance City, ST 54321</p>
                    <p>United States</p>
                </CardContent>
              </Card>
            </section>
          </div>
        </div>
      </main>

      <footer className="py-8 border-t bg-muted/30">
        <div className="container mx-auto text-center text-muted-foreground text-sm">
          <p>&copy; {new Date().getFullYear()} BalanceBeam. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
