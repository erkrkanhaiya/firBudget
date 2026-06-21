"use client";

import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  ArrowRight,
  CheckCircle2,
  HandCoins,
  Receipt,
  Shield,
  Sparkles,
  TrendingUp,
  Users,
  Wallet,
  Zap,
  Download,
} from "lucide-react";
import { useUser } from "@/contexts/UserContext";
import { AppLogo } from "@/components/AppLogo";
import { RevealOnScroll } from "@/components/landing/RevealOnScroll";
import { PwaInstallButton } from "@/components/pwa/PwaInstallButton";
import { LandingMobileNav } from "@/components/landing/LandingMobileNav";
import { faqItems } from "@/lib/seo";

const features = [
  {
    icon: Receipt,
    title: "Smart expense tracking",
    description:
      "Add bills in seconds, split equally or custom, and attach receipts with AI autofill.",
  },
  {
    icon: Users,
    title: "Groups for every occasion",
    description:
      "Trips, roommates, dinners, or events — public or private groups for anyone.",
  },
  {
    icon: TrendingUp,
    title: "Crystal-clear balances",
    description:
      "See who owes whom instantly. Balances update as expenses and payments change.",
  },
  {
    icon: HandCoins,
    title: "One-tap settle up",
    description:
      "Record cash, UPI, or bank transfers with full payment history per group.",
  },
  {
    icon: Shield,
    title: "Private & secure",
    description:
      "Your data stays in your groups. Private groups are visible only to members.",
  },
  {
    icon: Sparkles,
    title: "AI receipt scanning",
    description:
      "Snap a receipt — AI fills amount, date, and description automatically.",
  },
];

const steps = [
  {
    step: "01",
    title: "Create a group",
    description: "Set up a trip, home, or event group and invite members.",
  },
  {
    step: "02",
    title: "Log expenses",
    description: "Record who paid, how much, and how to split — under a minute.",
  },
  {
    step: "03",
    title: "Settle fairly",
    description: "View simplified balances and record payments until square.",
  },
];

const highlights = [
  "Free to start",
  "No credit card",
  "Mobile & desktop",
  "USD & INR",
];

const stats = [
  { value: "10K+", label: "Groups created" },
  { value: "50K+", label: "Expenses tracked" },
  { value: "99%", label: "Split accuracy" },
];

export function LandingHome() {
  const { currentUser } = useUser();

  const userDisplayName =
    currentUser?.name?.split(" ")[0] ||
    currentUser?.email?.split("@")[0] ||
    "Account";

  return (
    <div className="flex min-h-screen flex-col overflow-x-hidden app-shell">
      <header className="sticky top-0 z-50 glass">
        <div className="container mx-auto flex h-16 max-w-6xl items-center justify-between gap-3 px-4 md:px-6">
          <AppLogo />
          <nav className="hidden items-center gap-6 md:flex" aria-label="Main navigation">
            <Link href="#features" className="text-sm font-medium text-muted-foreground transition-colors hover:text-primary">
              Features
            </Link>
            <Link href="#how-it-works" className="text-sm font-medium text-muted-foreground transition-colors hover:text-primary">
              How it works
            </Link>
            <Link href="#faq" className="text-sm font-medium text-muted-foreground transition-colors hover:text-primary">
              FAQ
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
          </nav>
          <div className="flex items-center gap-2 sm:gap-3">
            <LandingMobileNav />
            <PwaInstallButton variant="outline" size="sm" className="hidden sm:inline-flex rounded-xl" />
            {currentUser ? (
              <>
                <Button asChild variant="ghost" size="sm" className="hidden sm:inline-flex rounded-xl">
                  <Link href="/dashboard">{userDisplayName}</Link>
                </Button>
                <Button asChild size="sm" className="rounded-lg">
                  <Link href="/dashboard">Dashboard</Link>
                </Button>
              </>
            ) : (
              <>
                <Button asChild variant="ghost" size="sm" className="hidden sm:inline-flex rounded-xl">
                  <Link href="/login">Log in</Link>
                </Button>
                <Button asChild size="sm" className="rounded-lg">
                  <Link href="/signup">Get started</Link>
                </Button>
              </>
            )}
          </div>
        </div>
      </header>

      <main id="main-content">
        {/* Centered animated hero */}
        <section
          className="relative flex min-h-[85vh] flex-col items-center justify-center overflow-hidden px-4 py-16 text-center sm:min-h-[88vh] sm:py-20"
          aria-labelledby="hero-heading"
        >
          {/* Animated background */}
          <div className="pointer-events-none absolute inset-0 -z-10 app-shell" aria-hidden="true">
            <div className="absolute left-1/2 top-1/3 h-[480px] w-[480px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#3c83dc]/20 blur-[100px] animate-pulse-glow" />
            <div
              className="absolute inset-0 opacity-[0.025]"
              style={{
                backgroundImage: `radial-gradient(circle at 1px 1px, hsl(var(--foreground)) 1px, transparent 0)`,
                backgroundSize: "32px 32px",
              }}
            />
          </div>

          <div className="mx-auto flex w-full max-w-4xl flex-col items-center">
            <Badge
              variant="secondary"
              className="animate-fade-up mb-6 border border-primary/25 bg-primary/10 px-4 py-1.5 text-primary opacity-0"
            >
              <Zap className="mr-1.5 h-3.5 w-3.5" />
              #1 free group expense splitter
            </Badge>

            <h1
              id="hero-heading"
              className="animate-fade-up animation-delay-100 opacity-0 text-4xl font-bold leading-[1.08] tracking-tight sm:text-5xl md:text-6xl lg:text-7xl"
            >
              Split bills{" "}
              <span className="text-gradient animate-shimmer">fairly</span>
              <br />
              <span className="text-muted-foreground text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-semibold">
                without the awkward math
              </span>
            </h1>

            <p className="animate-fade-up animation-delay-200 opacity-0 mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-muted-foreground md:text-xl">
              BillBuddy is the smart way to track shared expenses, split costs with friends,
              and settle up — perfect for trips, roommates, and group events.
            </p>

            <div className="animate-fade-up animation-delay-300 opacity-0 mt-10 flex w-full max-w-md flex-col gap-3 sm:max-w-none sm:flex-row sm:justify-center">
              {currentUser ? (
                <Button asChild size="lg" className="h-11 px-8 text-base">
                  <Link href="/dashboard">
                    Go to Dashboard
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
              ) : (
                <>
                  <Button asChild size="lg" className="h-11 px-8 text-base">
                    <Link href="/signup">
                      Start for free
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Link>
                  </Button>
                  <Button asChild variant="outline" size="lg" className="h-12 px-8 text-base transition-transform hover:scale-[1.02]">
                    <Link href="/login">Sign in</Link>
                  </Button>
                </>
              )}
              <PwaInstallButton
                variant="outline"
                size="lg"
                className="h-12 px-8 text-base transition-transform hover:scale-[1.02]"
                label="Download app"
              />
            </div>

            <ul className="animate-fade-up animation-delay-400 opacity-0 mt-8 flex flex-wrap items-center justify-center gap-x-6 gap-y-2">
              {highlights.map((item) => (
                <li key={item} className="flex items-center gap-1.5 text-sm text-muted-foreground">
                  <CheckCircle2 className="h-4 w-4 text-primary" aria-hidden="true" />
                  {item}
                </li>
              ))}
            </ul>
          </div>

          {/* Center showcase — floating app mockup */}
          <div className="animate-scale-in animation-delay-500 opacity-0 relative mx-auto mt-16 w-full max-w-md md:max-w-lg">
            <div className="absolute -inset-4 rounded-2xl bg-primary/10 blur-2xl" aria-hidden="true" />

            <div className="animate-float-slow relative overflow-hidden rounded-xl border border-border/60 bg-card shadow-soft-lg backdrop-blur-sm">
              <div className="flex items-center gap-2 border-b bg-muted/50 px-4 py-3">
                <div className="flex gap-1.5" aria-hidden="true">
                  <span className="h-2.5 w-2.5 rounded-full bg-red-400/80" />
                  <span className="h-2.5 w-2.5 rounded-full bg-amber-400/80" />
                  <span className="h-2.5 w-2.5 rounded-full bg-emerald-400/80" />
                </div>
                <span className="mx-auto text-xs font-medium text-muted-foreground">BillBuddy Dashboard</span>
              </div>

              <div className="space-y-4 p-5 sm:p-6">
                <div className="flex items-center justify-between">
                  <div className="text-left">
                    <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Europe Trip</p>
                    <p className="text-3xl font-bold">₹12,450</p>
                    <p className="text-sm font-medium text-emerald-600 dark:text-emerald-400">You are owed ₹820</p>
                  </div>
                  <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 ring-4 ring-primary/10">
                    <Wallet className="h-7 w-7 text-primary" />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  {[
                    { label: "Expenses", value: "24" },
                    { label: "Members", value: "5" },
                    { label: "Settled", value: "18" },
                  ].map((stat, i) => (
                    <div
                      key={stat.label}
                      className="rounded-xl border bg-background/70 p-3 text-center transition-transform hover:scale-105"
                      style={{ animationDelay: `${600 + i * 100}ms` }}
                    >
                      <p className="text-xl font-bold">{stat.value}</p>
                      <p className="text-[10px] text-muted-foreground">{stat.label}</p>
                    </div>
                  ))}
                </div>

                <div className="space-y-2 text-left">
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Recent</p>
                  {[
                    { name: "Train · Berlin", amount: "₹1,200", delay: 0 },
                    { name: "Dinner · Prague", amount: "₹750", delay: 1 },
                    { name: "Airbnb deposit", amount: "₹4,500", delay: 2 },
                  ].map((exp) => (
                    <div
                      key={exp.name}
                      className="flex items-center justify-between rounded-xl border bg-background/60 px-3 py-2.5 transition-all hover:border-primary/30 hover:bg-primary/5"
                    >
                      <span className="text-sm font-medium">{exp.name}</span>
                      <span className="text-sm font-semibold text-primary">{exp.amount}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Floating chips */}
            <div className="animate-float absolute -left-2 top-1/4 hidden rounded-xl border bg-card px-3 py-2 shadow-lg sm:block md:-left-8">
              <p className="text-xs font-semibold text-emerald-600">+ ₹400 settled</p>
            </div>
            <div className="animate-float-slow absolute -right-2 top-1/3 hidden rounded-xl border bg-card px-3 py-2 shadow-lg sm:block md:-right-8">
              <p className="text-xs font-semibold">5 members active</p>
            </div>
          </div>

          {/* Stats strip */}
          <div className="animate-fade-up animation-delay-700 opacity-0 mx-auto mt-16 grid w-full max-w-2xl grid-cols-3 gap-4 border-t border-border/60 pt-10">
            {stats.map((stat) => (
              <div key={stat.label} className="text-center">
                <p className="text-2xl font-bold text-primary md:text-3xl">{stat.value}</p>
                <p className="mt-1 text-xs text-muted-foreground md:text-sm">{stat.label}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Features */}
        <section id="features" className="border-y border-border/50 bg-muted/20 py-20 md:py-28" aria-labelledby="features-heading">
          <div className="container mx-auto max-w-6xl px-4 md:px-6">
            <RevealOnScroll className="mx-auto mb-14 max-w-2xl text-center">
              <Badge variant="outline" className="mb-4">Features</Badge>
              <h2 id="features-heading" className="text-3xl font-bold tracking-tight sm:text-4xl">
                Everything to split expenses fairly
              </h2>
              <p className="mt-4 text-muted-foreground">
                From quick dinners to month-long trips — one app for all shared spending.
              </p>
            </RevealOnScroll>

            <div className="mx-auto grid max-w-5xl gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {features.map((feature, i) => (
                <RevealOnScroll key={feature.title} delay={i * 80} className="h-full">
                  <article className="group h-full overflow-hidden rounded-xl border border-border/60 bg-card p-6 text-center transition-all duration-300 hover:border-primary/25 hover:shadow-soft sm:text-left">
                    <div className="mx-auto mb-4 inline-flex rounded-lg bg-primary/10 p-3 transition-colors duration-300 group-hover:bg-primary/15 sm:mx-0">
                      <feature.icon className="h-6 w-6 text-primary" aria-hidden="true" />
                    </div>
                    <h3 className="mb-2 text-lg font-semibold">{feature.title}</h3>
                    <p className="text-sm leading-relaxed text-muted-foreground">{feature.description}</p>
                  </article>
                </RevealOnScroll>
              ))}
            </div>
          </div>
        </section>

        {/* How it works — centered */}
        <section id="how-it-works" className="py-20 md:py-28" aria-labelledby="steps-heading">
          <div className="container mx-auto max-w-6xl px-4 md:px-6">
            <RevealOnScroll className="mx-auto mb-14 max-w-2xl text-center">
              <Badge variant="outline" className="mb-4">How it works</Badge>
              <h2 id="steps-heading" className="text-3xl font-bold tracking-tight sm:text-4xl">
                Three steps. Zero confusion.
              </h2>
              <p className="mt-4 text-muted-foreground">
                No spreadsheets needed — just create, log, and settle.
              </p>
            </RevealOnScroll>

            <div className="mx-auto grid max-w-4xl gap-8 md:grid-cols-3">
              {steps.map((item, i) => (
                <RevealOnScroll key={item.step} delay={i * 120}>
                  <div className="flex flex-col items-center text-center">
                    <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-xl bg-primary text-lg font-bold text-primary-foreground shadow-glow">
                      {item.step}
                    </div>
                    <h3 className="mb-2 text-xl font-semibold">{item.title}</h3>
                    <p className="text-sm leading-relaxed text-muted-foreground">{item.description}</p>
                  </div>
                </RevealOnScroll>
              ))}
            </div>
          </div>
        </section>

        {/* Use cases */}
        <section className="border-y border-border/50 bg-muted/20 py-20 md:py-24" aria-labelledby="usecases-heading">
          <div className="container mx-auto max-w-6xl px-4 md:px-6">
            <div className="mx-auto grid max-w-5xl items-center gap-12 lg:grid-cols-2">
              <RevealOnScroll className="flex flex-col items-center text-center lg:items-start lg:text-left">
                <Badge variant="outline" className="mb-4">Use cases</Badge>
                <h2 id="usecases-heading" className="text-3xl font-bold tracking-tight sm:text-4xl">
                  Built for real shared spending
                </h2>
                <p className="mt-4 text-muted-foreground">
                  Roommates, travelers, teams, and families — BillBuddy fits every group.
                </p>
                <ul className="mt-8 space-y-4 text-left">
                  {[
                    "Weekend trips & vacations",
                    "Shared apartments & rent",
                    "Office lunches & team outings",
                    "Events, parties & celebrations",
                  ].map((useCase) => (
                    <li key={useCase} className="flex items-center justify-center gap-3 lg:justify-start">
                      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10">
                        <CheckCircle2 className="h-4 w-4 text-primary" aria-hidden="true" />
                      </span>
                      <span className="font-medium">{useCase}</span>
                    </li>
                  ))}
                </ul>
              </RevealOnScroll>

              <RevealOnScroll delay={150}>
                <div className="relative flex justify-center">
                  <div className="absolute inset-0 rounded-full bg-primary/15 blur-3xl animate-pulse-glow" aria-hidden="true" />
                  <Image
                    src="/icon-512x512.png"
                    width={260}
                    height={260}
                    alt="BillBuddy — group expense sharing app logo"
                    className="relative animate-float drop-shadow-2xl"
                    priority={false}
                  />
                </div>
              </RevealOnScroll>
            </div>
          </div>
        </section>

        {/* Download app */}
        <section className="border-y bg-muted/30 py-16 md:py-20" aria-labelledby="download-heading">
          <div className="container mx-auto max-w-6xl px-4 md:px-6">
            <RevealOnScroll>
              <div className="mx-auto flex max-w-3xl flex-col items-center text-center">
                <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10">
                  <Download className="h-7 w-7 text-primary" aria-hidden="true" />
                </div>
                <h2 id="download-heading" className="text-3xl font-bold tracking-tight sm:text-4xl">
                  Install BillBuddy on your phone
                </h2>
                <p className="mt-4 text-muted-foreground">
                  Download the PWA and open BillBuddy from your home screen anytime — no app store needed.
                  Works on Android, iPhone, and desktop.
                </p>
                <div className="mt-8">
                  <PwaInstallButton variant="default" size="lg" className="h-12 px-8" label="Download app" />
                </div>
              </div>
            </RevealOnScroll>
          </div>
        </section>

        {/* FAQ — SEO rich content */}
        <section id="faq" className="border-y border-border/50 bg-muted/20 py-20 md:py-24" aria-labelledby="faq-heading">
          <div className="container mx-auto max-w-6xl px-4 md:px-6">
            <RevealOnScroll className="mx-auto mb-14 max-w-2xl text-center">
              <Badge variant="outline" className="mb-4">FAQ</Badge>
              <h2 id="faq-heading" className="text-3xl font-bold tracking-tight sm:text-4xl">
                Frequently asked questions about expense splitting
              </h2>
              <p className="mt-4 text-muted-foreground">
                Everything you need to know about using BillBuddy as your free bill splitting app.
              </p>
            </RevealOnScroll>

            <div className="mx-auto grid max-w-3xl gap-4">
              {faqItems.map((item, i) => (
                <RevealOnScroll key={item.question} delay={i * 60}>
                  <article className="rounded-xl border border-border/60 bg-card p-6">
                    <h3 className="mb-2 text-lg font-semibold">{item.question}</h3>
                    <p className="text-sm leading-relaxed text-muted-foreground">{item.answer}</p>
                  </article>
                </RevealOnScroll>
              ))}
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="py-20 md:py-28" aria-labelledby="cta-heading">
          <div className="container mx-auto max-w-6xl px-4 md:px-6">
            <RevealOnScroll>
              <div className="relative mx-auto max-w-3xl overflow-hidden rounded-2xl border border-primary/20 bg-card px-6 py-16 text-center shadow-soft-lg sm:px-12">
                <div className="pointer-events-none absolute inset-0 app-shell opacity-80" aria-hidden="true" />
                <div className="relative">
                  <h2 id="cta-heading" className="text-3xl font-bold tracking-tight sm:text-4xl">
                    Start splitting smarter today
                  </h2>
                  <p className="mx-auto mt-4 max-w-lg text-muted-foreground">
                    Free forever for personal use. Create your account and add your first group in under 60 seconds.
                  </p>
                  <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
                    {currentUser ? (
                      <Button asChild size="lg" className="h-11 w-full sm:w-auto">
                        <Link href="/dashboard">
                          Go to Dashboard
                          <ArrowRight className="ml-2 h-4 w-4" />
                        </Link>
                      </Button>
                    ) : (
                      <>
                        <Button asChild size="lg" className="h-11 w-full sm:w-auto">
                          <Link href="/signup">
                            Create free account
                            <ArrowRight className="ml-2 h-4 w-4" />
                          </Link>
                        </Button>
                        <Button asChild size="lg" variant="outline" className="h-11 w-full sm:w-auto">
                          <Link href="/about">Learn more</Link>
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </RevealOnScroll>
          </div>
        </section>
      </main>

      <footer className="border-t border-border/50 bg-muted/20 py-10" role="contentinfo">
        <div className="container mx-auto max-w-6xl px-4 md:px-6">
          <div className="flex flex-col items-center justify-between gap-6 sm:flex-row">
            <AppLogo textSize="text-xl" />
            <nav className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm text-muted-foreground" aria-label="Footer navigation">
              <Link href="/blog" className="transition-colors hover:text-primary">Blog</Link>
              <Link href="/about" className="transition-colors hover:text-primary">About</Link>
              <Link href="/contact" className="transition-colors hover:text-primary">Contact</Link>
              <Link href="#features" className="transition-colors hover:text-primary">Features</Link>
              {currentUser ? (
                <>
                  <Link href="/dashboard" className="transition-colors hover:text-primary">{userDisplayName}</Link>
                  <Link href="/dashboard" className="transition-colors hover:text-primary">Dashboard</Link>
                </>
              ) : (
                <>
                  <Link href="/login" className="transition-colors hover:text-primary">Log in</Link>
                  <Link href="/signup" className="transition-colors hover:text-primary">Sign up</Link>
                </>
              )}
            </nav>
          </div>
          <div className="mt-8 border-t pt-6 text-center text-sm text-muted-foreground">
            <p>&copy; {new Date().getFullYear()} BillBuddy. All rights reserved.</p>
            <p className="mt-1 text-xs">
              Free group expense splitter · Bill sharing app · USD & INR
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
