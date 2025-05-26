
"use client";

import { useState, useEffect, FormEvent, ChangeEvent } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { ArrowLeft, Save, Image as ImageIcon, Lock, Unlock, AlertTriangle } from 'lucide-react';
import { useUser } from '@/contexts/UserContext';
import { mockGroups } from '@/data/mock'; // Using mock data
import type { Group, GroupVisibility } from '@/types';
import { useToast } from "@/hooks/use-toast";
import Image from 'next/image'; // Next.js Image component

export default function EditGroupPage() {
  const params = useParams();
  const router = useRouter();
  const { currentUser } = useUser();
  const { toast } = useToast();
  const groupId = params.groupId as string;

  const [group, setGroup] = useState<Group | null>(null);
  const [groupName, setGroupName] = useState('');
  const [groupDescription, setGroupDescription] = useState('');
  const [groupPhoto, setGroupPhoto] = useState<File | null>(null);
  const [groupPhotoPreview, setGroupPhotoPreview] = useState<string | null>(null);
  const [groupVisibility, setGroupVisibility] = useState<GroupVisibility>('private');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [accessDenied, setAccessDenied] = useState(false);

  useEffect(() => {
    const foundGroup = mockGroups.find(g => g.id === groupId);
    if (foundGroup) {
      if (!currentUser || foundGroup.ownerId !== currentUser.id) {
        toast({ title: "Access Denied", description: "You are not the owner of this group.", variant: "destructive" });
        setAccessDenied(true);
        // Optionally redirect: router.push('/groups');
        return;
      }
      setGroup(foundGroup);
      setGroupName(foundGroup.name);
      setGroupDescription(foundGroup.description || '');
      setGroupPhotoPreview(foundGroup.photoUrl || null);
      setGroupVisibility(foundGroup.visibility);
    } else {
      toast({ title: "Group not found", variant: "destructive" });
      setAccessDenied(true);
      // Optionally redirect: router.push('/groups');
    }
  }, [groupId, currentUser, toast, router]);

  if (accessDenied) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-15rem)] text-center p-4">
        <AlertTriangle className="w-16 h-16 text-destructive mb-4" />
        <h1 className="text-3xl font-bold mb-2">Access Denied</h1>
        <p className="text-lg text-muted-foreground mb-6">
          {group ? "You do not have permission to edit this group." : "Group not found or you do not have permission."}
        </p>
        <Button asChild>
          <Link href={`/groups/${groupId}`}>Back to Group</Link>
        </Button>
         <Button asChild variant="link" className="mt-2">
          <Link href="/groups">Go to All Groups</Link>
        </Button>
      </div>
    );
  }

  if (!currentUser || !group) {
    return <p>Loading group details...</p>;
  }

  const handlePhotoChange = (event: ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0]) {
      const file = event.target.files[0];
      setGroupPhoto(file);
      setGroupPhotoPreview(URL.createObjectURL(file));
    }
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setIsSubmitting(true);

    if (!groupName.trim()) {
      toast({ title: "Group name required", description: "Please enter a name for your group.", variant: "destructive" });
      setIsSubmitting(false);
      return;
    }

    // Simulate updating the group in mockGroups
    const groupIndex = mockGroups.findIndex(g => g.id === groupId);
    if (groupIndex > -1) {
      mockGroups[groupIndex] = {
        ...mockGroups[groupIndex],
        name: groupName,
        description: groupDescription,
        // In a real app, upload photo if groupPhoto is new, then update photoUrl
        photoUrl: groupPhotoPreview || mockGroups[groupIndex].photoUrl, // Keep old if no new preview
        visibility: groupVisibility,
        // members and ownerId should not be editable here directly
      };
      toast({
        title: "Group Updated!",
        description: `The group "${groupName}" has been successfully updated.`,
      });
      // Simulate API delay then navigate
      await new Promise(resolve => setTimeout(resolve, 300));
      router.push(`/groups/${groupId}`);
    } else {
      toast({ title: "Error", description: "Could not find group to update.", variant: "destructive" });
    }
    setIsSubmitting(false);
  };

  return (
    <div className="max-w-2xl mx-auto">
      <Button variant="outline" size="sm" asChild className="mb-4">
        <Link href={`/groups/${groupId}`}>
          <ArrowLeft className="mr-2 h-4 w-4" /> Back to Group
        </Link>
      </Button>
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">Edit Group: {group.name}</CardTitle>
          <CardDescription>Update the details for your group.</CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-6">
            <div>
              <Label htmlFor="groupName">Group Name*</Label>
              <Input
                id="groupName"
                value={groupName}
                onChange={(e) => setGroupName(e.target.value)}
                placeholder="e.g., Europe Trip, Roommates"
                required
                disabled={isSubmitting}
              />
            </div>
            <div>
              <Label htmlFor="groupDescription">Group Description (Optional)</Label>
              <Textarea
                id="groupDescription"
                value={groupDescription}
                onChange={(e) => setGroupDescription(e.target.value)}
                placeholder="A brief description of the group's purpose"
                disabled={isSubmitting}
              />
            </div>
            <div>
              <Label htmlFor="groupPhoto">Group Photo (Optional)</Label>
              <div className="mt-1 flex items-center gap-4">
                {groupPhotoPreview ? (
                  <Image data-ai-hint="group photo" src={groupPhotoPreview} alt="Group photo preview" width={80} height={80} className="rounded-md object-cover h-20 w-20" />
                ) : (
                  <div className="h-20 w-20 bg-muted rounded-md flex items-center justify-center">
                    <ImageIcon className="h-10 w-10 text-muted-foreground" />
                  </div>
                )}
                <Button type="button" variant="outline" asChild disabled={isSubmitting}>
                  <label htmlFor="group-photo-upload" className="cursor-pointer">
                    {groupPhotoPreview ? 'Change Photo' : 'Upload Photo'}
                  </label>
                </Button>
                <input id="group-photo-upload" type="file" className="hidden" accept="image/*" onChange={handlePhotoChange} disabled={isSubmitting} />
              </div>
            </div>

            <div>
                <Label>Group Visibility</Label>
                <RadioGroup
                    value={groupVisibility}
                    onValueChange={(value: GroupVisibility) => setGroupVisibility(value)}
                    className="mt-1 grid grid-cols-2 gap-4"
                    disabled={isSubmitting}
                >
                    <div>
                        <RadioGroupItem value="private" id="private" className="peer sr-only" disabled={isSubmitting}/>
                        <Label
                            htmlFor="private"
                            className={`flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary ${isSubmitting ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'}`}
                        >
                            <Lock className="mb-2 h-6 w-6" />
                            Private
                            <span className="text-xs text-muted-foreground text-center mt-1">Only invited members can see and participate.</span>
                        </Label>
                    </div>
                    <div>
                        <RadioGroupItem value="public" id="public" className="peer sr-only" disabled={isSubmitting}/>
                        <Label
                            htmlFor="public"
                            className={`flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary ${isSubmitting ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'}`}
                        >
                            <Unlock className="mb-2 h-6 w-6" />
                            Public
                            <span className="text-xs text-muted-foreground text-center mt-1">Anyone logged in can view. Only members can participate.</span>
                        </Label>
                    </div>
                </RadioGroup>
            </div>
            
            {/* Placeholder for member management - can be added in a future iteration */}
            {/* 
            <div>
              <Label>Manage Members (Coming Soon)</Label>
              <Card className="mt-1">
                <CardContent className="p-4 text-muted-foreground">
                  Member management features will be available here.
                </CardContent>
              </Card>
            </div>
            */}

          </CardContent>
          <CardFooter className="border-t px-6 py-4">
            <Button type="submit" className="ml-auto" disabled={isSubmitting}>
              {isSubmitting ? (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary-foreground mr-2"></div>
              ) : (
                <Save className="mr-2 h-4 w-4" />
              )}
              {isSubmitting ? "Saving..." : "Save Changes"}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
