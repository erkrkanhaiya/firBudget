
"use client";

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertTriangle, Activity as ActivityIcon } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useUser } from '@/contexts/UserContext';
import { mockActivityLog, mockUsers, mockGroups } from '@/data/mock';
import type { ActivityLog, User as UserType } from '@/types';
import { format, parseISO } from 'date-fns';

const getInitials = (name: string | undefined) => {
  if (!name) return "U";
  const names = name.split(' ');
  if (names.length > 1) {
    return names[0][0] + names[names.length - 1][0];
  }
  return name.substring(0, 2).toUpperCase();
};

export default function ActivityFeedPage() {
  const { currentUser } = useUser();

  if (!currentUser) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-10rem)] text-center p-4">
        <AlertTriangle className="w-16 h-16 text-destructive mb-4" />
        <h1 className="text-3xl font-bold mb-2">Access Denied</h1>
        <p className="text-lg text-muted-foreground mb-6">Please log in to view the activity feed.</p>
        <Button asChild>
          <Link href="/login">Go to Login</Link>
        </Button>
      </div>
    );
  }

  // Get IDs of groups the current user is a member of
  const userGroupIds = mockGroups
    .filter(group => group.members.some(member => member.id === currentUser.id))
    .map(group => group.id);

  // Filter activity logs to only include those from the user's groups
  const relevantActivityLogs = mockActivityLog
    .filter(log => userGroupIds.includes(log.groupId))
    .sort((a, b) => parseISO(b.timestamp).getTime() - parseISO(a.timestamp).getTime());

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Activity Feed</h1>
        <p className="text-muted-foreground">Recent happenings in your groups.</p>
      </div>

      {relevantActivityLogs.length > 0 ? (
        <Card>
          <CardContent className="p-0">
            <ul className="divide-y divide-border">
              {relevantActivityLogs.map((log) => {
                const actor = mockUsers.find(u => u.id === log.userId);
                const group = mockGroups.find(g => g.id === log.groupId);
                return (
                  <li key={log.id} className="flex items-start gap-4 p-4 hover:bg-muted/50">
                    <Avatar className="h-10 w-10 mt-1 border">
                      <AvatarImage src={actor?.avatarUrl} alt={actor?.name} />
                      <AvatarFallback>{getInitials(actor?.name)}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <p className="text-sm">
                        <span className="font-medium">{actor?.name || 'Unknown User'}</span>
                        {log.description.startsWith(actor?.name || 'Unknown User') ? log.description.substring((actor?.name || 'Unknown User').length).trim() : log.description}
                        {group && (
                            <>
                             {' in group '} 
                             <Link href={`/groups/${group.id}`} className="text-primary hover:underline font-medium">
                                {group.name}
                             </Link>
                            </>
                        )}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {format(parseISO(log.timestamp), "MMMM d, yyyy 'at' h:mm a")}
                      </p>
                    </div>
                  </li>
                );
              })}
            </ul>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-10 text-center">
            <ActivityIcon className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-xl font-semibold mb-2">No Recent Activity</h3>
            <p className="text-muted-foreground">
              It's quiet here... Activities from your groups will appear on this page.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
