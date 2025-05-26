
"use client";

import Link from 'next/link';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { PlusCircle, Users, ArrowRight, AlertTriangle, Eye, Lock, Loader2 } from 'lucide-react';
import { useUser } from '@/contexts/UserContext';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import React, { useState, useEffect } from 'react';
import { db } from '@/lib/firebase'; // Firebase setup
import { collection, getDocs, query, where, Timestamp, or } from 'firebase/firestore';
import type { Group as GroupType } from '@/types'; // Ensure Group type is imported

export default function GroupsPage() {
  const { currentUser } = useUser();
  const [isLoading, setIsLoading] = useState(true);
  const [visibleGroups, setVisibleGroups] = useState<GroupType[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchGroups = async () => {
      if (!currentUser) {
        setIsLoading(false);
        // No need to fetch if user is not logged in, access denied message will show
        return;
      }
      setIsLoading(true);
      setError(null);
      try {
        const groupsCollectionRef = collection(db, 'groups');
        
        // Query for public groups OR private groups where the current user is a member
        // Firestore 'array-contains' can check for membership.
        // For complex OR queries on different fields, you might need multiple queries and merge client-side,
        // or structure data to support it (e.g., a field combining visibility and member IDs).
        // For simplicity, we'll fetch public groups and user's private groups separately if needed,
        // or adjust data model (e.g. add a 'viewableBy' array field).
        // Current approach: fetch all groups and filter client-side based on visibility and membership.
        // This is not ideal for large datasets but works for smaller ones.
        // A more scalable approach would use specific queries.

        const qPublic = query(groupsCollectionRef, where("visibility", "==", "public"));
        const qPrivateMember = query(groupsCollectionRef, 
          where("visibility", "==", "private"),
          where("members", "array-contains", currentUser.id) // Assumes members array stores user IDs
        );
        
        // Due to Firestore limitations (can't do OR on different fields like this easily),
        // we fetch all and filter, or do two queries and merge.
        // For this example, let's fetch all documents and filter client-side for simplicity,
        // acknowledging this isn't optimal for very large collections.
        
        const querySnapshot = await getDocs(groupsCollectionRef);
        const groupsData: GroupType[] = [];
        querySnapshot.forEach((doc) => {
          const data = doc.data();
          // Convert Firestore Timestamp to ISO string for consistency with existing type
          const createdAt = data.createdAt instanceof Timestamp ? data.createdAt.toDate().toISOString() : data.createdAt;
          
          // Assuming members are stored as an array of user IDs or objects with an id property
          const membersArray = Array.isArray(data.members) ? data.members.map(member => typeof member === 'string' ? { id: member } : member) : [];

          groupsData.push({ 
            id: doc.id, 
            ...data,
            members: membersArray, // Ensure members is an array of User-like objects (with at least id)
            createdAt: createdAt 
          } as GroupType);
        });

        const filtered = groupsData.filter(group =>
          group.visibility === 'public' ||
          (group.visibility === 'private' && group.members.some(member => member.id === currentUser.id))
        );
        
        setVisibleGroups(filtered);

      } catch (err) {
        console.error("Error fetching groups:", err);
        setError("Failed to load groups. Please try again.");
      } finally {
        setIsLoading(false);
      }
    };

    fetchGroups();
  }, [currentUser]);

  if (!currentUser && !isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-10rem)] text-center p-4">
        <AlertTriangle className="w-16 h-16 text-destructive mb-4" />
        <h1 className="text-3xl font-bold mb-2">Access Denied</h1>
        <p className="text-lg text-muted-foreground mb-6">Please log in to view groups.</p>
        <Button asChild>
          <Link href="/login">Go to Login</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Groups</h1>
          <p className="text-muted-foreground">Manage and discover shared expense groups.</p>
        </div>
        <Button asChild size="lg" disabled={!currentUser || isLoading}>
          <Link href="/groups/create">
            <PlusCircle className="mr-2 h-5 w-5" /> Create New Group
          </Link>
        </Button>
      </div>

      {error && (
        <Card className="col-span-full">
          <CardContent className="p-10 text-center text-destructive">
            <AlertTriangle className="mx-auto h-12 w-12 mb-4" />
            <h3 className="text-xl font-semibold mb-2">Error</h3>
            <p>{error}</p>
          </CardContent>
        </Card>
      )}

      {isLoading ? (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <Card key={index} className="flex flex-col">
              <CardHeader>
                <Skeleton className="aspect-video w-full mb-4 rounded-md" />
                <Skeleton className="h-6 w-3/4 mb-2" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-1/2" />
              </CardHeader>
              <CardContent className="flex-grow space-y-2">
                <Skeleton className="h-4 w-1/2" />
                <Skeleton className="h-5 w-1/4" />
              </CardContent>
              <CardFooter>
                <Skeleton className="h-10 w-full" />
              </CardFooter>
            </Card>
          ))}
        </div>
      ) : !error && visibleGroups.length > 0 ? (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {visibleGroups.map((group) => {
            const isMember = currentUser && group.members.some(member => member.id === currentUser.id);
            return (
              <Card key={group.id} className="flex flex-col">
                <CardHeader>
                  {group.photoUrl && (
                    <div className="relative aspect-video w-full mb-4 rounded-md overflow-hidden">
                      <Image
                        src={group.photoUrl}
                        alt={group.name}
                        fill // Use fill instead of layout="fill" objectFit="cover"
                        sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                        className="object-cover"
                        data-ai-hint={group.dataAiHint || "group image"}
                      />
                    </div>
                  )}
                  <CardTitle className="text-xl">{group.name}</CardTitle>
                  <CardDescription className="truncate h-10">{group.description || 'No description provided.'}</CardDescription>
                </CardHeader>
                <CardContent className="flex-grow space-y-2">
                  <div className="flex items-center text-sm text-muted-foreground">
                    <Users className="mr-2 h-4 w-4" />
                    <span>{group.members.length} member{group.members.length === 1 ? '' : 's'}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {group.visibility === 'public' ? (
                      <Badge variant="outline" className="flex items-center gap-1">
                        <Eye className="h-3 w-3" /> Public
                      </Badge>
                    ) : (
                      <Badge variant="secondary" className="flex items-center gap-1">
                        <Lock className="h-3 w-3" /> Private
                      </Badge>
                    )}
                    {isMember && group.ownerId === currentUser!.id && <Badge variant="secondary">Admin</Badge>}
                    {isMember && group.ownerId !== currentUser!.id && <Badge variant="outline">Member</Badge>}
                  </div>
                </CardContent>
                <CardFooter>
                  <Button asChild className="w-full">
                    <Link href={`/groups/${group.id}`}>
                      {group.visibility === 'public' && !isMember ? 'View Group' : 'Open Group'}
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Link>
                  </Button>
                </CardFooter>
              </Card>
            );
          })}
        </div>
      ) : (
        !error && (
          <Card className="col-span-full">
            <CardContent className="p-10 text-center">
              <Users className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-xl font-semibold mb-2">No groups available.</h3>
              <p className="text-muted-foreground mb-4">
                Create a group or explore public groups once they are available.
              </p>
              <Button asChild>
                <Link href="/groups/create">
                  <PlusCircle className="mr-2 h-4 w-4" /> Create Your First Group
                </Link>
              </Button>
            </CardContent>
          </Card>
        )
      )}
    </div>
  );
}
