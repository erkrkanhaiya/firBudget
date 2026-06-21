"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Home,
  Users,
  CreditCard,
  BarChart3,
  Menu,
  Activity,
  Users2,
  UserCircle,
  Settings,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/contexts/LanguageContext";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { useState } from "react";

const primaryTabs = [
  { href: "/dashboard", icon: Home, label: { en: "Home", hi: "होम" } },
  { href: "/groups", icon: Users, label: { en: "Groups", hi: "समूह" } },
  { href: "/expenses", icon: CreditCard, label: { en: "Expenses", hi: "खर्च" } },
  { href: "/balances", icon: BarChart3, label: { en: "Balances", hi: "शेष" } },
] as const;

const moreLinks = [
  { href: "/activity", icon: Activity, label: { en: "Activity", hi: "गतिविधि" } },
  { href: "/members", icon: Users2, label: { en: "Contacts", hi: "संपर्क" } },
  { href: "/profile", icon: UserCircle, label: { en: "Profile", hi: "प्रोफ़ाइल" } },
  { href: "/settings", icon: Settings, label: { en: "Settings", hi: "सेटिंग्स" } },
] as const;

function isActive(pathname: string, href: string) {
  if (href === "/dashboard") return pathname === "/dashboard";
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function MobileBottomNav() {
  const pathname = usePathname();
  const { translate } = useLanguage();
  const [moreOpen, setMoreOpen] = useState(false);
  const moreActive = moreLinks.some((item) => isActive(pathname, item.href));

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-50 md:hidden border-t border-border/60 bg-background/90 backdrop-blur-xl supports-[backdrop-filter]:bg-background/80"
      aria-label="Main navigation"
    >
      <div className="mx-auto flex h-[4.25rem] max-w-lg items-stretch justify-around px-1 pb-[env(safe-area-inset-bottom)]">
        {primaryTabs.map((tab) => {
          const active = isActive(pathname, tab.href);
          const Icon = tab.icon;
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={cn(
                "flex flex-1 flex-col items-center justify-center gap-0.5 rounded-xl px-1 py-1.5 text-[10px] font-medium transition-all duration-200 active:scale-95",
                active
                  ? "text-primary"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <span
                className={cn(
                  "flex h-9 w-9 items-center justify-center rounded-xl transition-all duration-200",
                  active && "bg-primary/10 shadow-sm"
                )}
              >
                <Icon className={cn("h-5 w-5", active && "stroke-[2.5]")} />
              </span>
              <span>{translate(tab.label)}</span>
            </Link>
          );
        })}

        <Sheet open={moreOpen} onOpenChange={setMoreOpen}>
          <SheetTrigger asChild>
            <button
              type="button"
              className={cn(
                "flex flex-1 flex-col items-center justify-center gap-0.5 rounded-xl px-1 py-1.5 text-[10px] font-medium transition-all duration-200 active:scale-95",
                moreActive ? "text-primary" : "text-muted-foreground hover:text-foreground"
              )}
            >
              <span
                className={cn(
                  "flex h-9 w-9 items-center justify-center rounded-xl transition-all duration-200",
                  moreActive && "bg-primary/10 shadow-sm"
                )}
              >
                <Menu className={cn("h-5 w-5", moreActive && "stroke-[2.5]")} />
              </span>
              <span>{translate({ en: "More", hi: "अधिक" })}</span>
            </button>
          </SheetTrigger>
          <SheetContent side="bottom" className="rounded-t-2xl pb-[env(safe-area-inset-bottom)]">
            <SheetHeader>
              <SheetTitle>{translate({ en: "More", hi: "अधिक" })}</SheetTitle>
            </SheetHeader>
            <div className="mt-4 grid grid-cols-2 gap-2">
              {moreLinks.map((item) => {
                const Icon = item.icon;
                const active = isActive(pathname, item.href);
                return (
                  <Button
                    key={item.href}
                    asChild
                    variant={active ? "secondary" : "outline"}
                    className="h-auto justify-start gap-3 rounded-xl px-4 py-3"
                    onClick={() => setMoreOpen(false)}
                  >
                    <Link href={item.href}>
                      <Icon className="h-5 w-5 shrink-0" />
                      <span>{translate(item.label)}</span>
                    </Link>
                  </Button>
                );
              })}
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </nav>
  );
}
