
"use client";

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertTriangle, Activity as ActivityIcon, Loader2 } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useUser } from '@/contexts/UserContext';
import type { ActivityLog, User as UserType, Group as GroupType, Contribution } from '@/types'; // Added Contribution
import { format, parseISO } from 'date-fns';
import React, { useState, useEffect } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { db } from '@/lib/firebase';
import { collection, query, where, getDocs, Timestamp, orderBy } from 'firebase/firestore';

const getInitials = (name: string | undefined | null) => {
  if (!name) return "U";
  const names = name.split(' ');
  if (names.length > 1 && names[0] && names[names.length - 1]) {
    return (names[0][0] + names[names.length - 1][0]).toUpperCase();
  }
  if (name.length > 0) return name.substring(0, 2).toUpperCase();
  return "U";
};

interface ClientFormattedDateProps {
  timestamp: string;
  formatString?: string;
}

const ClientFormattedDate: React.FC<ClientFormattedDateProps> = ({ timestamp, formatString = "MMMM d, yyyy 'at' h:mm a" }) => {
  const [formattedDate, setFormattedDate] = useState<string | null>(null);

  useEffect(() => {
    try {
      const date = parseISO(timestamp);
      setFormattedDate(format(date, formatString));
    } catch (error) {
      console.error("Error formatting date:", error);
      setFormattedDate("Invalid date");
    }
  }, [timestamp, formatString]);

  if (formattedDate === null) {
    return <span className="text-xs text-muted-foreground">Loading date...</span>;
  }

  return <>{formattedDate}</>;
};

interface EnrichedActivityLog extends ActivityLog {
  groupName?: string;
  actorName?: string;
  actorAvatarUrl?: string | null;
}

export default function ActivityFeedPage() {
  const { currentUser } = useUser();
  const [isLoading, setIsLoading] = useState(true);
  const [relevantActivityLogs, setRelevantActivityLogs] = useState<EnrichedActivityLog[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchActivityLogs = async () => {
      if (!currentUser) {
        setIsLoading(false);
        return;
      }
      setIsLoading(true);
      setError(null);

      try {
        // 1. Get all groups the user is a member of
        const userGroupsQuery = query(
          collection(db, 'groups'),
          where('memberIds', 'array-contains', currentUser.id)
        );
        const userGroupsSnapshot = await getDocs(userGroupsQuery);
        const userGroupIds = userGroupsSnapshot.docs.map(doc => doc.id);

        const groupsDataMap = new Map<string, GroupType>();
        userGroupsSnapshot.docs.forEach(docSnap => {
             const data = docSnap.data();
             groupsDataMap.set(docSnap.id, {
                id: docSnap.id,
                name: data.name,
                members: data.members || [],
                memberIds: data.memberIds || [],
                ownerId: data.ownerId,
                visibility: data.visibility,
                createdAt: (data.createdAt as Timestamp)?.toDate().toISOString() || new Date().toISOString(),
             } as GroupType);
        });
        
        if (userGroupIds.length === 0) {
          setRelevantActivityLogs([]);
          setIsLoading(false);
          return;
        }

        // 2. For each group, fetch its activity logs
        // This part already fetches all activity logs regardless of actionType.
        // So, contribution_added logs should be included if they exist.
        const activityLogQueries = userGroupIds.map(groupId => {
          const logsColRef = collection(db, 'groups', groupId, 'activityLog');
          return getDocs(query(logsColRef, orderBy('timestamp', 'desc')));
        });

        const groupActivityLogSnapshots = await Promise.all(activityLogQueries);
        
        let fetchedLogs: EnrichedActivityLog[] = [];
        groupActivityLogSnapshots.forEach((snapshot, index) => {
          const groupId = userGroupIds[index];
          const group = groupsDataMap.get(groupId);

          snapshot.forEach(docSnap => {
            const logData = docSnap.data() as Omit<ActivityLog, 'id' | 'timestamp'> & { timestamp: Timestamp | string };
            // Determine actor based on logData.userId which should be the person performing the action
            const actor = group?.members.find(m => m.id === logData.userId) || 
                          (logData.userId === currentUser.id ? currentUser : null); 
            
            fetchedLogs.push({
              id: docSnap.id,
              ...logData,
              timestamp: (logData.timestamp instanceof Timestamp ? logData.timestamp.toDate().toISOString() : logData.timestamp as string),
              groupName: group?.name,
              actorName: actor?.name || logData.actorName, // Fallback to actorName if stored directly in log
              actorAvatarUrl: actor?.avatarUrl || logData.actorAvatarUrl
            });
          });
        });

        fetchedLogs.sort((a, b) => parseISO(b.timestamp).getTime() - parseISO(a.timestamp).getTime());
        setRelevantActivityLogs(fetchedLogs);

      } catch (err) {
        console.error("Error fetching activity logs:", err);
        setError("Could not load activity feed. Please try again.");
      } finally {
        setIsLoading(false);
      }
    };

    fetchActivityLogs();
  }, [currentUser]);

  if (!currentUser && !isLoading && !error) {
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
  
  if (error) {
     return (
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-10rem)] text-center p-4">
        <AlertTriangle className="w-16 h-16 text-destructive mb-4" />
        <h1 className="text-3xl font-bold mb-2">Error</h1>
        <p className="text-lg text-muted-foreground mb-6">{error}</p>
        <Button onClick={() => window.location.reload()}>Try Again</Button>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Activity Feed</h1>
        <p className="text-muted-foreground">Recent happenings in your groups from Firestore.</p>
      </div>

      {isLoading ? (
        <Card>
          <CardContent className="p-0">
            <ul className="divide-y divide-border">
              {Array.from({ length: 5 }).map((_, index) => (
                <li key={index} className="flex items-start gap-4 p-4">
                  <Skeleton className="h-10 w-10 rounded-full mt-1 border" />
                  <div className="flex-1 space-y-1.5">
                    <Skeleton className="h-4 w-4/5" />
                    <Skeleton className="h-3 w-1/4" />
                  </div>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      ) : relevantActivityLogs.length > 0 ? (
        <Card>
          <CardContent className="p-0">
            <ul className="divide-y divide-border">
              {relevantActivityLogs.map((log) => {
                 const defaultActorName = log.actorName || 'Unknown User';
                 let displayDescription = log.description;
                 // Check if the description already starts with the actor's name to avoid duplication
                 if (log.description.toLowerCase().startsWith(defaultActorName.toLowerCase())) {
                    displayDescription = log.description.substring(defaultActorName.length).trim();
                    if (displayDescription.startsWith('added') || displayDescription.startsWith('paid') || displayDescription.startsWith('recorded') || displayDescription.startsWith('contributed')) {
                         // Add a space if it was directly appended
                         displayDescription = ' ' + displayDescription;
                    }
                 } else {
                    displayDescription = ' ' + log.description; // ensure space if name wasn't prefix
                 }


                return (
                  <li key={log.id} className="flex items-start gap-4 p-4 hover:bg-muted/50">
                    <Avatar className="h-10 w-10 mt-1 border">
                      <AvatarImage src={log.actorAvatarUrl || undefined} alt={log.actorName} />
                      <AvatarFallback>{getInitials(log.actorName)}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <p className="text-sm">
                        <span className="font-medium">{defaultActorName}</span>
                        {displayDescription}
                        {log.groupName && log.groupId && (
                            <>
                             {' in group '}
                             <Link href={`/groups/${log.groupId}`} className="text-primary hover:underline font-medium">
                                {log.groupName}
                             </Link>
                            </>
                        )}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        <ClientFormattedDate timestamp={log.timestamp} />
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

    