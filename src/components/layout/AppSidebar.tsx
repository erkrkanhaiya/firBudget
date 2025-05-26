
"use client";

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Users, UserCircle, Settings, CreditCard, Activity, type LucideIcon } from 'lucide-react';
import {
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarFooter,
} from '@/components/ui/sidebar';
import { AppLogo } from '@/components/AppLogo';
import { Separator } from '@/components/ui/separator';
import { useLanguage, type Language } from '@/contexts/LanguageContext'; // Import useLanguage and Language type

type NavItem = {
  href: string;
  label: Record<Language, string>; // Label is now an object for translations
  icon: LucideIcon;
};

const navItems: NavItem[] = [
  { href: '/dashboard', label: { en: 'Dashboard', hi: 'डैशबोर्ड' }, icon: Home },
  { href: '/groups', label: { en: 'Groups', hi: 'समूह' }, icon: Users },
  { href: '/expenses', label: { en: 'My Expenses', hi: 'मेरे खर्च' }, icon: CreditCard },
  { href: '/activity', label: { en: 'Activity Feed', hi: 'गतिविधि फ़ीड' }, icon: Activity },
];

const bottomNavItems: NavItem[] = [
 { href: '/profile', label: { en: 'Profile', hi: 'प्रोफ़ाइल' }, icon: UserCircle },
 { href: '/settings', label: { en: 'Settings', hi: 'सेटिंग्स' }, icon: Settings },
];


export function AppSidebar() {
  const pathname = usePathname();
  const { translate } = useLanguage();

  return (
    <Sidebar collapsible="icon" variant="sidebar" side="left">
      <SidebarHeader className="items-center justify-center p-4">
        <AppLogo className="group-data-[collapsible=icon]:hidden" />
        <AppLogo iconSize={28} className="hidden group-data-[collapsible=icon]:flex" />
      </SidebarHeader>
      <Separator />
      <SidebarContent className="p-2">
        <SidebarMenu>
          {navItems.map((item) => (
            <SidebarMenuItem key={item.href}>
              <Link href={item.href} legacyBehavior passHref>
                <SidebarMenuButton
                  asChild
                  isActive={pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href))}
                  tooltip={{ children: translate(item.label), className: "ml-1" }}
                >
                  <a>
                    <item.icon />
                    <span>{translate(item.label)}</span>
                  </a>
                </SidebarMenuButton>
              </Link>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarContent>
      <Separator />
      <SidebarFooter className="p-2">
         <SidebarMenu>
          {bottomNavItems.map((item) => (
            <SidebarMenuItem key={item.href}>
              <Link href={item.href} legacyBehavior passHref>
                <SidebarMenuButton
                  asChild
                  isActive={pathname.startsWith(item.href)}
                  tooltip={{ children: translate(item.label), className: "ml-1" }}
                >
                  <a>
                    <item.icon />
                    <span>{translate(item.label)}</span>
                  </a>
                </SidebarMenuButton>
              </Link>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
