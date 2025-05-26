
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

// Mock notifications data
const mockNotifications = [
  { id: '1', type: 'info', title: 'New Expense Added', message: 'Maria added "Dinner" to Europe Trip.', time: '2h ago', read: false, href: '/groups/group1' },
  { id: '2', type: 'alert', title: 'Payment Reminder', message: 'You owe Ken $15 in "Europe Trip".', time: '1d ago', read: false, href: '/groups/group1/settle-up' },
  { id: '3', type: 'success', title: 'Payment Received', message: 'Alex Johnson paid you $50 for "Monthly Rent".', time: '3d ago', read: true, href: '/expenses' },
  { id: '4', type: 'info', title: 'Welcome!', message: 'Thanks for joining BalanceBeam!', time: '5d ago', read: true, href: '/dashboard' },
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
  const [notifications, setNotifications] = useState(mockNotifications);

  const handleLogout = () => {
    logout();
    router.push('/login'); 
  };
  
  const getInitials = (name: string | undefined) => {
    if (!name) return 'U';
    const names = name.split(' ');
    if (names.length > 1) {
      return names[0][0] + names[names.length - 1][0];
    }
    return name.substring(0, 2);
  };

  const unreadNotificationsCount = notifications.filter(n => !n.read).length;

  const handleNotificationClick = (notificationId: string) => {
    setNotifications(prev => 
      prev.map(n => n.id === notificationId ? { ...n, read: true } : n)
    );
    const notification = notifications.find(n => n.id === notificationId);
    if (notification?.href) {
      router.push(notification.href);
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
              {unreadNotificationsCount > 0 && (
                <Badge variant="destructive" className="absolute -top-1 -right-1 h-4 w-4 p-0 justify-center text-xs">
                  {unreadNotificationsCount}
                </Badge>
              )}
              <span className="sr-only">Toggle notifications</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-80 sm:w-96" align="end">
            <DropdownMenuLabel className="flex justify-between items-center">
              <span>Notifications</span>
              {notifications.length > 0 && (
                 <Button variant="link" size="sm" className="p-0 h-auto text-xs" onClick={() => setNotifications(prev => prev.map(n => ({...n, read: true})))}>
                    Mark all as read
                 </Button>
              )}
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            {notifications.length > 0 ? (
              <DropdownMenuGroup className="max-h-[400px] overflow-y-auto">
                {notifications.map((notification) => (
                  <DropdownMenuItem 
                    key={notification.id} 
                    className={`cursor-pointer flex items-start gap-3 p-3 ${!notification.read ? 'bg-accent/50' : ''}`}
                    onClick={() => handleNotificationClick(notification.id)}
                  >
                    <NotificationIcon type={notification.type} />
                    <div className="flex-1">
                      <p className={`text-sm font-medium ${!notification.read ? 'text-foreground' : 'text-muted-foreground'}`}>{notification.title}</p>
                      <p className={`text-xs ${!notification.read ? 'text-foreground/80' : 'text-muted-foreground/80'}`}>{notification.message}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{notification.time}</p>
                    </div>
                    {!notification.read && <div className="h-2 w-2 rounded-full bg-primary mt-1 self-center"></div>}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuGroup>
            ) : (
              <div className="p-4 text-center text-sm text-muted-foreground">
                No new notifications.
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
                  <AvatarImage src={currentUser.avatarUrl} alt={currentUser.name} />
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
