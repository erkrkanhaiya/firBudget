
"use client";

import Link from 'next/link';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { PlusCircle, Users, ArrowRight, AlertTriangle, Eye, Lock, Loader2, Plane, Home as HomeIcon, Heart, PartyPopper, Shapes } from 'lucide-react';
import { useUser } from '@/contexts/UserContext';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import React, { useState, useEffect } from 'react';
import { fetchUserGroups } from "@/lib/group-access";
import type { Group as GroupType, GroupCategory } from '@/types';

const groupCategoryIcons: Record<GroupCategory, React.ElementType> = {
  TRIP: Plane,
  HOME: HomeIcon,
  COUPLE: Heart,
  PARTY: PartyPopper,
  OTHER: Shapes,
};

const CategoryIconDisplay = ({ category }: { category?: GroupCategory }) => {
  const IconComponent = category ? groupCategoryIcons[category] : groupCategoryIcons['OTHER'];
  return <IconComponent className="h-16 w-16 text-muted-foreground" />;
};


export default function GroupsPage() {
  const { currentUser, isLoadingAuth } = useUser();
  const [isLoadingGroups, setIsLoadingGroups] = useState(true);
  const [visibleGroups, setVisibleGroups] = useState<GroupType[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchGroups = async () => {
      if (isLoadingAuth) return;

      if (!currentUser) {
        setIsLoadingGroups(false);
        return;
      }

      setIsLoadingGroups(true);
      setError(null);
      try {
        const sortedGroups = await fetchUserGroups(currentUser);
        setVisibleGroups(sortedGroups);

      } catch (err) {
        console.error("Error fetching groups:", err);
        setError("Failed to load groups. Please try again.");
      } finally {
        setIsLoadingGroups(false);
      }
    };

    fetchGroups();
  }, [currentUser, isLoadingAuth]);

  if (isLoadingAuth) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-10rem)]">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  if (!currentUser) {
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
        <div className="space-y-1">
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Groups</h1>
          <p className="text-sm text-muted-foreground sm:text-base">Manage and discover shared expense groups.</p>
        </div>
        <Button asChild size="lg" disabled={!currentUser} className="w-full rounded-xl shadow-glow sm:w-auto">
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

      {isLoadingGroups ? (
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
        <div className="grid gap-4 sm:grid-cols-2 sm:gap-5 lg:grid-cols-3 xl:grid-cols-4">
          {visibleGroups.map((group) => {
            const isMember = currentUser && group.memberIds.includes(currentUser.id);
            return (
              <Link key={group.id} href={`/groups/${group.id}`}>
                <Card key={group.id} className="card-premium flex flex-col overflow-hidden">
                  <CardHeader>
                    {group.photoUrl ? (
                      <div className="relative aspect-video w-full mb-4 rounded-md overflow-hidden">
                        <Image
                          src={group.photoUrl}
                          alt={group.name}
                          fill
                          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                          className="object-cover"
                          data-ai-hint={group.dataAiHint || "group image"}
                          priority={false}
                        />
                      </div>
                    ) : (
                      <div className="relative aspect-video w-full mb-4 rounded-md overflow-hidden bg-muted flex items-center justify-center">
                        <CategoryIconDisplay category={group.category} />
                      </div>
                    )}
                    <CardTitle className="text-xl">{group.name}</CardTitle>
                    <CardDescription className="truncate h-10">{group.description || 'No description provided.'}</CardDescription>
                  </CardHeader>
                  <CardContent className="flex-grow space-y-2">
                    <div className="flex items-center text-sm text-muted-foreground">
                      <Users className="mr-2 h-4 w-4" />
                      <span>{group.memberIds.length} member{group.memberIds.length === 1 ? '' : 's'}</span>
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
                      {isMember && group.ownerId === currentUser!.id && <Badge variant="default" className="bg-primary/80">Admin</Badge>}
                      {isMember && group.ownerId !== currentUser!.id && <Badge variant="outline">Member</Badge>}
                    </div>
                  </CardContent>
                  <CardFooter>
                    <Button asChild className="w-full">
                      <span className='flex items-center'>
                        {group.visibility === 'public' && !isMember ? 'View Group' : 'Open Group'}
                        <ArrowRight className="ml-2 h-4 w-4" />
                      </span>
                    </Button>
                  </CardFooter>
                </Card>
              </Link>
            );
          })}
        </div>
      ) : (
        !error && (
          <Card className="col-span-full">
            <CardContent className="p-10 text-center">
              <Users className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-xl font-semibold mb-2">No groups found.</h3>
              <p className="text-muted-foreground mb-4">
                Create a group, or ask the admin to invite you by email. Public groups will also appear here.
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
