"use client";

import Link from 'next/link';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { PlusCircle, Users, ArrowRight, AlertTriangle } from 'lucide-react';
import { mockGroups, mockUser } from '@/data/mock'; // Using mock data
import type { Group } from '@/types';
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

  // Filter groups where the current user is a member
  const userGroups = mockGroups.filter(group => 
    group.members.some(member => member.id === currentUser.id)
  );

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Your Groups</h1>
          <p className="text-muted-foreground">Manage your shared expense groups.</p>
        </div>
        <Button asChild size="lg">
          <Link href="/groups/create">
            <PlusCircle className="mr-2 h-5 w-5" /> Create New Group
          </Link>
        </Button>
      </div>

      {userGroups.length > 0 ? (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {userGroups.map((group) => (
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
              <CardContent className="flex-grow">
                <div className="flex items-center text-sm text-muted-foreground">
                  <Users className="mr-2 h-4 w-4" />
                  <span>{group.members.length} member{group.members.length === 1 ? '' : 's'}</span>
                </div>
                 {group.ownerId === currentUser.id && <Badge variant="secondary" className="mt-2">Admin</Badge>}
              </CardContent>
              <CardFooter>
                <Button asChild className="w-full">
                  <Link href={`/groups/${group.id}`}>
                    View Group <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      ) : (
        <Card className="col-span-full">
          <CardContent className="p-10 text-center">
            <Users className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-xl font-semibold mb-2">No groups yet!</h3>
            <p className="text-muted-foreground mb-4">
              Create a group to start sharing expenses with friends or family.
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
