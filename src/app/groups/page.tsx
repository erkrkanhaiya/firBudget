
"use client";

import Link from 'next/link';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { PlusCircle, Users, ArrowRight, AlertTriangle, Eye, Lock } from 'lucide-react';
import { mockGroups } from '@/data/mock'; // Using mock data
import { useUser } from '@/contexts/UserContext';
import { Badge } from '@/components/ui/badge';

export default function GroupsPage() {
  const { currentUser } = useUser();

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

  // Filter groups:
  // - Public groups are always visible
  // - Private groups are visible only if the current user is a member
  const visibleGroups = mockGroups.filter(group => 
    group.visibility === 'public' || 
    (group.visibility === 'private' && group.members.some(member => member.id === currentUser.id))
  );

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Groups</h1>
          <p className="text-muted-foreground">Manage and discover shared expense groups.</p>
        </div>
        <Button asChild size="lg">
          <Link href="/groups/create">
            <PlusCircle className="mr-2 h-5 w-5" /> Create New Group
          </Link>
        </Button>
      </div>

      {visibleGroups.length > 0 ? (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {visibleGroups.map((group) => {
            const isMember = group.members.some(member => member.id === currentUser.id);
            return (
              <Card key={group.id} className="flex flex-col">
                <CardHeader>
                  {group.photoUrl && (
                    <div className="relative aspect-video w-full mb-4 rounded-md overflow-hidden">
                      <Image 
                        src={group.photoUrl} 
                        alt={group.name} 
                        layout="fill" 
                        objectFit="cover"
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
                    {isMember && group.ownerId === currentUser.id && <Badge variant="secondary">Admin</Badge>}
                    {isMember && group.ownerId !== currentUser.id && <Badge variant="outline">Member</Badge>}
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
      )}
    </div>
  );
}
