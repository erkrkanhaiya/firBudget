import type { ReactNode } from 'react';
import {
  SidebarProvider,
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarFooter,
  SidebarInset,
} from '@/components/ui/sidebar';
import { SidebarNav } from './sidebar-nav';
import { Header } from './header';
import { Logo } from '@/components/logo';
import { Button } from '@/components/ui/button';
import { LogOut } from 'lucide-react';
import { Toaster } from "@/components/ui/toaster";

interface AppLayoutProps {
  children: ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  return (
    <SidebarProvider defaultOpen={true}>
      <Sidebar variant="sidebar" collapsible="icon" side="left" className="border-r">
        <SidebarHeader className="p-4">
          <Logo />
        </SidebarHeader>
        <SidebarContent>
          <SidebarNav />
        </SidebarContent>
        <SidebarFooter className="p-4">
           <Button variant="ghost" className="w-full justify-start gap-2">
            <LogOut className="h-4 w-4" />
            <span>Log Out</span>
          </Button>
        </SidebarFooter>
      </Sidebar>
      <SidebarInset>
        <Header />
        <main className="flex-1 p-4 md:p-6 lg:p-8">
          {children}
        </main>
        <Toaster />
      </SidebarInset>
    </SidebarProvider>
  );
}
