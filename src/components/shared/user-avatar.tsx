import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import type { User } from "@/types";
import { cn } from "@/lib/utils";

interface UserAvatarProps {
  user?: User;
  className?: string;
  size?: "sm" | "md" | "lg";
}

const getInitials = (name?: string) => {
  if (!name) return "?";
  return name.split(' ').map(n => n[0]).join('').toUpperCase();
}

export function UserAvatar({ user, className, size = "md" }: UserAvatarProps) {
  const sizeClasses = {
    sm: "h-8 w-8 text-xs",
    md: "h-10 w-10 text-sm",
    lg: "h-12 w-12 text-base",
  };

  return (
    <Avatar className={cn(sizeClasses[size], className)}>
      <AvatarImage src={user?.avatarUrl} alt={user?.name || "User"} data-ai-hint="person avatar" />
      <AvatarFallback>{getInitials(user?.name)}</AvatarFallback>
    </Avatar>
  );
}
