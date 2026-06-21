
"use client";

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Users, UserCircle, Settings, CreditCard, Activity, Users2, BarChart3, type LucideIcon } from 'lucide-react'; // Added BarChart3
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
import { useLanguage, type Language } from '@/contexts/LanguageContext'; 
import { useIsMobile } from '@/hooks/use-mobile';

type NavItem = {
  href: string;
  label: Record<Language, string>; 
  icon: LucideIcon;
};

const navItems: NavItem[] = [
  { href: '/dashboard', label: { en: 'Dashboard', hi: 'डैशबोर्ड' }, icon: Home },
  { href: '/groups', label: { en: 'Groups', hi: 'समूह' }, icon: Users },
  { href: '/expenses', label: { en: 'My Expenses', hi: 'मेरे खर्च' }, icon: CreditCard },
  { href: '/balances', label: { en: 'Overall Balances', hi: 'कुल शेष' }, icon: BarChart3 }, // New Balances Link
  { href: '/activity', label: { en: 'Activity Feed', hi: 'गतिविधि फ़ीड' }, icon: Activity },
  { href: '/members', label: { en: 'Members', hi: 'सदस्य' }, icon: Users2 },
];

const bottomNavItems: NavItem[] = [
 { href: '/profile', label: { en: 'Profile', hi: 'प्रोफ़ाइल' }, icon: UserCircle },
 { href: '/settings', label: { en: 'Settings', hi: 'सेटिंग्स' }, icon: Settings },
];


export function AppSidebar() {
  const pathname = usePathname();
  const { translate } = useLanguage();
  const isMobile = useIsMobile();

  if (isMobile) {
    return null;
  }

  return (
    <Sidebar collapsible="icon" variant="sidebar" side="left" className="border-r border-border/60">
      <SidebarHeader className="items-center justify-center p-4">
        <AppLogo className="group-data-[collapsible=icon]:hidden" />
        <AppLogo iconSize={28} className="hidden group-data-[collapsible=icon]:flex" />
      </SidebarHeader>
      <Separator />
      <SidebarContent className="p-2">
        <SidebarMenu>
          {navItems.map((item) => (
            <SidebarMenuItem key={item.href}>
              <SidebarMenuButton
                asChild
                isActive={pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href))}
                tooltip={{ children: translate(item.label), className: "ml-1" }}
              >
                <Link href={item.href}>
                  <item.icon />
                  <span>{translate(item.label)}</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarContent>
      <Separator />
      <SidebarFooter className="p-2">
         <SidebarMenu>
          {bottomNavItems.map((item) => (
            <SidebarMenuItem key={item.href}>
              <SidebarMenuButton
                asChild
                isActive={pathname.startsWith(item.href)}
                tooltip={{ children: translate(item.label), className: "ml-1" }}
              >
                <Link href={item.href}>
                  <item.icon />
                  <span>{translate(item.label)}</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}


    