
"use client";

import Link from 'next/link';
import { Bell, UserCircle, LogOut, Settings, LayoutDashboard, Info, AlertCircle, CheckCircle, Trash2 } from 'lucide-react';
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
import React from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useNotification } from '@/contexts/NotificationContext'; 
import { PwaInstallButton } from '@/components/pwa/PwaInstallButton';
import { formatDistanceToNow, parseISO } from 'date-fns';
import type { NotificationType as CustomNotificationType } from '@/types'; 

const NotificationIcon = ({ type }: { type: CustomNotificationType }) => {
  if (type === 'alert') return <AlertCircle className="h-4 w-4 text-yellow-500" />;
  if (type === 'success') return <CheckCircle className="h-4 w-4 text-green-500" />;
  if (type === 'destructive') return <AlertCircle className="h-4 w-4 text-destructive" />;
  return <Info className="h-4 w-4 text-blue-500" />;
};

export function AppHeader() {
  const { currentUser, logout } = useUser();
  const { translate } = useLanguage();
  const router = useRouter();
  const { notifications, markAsRead, clearAllNotifications, unreadCount } = useNotification(); 


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

  const handleNotificationClick = (notificationId: string, href?: string) => {
    markAsRead(notificationId);
    if (href) {
      router.push(href);
    }
  };

  const handleClearAll = () => {
    clearAllNotifications();
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
        <PwaInstallButton variant="ghost" size="sm" label="Download" />
        
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="rounded-full relative">
              <Bell className="h-5 w-5" />
              {unreadCount > 0 && ( 
                <Badge variant="destructive" className="absolute -top-1 -right-1 h-4 w-4 p-0 justify-center text-xs">
                  {unreadCount}
                </Badge>
              )}
              <span className="sr-only">Toggle notifications</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-80 sm:w-96" align="end">
            <DropdownMenuLabel className="flex justify-between items-center">
              <span>Notifications</span>
              {notifications.length > 0 && (
                <Button variant="link" size="sm" className="p-0 h-auto text-xs" onClick={handleClearAll}>
                   <Trash2 className="mr-1 h-3 w-3" /> Clear All
                </Button>
              )}
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            {notifications.length > 0 ? (
              <DropdownMenuGroup className="max-h-[400px] overflow-y-auto">
                {notifications.map((notification) => (
                  <DropdownMenuItem 
                    key={notification.id} 
                    className={`cursor-pointer flex items-start gap-3 p-3 ${!notification.read ? 'bg-accent hover:bg-accent/90' : 'hover:bg-muted/50'}`}
                    onClick={() => handleNotificationClick(notification.id, notification.href)}
                  >
                    <NotificationIcon type={notification.type} />
                    <div className="flex-1">
                      <p className={`text-sm font-medium ${!notification.read ? 'text-accent-foreground' : 'text-foreground'}`}>{notification.title}</p>
                      <p className={`text-xs ${!notification.read ? 'text-accent-foreground/90' : 'text-foreground/80'}`}>{notification.message}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {formatDistanceToNow(parseISO(notification.time), { addSuffix: true })}
                      </p>
                    </div>
                    {!notification.read && (
                        <div className="h-2.5 w-2.5 bg-primary rounded-full self-center ml-2 shrink-0"></div>
                    )}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuGroup>
            ) : (
              <div className="p-4 text-center text-sm text-muted-foreground">
                No new notifications.
              </div>
            )}
            {notifications.length > 0 && <DropdownMenuSeparator />}
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
