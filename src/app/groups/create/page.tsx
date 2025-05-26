
"use client";

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { ArrowLeft, PlusCircle, Image as ImageIcon, Users, UserPlus, Lock, Unlock } from 'lucide-react';
import { useUser } from '@/contexts/UserContext';
import { mockUsers } from '@/data/mock'; // for member selection demo
import { useToast } from "@/hooks/use-toast";
import type { User, GroupVisibility } from '@/types';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import Image from 'next/image'; // For Next/Image component
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"


export default function CreateGroupPage() {
  const router = useRouter();
  const { currentUser } = useUser();
  const { toast } = useToast();

  const [groupName, setGroupName] = useState('');
  const [groupDescription, setGroupDescription] = useState('');
  const [groupPhoto, setGroupPhoto] = useState<File | null>(null);
  const [groupPhotoPreview, setGroupPhotoPreview] = useState<string | null>(null);
  const [selectedMembers, setSelectedMembers] = useState<User[]>(currentUser ? [currentUser] : []);
  const [groupVisibility, setGroupVisibility] = useState<GroupVisibility>('private');

  if (!currentUser) {
    // router.push('/login'); // Or show a message
    return <p>Please log in to create a group.</p>;
  }

  const handlePhotoChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0]) {
      const file = event.target.files[0];
      setGroupPhoto(file);
      setGroupPhotoPreview(URL.createObjectURL(file));
    }
  };

  const toggleMemberSelection = (user: User) => {
    if (user.id === currentUser.id) return; // Current user is always a member and owner
    setSelectedMembers(prev =>
      prev.find(member => member.id === user.id)
        ? prev.filter(member => member.id !== user.id)
        : [...prev, user]
    );
  };

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!groupName.trim()) {
      toast({ title: "Group name required", description: "Please enter a name for your group.", variant: "destructive" });
      return;
    }
    // In a real app, this would involve API calls to create the group and upload the photo
    console.log({
      name: groupName,
      description: groupDescription,
      photo: groupPhoto?.name || 'No photo',
      ownerId: currentUser.id,
      members: selectedMembers.map(m => m.id),
      visibility: groupVisibility,
    });
    toast({
      title: "Group Created!",
      description: `The group "${groupName}" has been successfully created as a ${groupVisibility} group.`,
    });
    // For demo, navigate to groups page. Ideally, navigate to the new group's page.
    router.push('/groups'); 
  };
  
  const getInitials = (name: string | undefined) => {
    if (!name) return 'U';
    const names = name.split(' ');
    if (names.length > 1) {
      return names[0][0] + names[names.length - 1][0];
    }
    return name.substring(0, 2);
  };

  return (
    <div className="max-w-2xl mx-auto">
      <Button variant="outline" size="sm" asChild className="mb-4">
        <Link href="/groups">
          <ArrowLeft className="mr-2 h-4 w-4" /> Back to Groups
        </Link>
      </Button>
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">Create New Group</CardTitle>
          <CardDescription>Set up a new group to share expenses.</CardDescription>
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
              />
            </div>
            <div>
              <Label htmlFor="groupDescription">Group Description (Optional)</Label>
              <Textarea
                id="groupDescription"
                value={groupDescription}
                onChange={(e) => setGroupDescription(e.target.value)}
                placeholder="A brief description of the group's purpose"
              />
            </div>
            <div>
              <Label htmlFor="groupPhoto">Group Photo (Optional)</Label>
              <div className="mt-1 flex items-center gap-4">
                {groupPhotoPreview ? (
                  <Image data-ai-hint="placeholder image" src={groupPhotoPreview} alt="Group photo preview" width={80} height={80} className="rounded-md object-cover h-20 w-20" />
                ) : (
                  <div className="h-20 w-20 bg-muted rounded-md flex items-center justify-center">
                    <ImageIcon className="h-10 w-10 text-muted-foreground" />
                  </div>
                )}
                <Button type="button" variant="outline" asChild>
                  <label htmlFor="group-photo-upload" className="cursor-pointer">
                    {groupPhotoPreview ? 'Change Photo' : 'Upload Photo'}
                  </label>
                </Button>
                <input id="group-photo-upload" type="file" className="hidden" accept="image/*" onChange={handlePhotoChange} />
              </div>
            </div>

            <div>
                <Label>Group Visibility</Label>
                <RadioGroup
                    defaultValue="private"
                    value={groupVisibility}
                    onValueChange={(value: GroupVisibility) => setGroupVisibility(value)}
                    className="mt-1 grid grid-cols-2 gap-4"
                >
                    <div>
                        <RadioGroupItem value="private" id="private" className="peer sr-only" />
                        <Label
                            htmlFor="private"
                            className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary cursor-pointer"
                        >
                            <Lock className="mb-2 h-6 w-6" />
                            Private
                            <span className="text-xs text-muted-foreground text-center mt-1">Only invited members can see and participate.</span>
                        </Label>
                    </div>
                    <div>
                        <RadioGroupItem value="public" id="public" className="peer sr-only" />
                        <Label
                            htmlFor="public"
                            className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary cursor-pointer"
                        >
                            <Unlock className="mb-2 h-6 w-6" />
                            Public
                            <span className="text-xs text-muted-foreground text-center mt-1">Anyone logged in can view the group. Only members can participate.</span>
                        </Label>
                    </div>
                </RadioGroup>
            </div>


            <div>
              <Label>Add Members</Label>
              <Card className="mt-1">
                <CardContent className="p-4 max-h-60 overflow-y-auto space-y-2">
                  {mockUsers.map(user => (
                    <div key={user.id} 
                         className={`flex items-center justify-between p-2 rounded-md ${user.id === currentUser.id ? 'bg-muted cursor-not-allowed' : 'hover:bg-accent cursor-pointer'}`}
                         onClick={() => toggleMemberSelection(user)}>
                      <div className="flex items-center gap-3">
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={user.avatarUrl} alt={user.name} />
                          <AvatarFallback>{getInitials(user.name)}</AvatarFallback>
                        </Avatar>
                        <span>{user.name} {user.id === currentUser.id && "(You - Admin)"}</span>
                      </div>
                      {selectedMembers.find(m => m.id === user.id) ? 
                        <Users className="h-5 w-5 text-primary" /> :
                        (user.id !== currentUser.id && <UserPlus className="h-5 w-5 text-muted-foreground" />)
                      }
                    </div>
                  ))}
                </CardContent>
              </Card>
              <p className="text-xs text-muted-foreground mt-1">Selected members: {selectedMembers.map(m => m.name).join(', ')}</p>
            </div>
          </CardContent>
          <CardFooter className="border-t px-6 py-4">
            <Button type="submit" className="ml-auto">
              <PlusCircle className="mr-2 h-4 w-4" /> Create Group
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
