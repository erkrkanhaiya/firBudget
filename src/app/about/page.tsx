
import Link from 'next/link';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AppLogo } from '@/components/AppLogo';
import { Users, Target, Handshake, Lightbulb } from 'lucide-react';

export default function AboutPage() {
  return (
    <div className="flex flex-col min-h-screen">
       <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-16 items-center justify-between">
          <AppLogo />
          <nav className="flex items-center gap-4">
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
        <div className="container mx-auto">
          <section className="text-center mb-16">
            <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-4">About BalanceBeam</h1>
            <p className="text-lg md:text-xl text-muted-foreground max-w-3xl mx-auto">
              Simplifying shared expenses for everyone, everywhere. We believe managing money together shouldn't be complicated.
            </p>
          </section>

          <section className="mb-16">
            <Image 
              src="https://placehold.co/1200x400.png" 
              alt="Team or abstract representing collaboration" 
              width={1200} 
              height={400}
              className="rounded-lg shadow-xl mx-auto mb-12"
              data-ai-hint="team collaboration abstract"
            />
            <Card className="max-w-4xl mx-auto shadow-lg">
              <CardHeader>
                <CardTitle className="text-2xl text-center">Our Story</CardTitle>
              </CardHeader>
              <CardContent className="text-muted-foreground space-y-4">
                <p>
                  BalanceBeam was born from a simple idea: to make sharing expenses as effortless and transparent as possible. We've all been there – trying to split bills after a trip, figuring out roommate finances, or managing costs for a group event. It can be a headache, leading to awkward conversations and sometimes, even strained relationships.
                </p>
                <p>
                  We decided to build a solution that takes the stress out of shared finances. A platform that is intuitive to use, flexible enough for various scenarios, and clear enough to ensure everyone is on the same page. That's how BalanceBeam came to be.
                </p>
                 <p>
                  Our focus is on creating a user-friendly experience that empowers individuals and groups to manage their money collaboratively, fostering fairness and understanding.
                </p>
              </CardContent>
            </Card>
          </section>

          <section className="mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-center mb-12">Our Values</h2>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
              <Card className="text-center">
                <CardHeader>
                   <div className="p-3 rounded-full bg-primary/10 text-primary mb-3 w-16 h-16 mx-auto flex items-center justify-center">
                    <Target className="h-8 w-8" />
                  </div>
                  <CardTitle>Transparency</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">Clear, easy-to-understand expense tracking so everyone knows where they stand.</p>
                </CardContent>
              </Card>
              <Card className="text-center">
                <CardHeader>
                  <div className="p-3 rounded-full bg-primary/10 text-primary mb-3 w-16 h-16 mx-auto flex items-center justify-center">
                    <Handshake className="h-8 w-8" />
                  </div>
                  <CardTitle>Fairness</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">Tools that help ensure expenses are split equitably among participants.</p>
                </CardContent>
              </Card>
              <Card className="text-center">
                <CardHeader>
                   <div className="p-3 rounded-full bg-primary/10 text-primary mb-3 w-16 h-16 mx-auto flex items-center justify-center">
                    <Lightbulb className="h-8 w-8" />
                  </div>
                  <CardTitle>Simplicity</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">An intuitive and straightforward user experience for all.</p>
                </CardContent>
              </Card>
            </div>
          </section>
          
          <section className="text-center">
            <h2 className="text-3xl font-bold mb-4">Join Us on Our Journey</h2>
            <p className="text-muted-foreground mb-8">
              We're constantly working to improve BalanceBeam and add new features.
            </p>
            <Button asChild size="lg">
              <Link href="/signup">Get Started with BalanceBeam</Link>
            </Button>
          </section>
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
