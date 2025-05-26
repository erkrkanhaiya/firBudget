
"use client";

import { useState, FormEvent, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { ArrowLeft, PlusCircle, Image as ImageIcon, Users, UserPlus, Lock, Unlock, Contact, Loader2 } from 'lucide-react';
import { useUser } from '@/contexts/UserContext';
import { useToast } from "@/hooks/use-toast";
import type { User, GroupVisibility, Group, AppMemberContact } from '@/types';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import NextImage from 'next/image';
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { db } from '@/lib/firebase';
import { collection, addDoc, serverTimestamp, Timestamp, getDocs, query, where } from 'firebase/firestore';

// Helper to get initials
const getInitials = (name: string | null | undefined): string => {
  if (!name) return 'U';
  const names = name.split(' ');
  if (names.length > 1 && names[0] && names[names.length-1]) {
    return (names[0][0] + names[names.length - 1][0]).toUpperCase();
  }
  return name.substring(0, 2).toUpperCase();
};

export default function CreateGroupPage() {
  const router = useRouter();
  const { currentUser, isLoadingAuth } = useUser();
  const { toast } = useToast();

  const [groupName, setGroupName] = useState('');
  const [groupDescription, setGroupDescription] = useState('');
  const [groupPhoto, setGroupPhoto] = useState<File | null>(null);
  const [groupPhotoPreview, setGroupPhotoPreview] = useState<string | null>(null);
  const [selectedMembers, setSelectedMembers] = useState<User[]>([]);
  const [groupVisibility, setGroupVisibility] = useState<GroupVisibility>('private');
  const [isImportingContacts, setIsImportingContacts] = useState(false); // For device contacts
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [allPotentialMembers, setAllPotentialMembers] = useState<User[]>([]);
  const [isLoadingPotentialMembers, setIsLoadingPotentialMembers] = useState(true);


  useEffect(() => {
    if (currentUser && !selectedMembers.some(m => m.id === currentUser.id)) {
      setSelectedMembers([{ 
        id: currentUser.id, 
        name: currentUser.name, 
        email: currentUser.email, 
        avatarUrl: currentUser.avatarUrl 
      }]);
    }
  }, [currentUser]); // Removed selectedMembers from dependency array to prevent loop

  useEffect(() => {
    const fetchAppContacts = async () => {
      if (!currentUser) { // Only fetch if a user is logged in, otherwise they can't create groups anyway
        setIsLoadingPotentialMembers(false);
        return;
      }
      setIsLoadingPotentialMembers(true);
      try {
        const contactsSnapshot = await getDocs(collection(db, "appMemberContacts"));
        const contactsList = contactsSnapshot.docs
          .map(doc => {
            const data = doc.data() as AppMemberContact;
            return {
              id: doc.id, // Use the Firestore document ID as the contact's ID
              name: data.name,
              email: null, // AppMemberContact doesn't have email
              avatarUrl: undefined, // AppMemberContact doesn't have avatar
            } as User; // Cast to User for selection UI compatibility
          })
          .filter(contact => contact.id !== currentUser.id); // Exclude current user from potential list

        setAllPotentialMembers(contactsList);
      } catch (error) {
        console.error("Error fetching app member contacts:", error);
        toast({ title: "Error", description: "Could not load member contacts.", variant: "destructive" });
      } finally {
        setIsLoadingPotentialMembers(false);
      }
    };
    fetchAppContacts();
  }, [currentUser, toast]);


  if (isLoadingAuth || (isLoadingPotentialMembers && currentUser)) {
     return (
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-10rem)] text-center p-4">
        <Loader2 className="w-16 h-16 text-primary animate-spin mb-4" />
        <p className="text-lg text-muted-foreground">
            {isLoadingAuth ? "Loading user data..." : "Loading member contacts..."}
        </p>
      </div>
    )
  }

  if (!currentUser) {
    router.push('/login');
    return (
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-10rem)] text-center p-4">
        <p className="text-lg text-muted-foreground">Redirecting to login...</p>
      </div>
    );
  }

  const handlePhotoChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0]) {
      const file = event.target.files[0];
      setGroupPhoto(file);
      setGroupPhotoPreview(URL.createObjectURL(file));
    }
  };

  const toggleMemberSelection = (userToToggle: User) => {
    if (userToToggle.id === currentUser.id) return; // Admin (current user) cannot be deselected
    
    setSelectedMembers(prev =>
      prev.find(member => member.id === userToToggle.id)
        ? prev.filter(member => member.id !== userToToggle.id)
        : [...prev, userToToggle]
    );
  };

  const handleImportDeviceContacts = async () => {
    if (!('contacts' in navigator && 'select' in (navigator as any).contacts)) {
      toast({
        title: "Contact Picker API not supported",
        description: "Your browser doesn't support importing contacts directly.",
        variant: "destructive",
      });
      return;
    }

    setIsImportingContacts(true);
    try {
      const deviceContacts = await (navigator as any).contacts.select(['name', 'email', 'tel', 'icon'], { multiple: true });
      if (deviceContacts.length > 0) {
        const newMembersFromDevice: User[] = deviceContacts.map((contact: any, index: number) => ({
          id: contact.email?.[0] || `imported-${Date.now()}-${index}`, 
          name: contact.name?.[0] || 'Unknown Contact',
          email: contact.email?.[0] || null,
          avatarUrl: contact.icon?.[0] ? URL.createObjectURL(contact.icon[0]) : undefined,
        }));

        setSelectedMembers(prevSelected => {
          const updatedMembers = [...prevSelected];
          newMembersFromDevice.forEach(newMember => {
            if (newMember.id !== currentUser.id && !updatedMembers.some(m => m.id === newMember.id || (m.email && newMember.email && m.email === newMember.email))) {
              updatedMembers.push(newMember);
            }
          });
          return updatedMembers;
        });

        toast({
          title: "Contacts Processed",
          description: `${newMembersFromDevice.length} contact(s) from device processed. Review selected members.`,
        });
      } else {
        toast({ title: "No Contacts Selected from Device" });
      }
    } catch (error) {
      console.error("Error importing device contacts:", error);
      toast({
        title: "Error Importing Device Contacts",
        description: (error as Error).message || "Could not import contacts.",
        variant: "destructive",
      });
    } finally {
      setIsImportingContacts(false);
    }
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!groupName.trim()) {
      toast({ title: "Group name required", variant: "destructive" });
      return;
    }
    if (!currentUser) {
      toast({ title: "User not authenticated", variant: "destructive" });
      return;
    }
    if (selectedMembers.length === 0) { // Should always have at least current user
      toast({ title: "Add Members", description: "A group must have at least one member (you).", variant: "destructive" });
      return;
    }

    setIsSubmitting(true);

    let photoURLToSave = '';
    if (groupPhoto && groupPhotoPreview) {
      // Placeholder: Real implementation would upload to Firebase Storage
      photoURLToSave = groupPhotoPreview;
    }

    const memberIds = selectedMembers.map(m => m.id);
    const uniqueMemberIds = Array.from(new Set(memberIds));

    const groupDataToSave: Omit<Group, 'id' | 'createdAt'> & { createdAt: Timestamp } = {
      name: groupName.trim(),
      description: groupDescription.trim(),
      photoUrl: photoURLToSave,
      dataAiHint: '', 
      ownerId: currentUser.id,
      members: selectedMembers.map(m => ({ 
        id: m.id, 
        name: m.name, 
        email: m.email, 
        avatarUrl: m.avatarUrl || '' 
      })),
      memberIds: uniqueMemberIds,
      visibility: groupVisibility,
      createdAt: serverTimestamp() as Timestamp,
    };

    try {
      await addDoc(collection(db, "groups"), groupDataToSave);
      toast({
        title: "Group Created!",
        description: `The group "${groupName}" has been successfully created in Firestore.`,
      });
      router.push('/groups'); 
    } catch (error) {
      console.error("Error creating group:", error);
      toast({
        title: "Error Creating Group",
        description: (error instanceof Error ? error.message : "Could not save group to database."),
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
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
          <CardDescription>Set up a new group to share expenses. Members can be chosen from your app contacts.</CardDescription>
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
                <Label>Add Members (from App Contacts)</Label>
                <Button type="button" variant="outline" size="sm" onClick={handleImportDeviceContacts} disabled={isImportingContacts || isSubmitting}>
                  <Contact className="mr-2 h-4 w-4" />
                  {isImportingContacts ? "Importing..." : "Import from Device Contacts"}
                </Button>
              </div>
              <Card className="mt-1">
                <CardContent className="p-4 max-h-60 overflow-y-auto space-y-2">
                  {currentUser && (
                     <div key={currentUser.id} className="flex items-center justify-between p-2 rounded-md bg-muted cursor-not-allowed">
                        <div className="flex items-center gap-3">
                            <Avatar className="h-8 w-8">
                            <AvatarImage src={currentUser.avatarUrl || undefined} alt={currentUser.name || ''} />
                            <AvatarFallback>{getInitials(currentUser.name)}</AvatarFallback>
                            </Avatar>
                            <span>{currentUser.name} (You - Admin)</span>
                        </div>
                        <Users className="h-5 w-5 text-primary" />
                    </div>
                  )}
                  {isLoadingPotentialMembers ? (
                     <div className="flex items-center justify-center p-4"> <Loader2 className="h-6 w-6 animate-spin text-primary"/> <span className="ml-2 text-muted-foreground">Loading contacts...</span></div>
                  ) : allPotentialMembers.length === 0 && selectedMembers.length <=1 ? ( // only current user selected
                    <p className="text-sm text-muted-foreground text-center py-3">No other app contacts found. You can add them in the 'Members' section.</p>
                  ): (
                    allPotentialMembers.map(user => (
                        <div key={user.id} 
                            className={`flex items-center justify-between p-2 rounded-md ${isSubmitting ? 'cursor-not-allowed opacity-70' : 'hover:bg-accent cursor-pointer'}`}
                            onClick={() => !isSubmitting && toggleMemberSelection(user)}>
                        <div className="flex items-center gap-3">
                            <Avatar className="h-8 w-8">
                            <AvatarImage src={user.avatarUrl || undefined} alt={user.name || ''} />
                            <AvatarFallback>{getInitials(user.name)}</AvatarFallback>
                            </Avatar>
                            <span>{user.name}</span>
                        </div>
                        {selectedMembers.find(m => m.id === user.id) ? 
                            <Users className="h-5 w-5 text-primary" /> :
                            <UserPlus className="h-5 w-5 text-muted-foreground" />
                        }
                        </div>
                    ))
                  )}
                   {selectedMembers.filter(sm => sm.id !== currentUser?.id && !allPotentialMembers.some(pm => pm.id === sm.id)).map(user => (
                     <div key={user.id} 
                          className={`flex items-center justify-between p-2 rounded-md bg-accent/50 ${isSubmitting ? 'cursor-not-allowed opacity-70' : 'cursor-pointer'}`}
                          onClick={() => !isSubmitting && toggleMemberSelection(user)}>
                       <div className="flex items-center gap-3">
                         <Avatar className="h-8 w-8">
                           <AvatarImage src={user.avatarUrl || undefined} alt={user.name || ''} />
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
              <p className="text-xs text-muted-foreground mt-1">
                Selected members: {selectedMembers.map(m => m.name).join(', ') || 'None (besides you)'}
              </p>
            </div>
          </CardContent>
          <CardFooter className="border-t px-6 py-4">
            <Button type="submit" className="ml-auto" disabled={isImportingContacts || isSubmitting}>
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


    