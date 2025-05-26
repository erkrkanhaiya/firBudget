import { SidebarTrigger } from '@/components/ui/sidebar';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Bell, Settings } from 'lucide-react';
import { currentUser } from '@/lib/mock-data';

export function Header() {
  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase();
  }
  
  return (
    <header className="sticky top-0 z-40 flex h-16 items-center gap-4 border-b bg-background/80 px-4 backdrop-blur-md md:px-6">
      <div className="md:hidden">
        <SidebarTrigger />
      </div>
      <div className="hidden md:block font-semibold text-lg text-foreground">
        ShareSync
      </div>
      <div className="flex w-full items-center justify-end gap-4">
        <Button variant="ghost" size="icon" aria-label="Notifications">
          <Bell className="h-5 w-5" />
        </Button>
        <Button variant="ghost" size="icon" aria-label="Settings">
          <Settings className="h-5 w-5" />
        </Button>
        <Avatar className="h-9 w-9">
          <AvatarImage src={currentUser.avatarUrl} alt={currentUser.name} data-ai-hint="user profile" />
          <AvatarFallback>{getInitials(currentUser.name)}</AvatarFallback>
        </Avatar>
      </div>
    </header>
  );
}
