
"use client";

import { useState, FormEvent } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { ArrowLeft, PlusCircle, Image as ImageIcon, Users, UserPlus, Lock, Unlock, Contact, Loader2 } from 'lucide-react';
import { useUser } from '@/contexts/UserContext';
import { mockUsers } from '@/data/mock'; 
import { useToast } from "@/hooks/use-toast";
import type { User, GroupVisibility, Group } from '@/types';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import NextImage from 'next/image'; // Renamed to avoid conflict with ImageIcon
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { db } from '@/lib/firebase'; // Firebase setup
import { collection, addDoc, serverTimestamp, Timestamp } from 'firebase/firestore';

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
  const [isImporting, setIsImporting] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!currentUser) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-10rem)] text-center p-4">
        <Loader2 className="w-16 h-16 text-primary animate-spin mb-4" />
        <p className="text-lg text-muted-foreground">Loading user data or redirecting to login...</p>
      </div>
    )
  }

  const handlePhotoChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0]) {
      const file = event.target.files[0];
      setGroupPhoto(file);
      setGroupPhotoPreview(URL.createObjectURL(file));
    }
  };

  const toggleMemberSelection = (user: User) => {
    if (user.id === currentUser.id) return; 
    setSelectedMembers(prev =>
      prev.find(member => member.id === user.id)
        ? prev.filter(member => member.id !== user.id)
        : [...prev, user]
    );
  };

  const handleImportContacts = async () => {
    if (!('contacts' in navigator && 'select' in (navigator as any).contacts)) {
      toast({
        title: "Contact Picker API not supported",
        description: "Your browser doesn't support importing contacts directly.",
        variant: "destructive",
      });
      return;
    }

    setIsImporting(true);
    try {
      const contacts = await (navigator as any).contacts.select(['name', 'email'], { multiple: true });
      if (contacts.length > 0) {
        const newMembers: User[] = contacts.map((contact: any) => ({
          id: contact.email?.[0] || `contact-${Date.now()}-${Math.random().toString(16).slice(2)}`,
          name: contact.name?.[0] || 'Unknown Contact',
          email: contact.email?.[0] || '',
          avatarUrl: undefined, 
        }));

        setSelectedMembers(prevSelected => {
          const updatedMembers = [...prevSelected];
          newMembers.forEach(newMember => {
            if (newMember.id !== currentUser.id && !updatedMembers.some(m => m.id === newMember.id)) {
              updatedMembers.push(newMember);
            }
          });
          return updatedMembers;
        });

        toast({
          title: "Contacts Imported",
          description: `${newMembers.length} contact(s) processed. Please review selected members.`,
        });
      } else {
        toast({
          title: "No Contacts Selected",
          variant: "default",
        });
      }
    } catch (error) {
      console.error("Error importing contacts:", error);
      toast({
        title: "Error Importing Contacts",
        description: (error as Error).message || "Could not import contacts.",
        variant: "destructive",
      });
    } finally {
      setIsImporting(false);
    }
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!groupName.trim()) {
      toast({ title: "Group name required", description: "Please enter a name for your group.", variant: "destructive" });
      return;
    }
    if (!currentUser) {
      toast({ title: "Error", description: "User not found. Please log in again.", variant: "destructive" });
      return;
    }

    setIsSubmitting(true);

    // In a real app, you'd upload groupPhoto to Firebase Storage and get the URL
    const photoURL = groupPhotoPreview; // For now, use preview or a placeholder logic

    const groupDataToSave = {
      name: groupName,
      description: groupDescription,
      photoUrl: photoURL || '', // Store actual URL from Firebase Storage in real app
      dataAiHint: '', // Can be added later
      ownerId: currentUser.id,
      // Store member IDs for querying, or full User objects if small and denormalization is acceptable.
      // For simplicity here, storing User-like objects with id, name, email.
      // In a robust system, typically store member IDs and fetch details as needed, or denormalize carefully.
      members: selectedMembers.map(m => ({ id: m.id, name: m.name, email: m.email, avatarUrl: m.avatarUrl || '' })),
      visibility: groupVisibility,
      createdAt: serverTimestamp(), // Firestore server-side timestamp
    };

    try {
      await addDoc(collection(db, "groups"), groupDataToSave);
      toast({
        title: "Group Created!",
        description: `The group "${groupName}" has been successfully created.`,
      });
      router.push('/groups'); 
    } catch (error) {
      console.error("Error creating group:", error);
      toast({
        title: "Error Creating Group",
        description: (error as Error).message || "Could not save group to database.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };
  
  const getInitials = (name: string | undefined) => {
    if (!name) return 'U';
    const names = name.split(' ');
    if (names.length > 1) {
      return names[0][0] + names[names.length - 1][0];
    }
    return name.substring(0, 2).toUpperCase();
  };

  const allPotentialMembers = [...mockUsers];
  if (currentUser && !mockUsers.find(u => u.id === currentUser.id)) {
    allPotentialMembers.unshift(currentUser); 
  }

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
                  <NextImage data-ai-hint="group photo" src={groupPhotoPreview} alt="Group photo preview" width={80} height={80} className="rounded-md object-cover h-20 w-20" />
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
                  <RadioGroupItem value="private" id="private" className="peer sr-only" />
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
                  <RadioGroupItem value="public" id="public" className="peer sr-only" />
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

            <div>
              <div className="flex justify-between items-center mb-1">
                <Label>Add Members</Label>
                <Button type="button" variant="outline" size="sm" onClick={handleImportContacts} disabled={isImporting || isSubmitting}>
                  <Contact className="mr-2 h-4 w-4" />
                  {isImporting ? "Importing..." : "Import from Contacts"}
                </Button>
              </div>
              <Card className="mt-1">
                <CardContent className="p-4 max-h-60 overflow-y-auto space-y-2">
                  {allPotentialMembers.map(user => (
                    <div key={user.id} 
                         className={`flex items-center justify-between p-2 rounded-md ${user.id === currentUser.id ? 'bg-muted cursor-not-allowed' : (isSubmitting ? 'cursor-not-allowed opacity-70' : 'hover:bg-accent cursor-pointer')}`}
                         onClick={() => !isSubmitting && toggleMemberSelection(user)}>
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
                  {selectedMembers.filter(sm => !allPotentialMembers.some(pm => pm.id === sm.id) && sm.id !== currentUser.id).map(user => (
                     <div key={user.id} 
                          className={`flex items-center justify-between p-2 rounded-md bg-accent/50 ${isSubmitting ? 'cursor-not-allowed opacity-70' : 'cursor-pointer'}`}
                          onClick={() => !isSubmitting && toggleMemberSelection(user)}>
                       <div className="flex items-center gap-3">
                         <Avatar className="h-8 w-8">
                           <AvatarImage src={user.avatarUrl} alt={user.name} />
                           <AvatarFallback>{getInitials(user.name)}</AvatarFallback>
                         </Avatar>
                         <div className="flex flex-col">
                            <span>{user.name}</span>
                            {user.email && <span className="text-xs text-muted-foreground">{user.email}</span>}
                         </div>
                       </div>
                       <Users className="h-5 w-5 text-primary" />
                     </div>
                  ))}
                </CardContent>
              </Card>
              <p className="text-xs text-muted-foreground mt-1">Selected members: {selectedMembers.map(m => m.name).join(', ') || 'None (besides you)'}</p>
            </div>
          </CardContent>
          <CardFooter className="border-t px-6 py-4">
            <Button type="submit" className="ml-auto" disabled={isImporting || isSubmitting}>
              {isSubmitting ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <PlusCircle className="mr-2 h-4 w-4" />
              )}
              {isSubmitting ? "Creating..." : "Create Group"}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
