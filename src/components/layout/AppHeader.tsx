
"use client";

import Link from 'next/link';
import { Bell, UserCircle, LogOut, Settings, LayoutDashboard, Info, AlertCircle, CheckCircle } from 'lucide-react';
import { AppLogo } from '@/components/AppLogo';
import { Button } from '@/components/ui/button';
import { SidebarTrigger } from '@/components/ui/sidebar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuGroup,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useUser } from '@/contexts/UserContext';
import { useRouter } from 'next/navigation';
import { Badge } from '@/components/ui/badge';
import React, { useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';

// Mock notifications data - kept as static examples
const mockNotifications = [
  { id: '1', type: 'info', title: 'New Expense Feature', message: 'You can now add expenses to your groups!', time: '2h ago', read: false, href: '/groups' },
  { id: '2', type: 'alert', title: 'Invite Friends', message: 'Remember to invite your friends to collaborate.', time: '1d ago', read: false, href: '/groups/create' },
  { id: '3', type: 'success', title: 'Welcome to BalanceBeam!', message: 'Start by creating a group or joining one.', time: '3d ago', read: true, href: '/dashboard' },
];


const NotificationIcon = ({ type }: { type: string }) => {
  if (type === 'alert') return <AlertCircle className="h-4 w-4 text-destructive" />;
  if (type === 'success') return <CheckCircle className="h-4 w-4 text-green-500" />;
  return <Info className="h-4 w-4 text-blue-500" />;
};

export function AppHeader() {
  const { currentUser, logout } = useUser();
  const { translate } = useLanguage();
  const router = useRouter();
  // Notifications are now static examples
  const notifications = mockNotifications; 

  const handleLogout = async () => {
    await logout(); 
    router.push('/login'); 
  };
  
  const getInitials = (name: string | undefined | null) => {
    if (!name) return 'U';
    const names = name.split(' ');
    if (names.length > 1 && names[0] && names[names.length - 1]) {
      return (names[0][0] + names[names.length - 1][0]).toUpperCase();
    }
    if (name.length > 0) return name.substring(0, 2).toUpperCase();
    return "U";
  };

  // Unread count is removed as notifications are static examples
  // const unreadNotificationsCount = notifications.filter(n => !n.read).length;

  const handleNotificationClick = (href?: string) => {
    // Mark as read functionality is removed for static example
    if (href) {
      router.push(href);
    }
  };

  return (
    <header className="sticky top-0 z-40 flex h-16 items-center gap-4 border-b bg-background/80 px-4 backdrop-blur-md md:px-6">
      <div className="flex items-center gap-2 md:hidden">
        <SidebarTrigger />
      </div>
      <div className="hidden md:block">
         <AppLogo iconSize={24} textSize="text-xl" />
      </div>
      <div className="flex w-full items-center justify-end gap-1 sm:gap-2">
        
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="rounded-full relative">
              <Bell className="h-5 w-5" />
              {/* Static badge example, or remove if not desired for mock data */}
              {notifications.some(n => !n.read) && ( 
                <Badge variant="destructive" className="absolute -top-1 -right-1 h-4 w-4 p-0 justify-center text-xs">
                  {notifications.filter(n => !n.read).length}
                </Badge>
              )}
              <span className="sr-only">Toggle notifications</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-80 sm:w-96" align="end">
            <DropdownMenuLabel className="flex justify-between items-center">
              <span>Notifications (Examples)</span>
              {/* Mark all as read button removed */}
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            {notifications.length > 0 ? (
              <DropdownMenuGroup className="max-h-[400px] overflow-y-auto">
                {notifications.map((notification) => (
                  <DropdownMenuItem 
                    key={notification.id} 
                    className={`cursor-pointer flex items-start gap-3 p-3`}
                    onClick={() => handleNotificationClick(notification.href)}
                    // Styling for read/unread removed as it's static
                  >
                    <NotificationIcon type={notification.type} />
                    <div className="flex-1">
                      <p className={`text-sm font-medium text-foreground`}>{notification.title}</p>
                      <p className={`text-xs text-foreground/80`}>{notification.message}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{notification.time}</p>
                    </div>
                    {/* Read indicator dot removed */}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuGroup>
            ) : (
              <div className="p-4 text-center text-sm text-muted-foreground">
                No example notifications.
              </div>
            )}
            <DropdownMenuSeparator />
            <DropdownMenuItem className="justify-center" asChild>
              <Link href="/activity" className="text-sm text-primary hover:underline">
                View all activity
              </Link>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {currentUser ? (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="relative h-9 w-9 rounded-full">
                <Avatar className="h-9 w-9">
                  <AvatarImage src={currentUser.avatarUrl || undefined} alt={currentUser.name || ''} />
                  <AvatarFallback>{getInitials(currentUser.name)}</AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56" align="end" forceMount>
              <DropdownMenuLabel className="font-normal">
                <div className="flex flex-col space-y-1">
                  <p className="text-sm font-medium leading-none">{currentUser.name}</p>
                  <p className="text-xs leading-none text-muted-foreground">
                    {currentUser.email}
                  </p>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link href="/dashboard">
                  <LayoutDashboard className="mr-2 h-4 w-4" />
                  <span>{translate({en: "Dashboard", hi: "डैशबोर्ड"})}</span>
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/profile">
                  <UserCircle className="mr-2 h-4 w-4" />
                  <span>{translate({en: "Profile", hi: "प्रोफ़ाइल"})}</span>
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/settings">
                    <Settings className="mr-2 h-4 w-4" />
                    <span>{translate({en: "Settings", hi: "सेटिंग्स"})}</span>
                </Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleLogout}>
                <LogOut className="mr-2 h-4 w-4" />
                <span>{translate({en: "Log out", hi: "लॉग आउट करें"})}</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ) : (
           <Button asChild>
            <Link href="/login">{translate({en: "Login", hi: "लॉग इन करें"})}</Link>
          </Button>
        )}
      </div>
    </header>
  );
}

    