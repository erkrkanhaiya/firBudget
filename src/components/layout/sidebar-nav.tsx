"use client";

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, PlusCircle, HandCoins, Users } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  useSidebar,
} from '@/components/ui/sidebar';
import type { NavItem } from '@/types';

const navItems: NavItem[] = [
  { title: 'Dashboard', href: '/', icon: LayoutDashboard },
  { title: 'Add Expense', href: '/add-expense', icon: PlusCircle },
  { title: 'Settle Up', href: '/settle-up', icon: HandCoins },
  { title: 'Groups', href: '/groups', icon: Users },
];

export function SidebarNav() {
  const pathname = usePathname();
  const { state: sidebarState } = useSidebar();

  return (
    <SidebarMenu>
      {navItems.map((item) => (
        <SidebarMenuItem key={item.title}>
          <Link href={item.href} passHref legacyBehavior>
            <SidebarMenuButton
              asChild
              isActive={pathname === item.href}
              tooltip={item.title}
              className={cn(
                "justify-start",
                sidebarState === 'collapsed' && "justify-center" 
              )}
            >
              <a>
                <item.icon />
                {sidebarState === 'expanded' && <span>{item.title}</span>}
              </a>
            </SidebarMenuButton>
          </Link>
        </SidebarMenuItem>
      ))}
    </SidebarMenu>
  );
}
