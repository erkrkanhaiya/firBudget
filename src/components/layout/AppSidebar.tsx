"use client";

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Users, UserCircle, Settings, CreditCard, Activity } from 'lucide-react';
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
import { Button } from '@/components/ui/button';
import { useUser } from '@/contexts/UserContext';

const navItems = [
  { href: '/dashboard', label: 'Dashboard', icon: Home },
  { href: '/groups', label: 'Groups', icon: Users },
  { href: '/expenses', label: 'My Expenses', icon: CreditCard },
  { href: '/activity', label: 'Activity Feed', icon: Activity },
];

const bottomNavItems = [
 { href: '/profile', label: 'Profile', icon: UserCircle },
 { href: '/settings', label: 'Settings', icon: Settings },
];


export function AppSidebar() {
  const pathname = usePathname();
  const { currentUser } = useUser();

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
                  tooltip={{ children: item.label, className: "ml-1" }}
                >
                  <a>
                    <item.icon />
                    <span>{item.label}</span>
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
                  tooltip={{ children: item.label, className: "ml-1" }}
                >
                  <a>
                    <item.icon />
                    <span>{item.label}</span>
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
