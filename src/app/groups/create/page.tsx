
"use client";

import { useState, FormEvent, useEffect, ChangeEvent } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { ArrowLeft, PlusCircle, Image as ImageIcon, Users, UserPlus, Lock, Unlock, Contact, Loader2, Send, Briefcase, Home, Heart, PartyPopper, Shapes, DollarSign } from 'lucide-react';
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useUser } from '@/contexts/UserContext';
import { useToast } from "@/hooks/use-toast";
import type { User, GroupVisibility, Group, AppMemberContact, GroupCategory } from '@/types';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import NextImage from 'next/image';
import { isValidEmail, memberNeedsAppInvite, normalizeEmail } from '@/lib/group-access';
import { db } from '@/lib/firebase';
import { collection, addDoc, serverTimestamp, Timestamp, getDocs, query, where, orderBy } from 'firebase/firestore'; 
import { useNotification } from '@/contexts/NotificationContext';
import React from 'react';
import { useCurrency } from '@/contexts/CurrencyContext';

// Helper to get initials
const getInitials = (name: string | null | undefined): string => {
  if (!name) return 'U';
  const names = name.split(' ');
  if (names.length > 1 && names[0] && names[names.length-1]) {
    return (names[0][0] + names[names.length - 1][0]).toUpperCase();
  }
  if (name.length > 0) return name.substring(0, 2).toUpperCase();
  return 'U';
};

const groupCategoryIcons: Record<GroupCategory, React.ElementType> = {
  TRIP: Briefcase,
  HOME: Home,
  COUPLE: Heart,
  PARTY: PartyPopper,
  OTHER: Shapes,
};

export default function CreateGroupPage() {
  const router = useRouter();
  const { currentUser, isLoadingAuth } = useUser();
  const { toast } = useToast();
  const { addNotification } = useNotification();
  const { getCurrencySymbol } = useCurrency();

  const [groupName, setGroupName] = useState('');
  const [groupDescription, setGroupDescription] = useState('');
  const [groupBudget, setGroupBudget] = useState(''); // New state for budget
  const [groupPhoto, setGroupPhoto] = useState<File | null>(null);
  const [groupPhotoPreview, setGroupPhotoPreview] = useState<string | null>(null);
  const [selectedMembers, setSelectedMembers] = useState<User[]>([]);
  const [groupVisibility, setGroupVisibility] = useState<GroupVisibility>('private');
  const [groupCategory, setGroupCategory] = useState<GroupCategory>('OTHER');
  const [isImportingContacts, setIsImportingContacts] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [allPotentialMembers, setAllPotentialMembers] = useState<User[]>([]);
  const [isLoadingPotentialMembers, setIsLoadingPotentialMembers] = useState(true);

  const [newQuickMemberName, setNewQuickMemberName] = useState('');
  const [newQuickMemberEmail, setNewQuickMemberEmail] = useState('');
  const [isAddingQuickMember, setIsAddingQuickMember] = useState(false);


  useEffect(() => {
    if (currentUser && !selectedMembers.some(m => m.id === currentUser.id)) {
      setSelectedMembers([{ 
        id: currentUser.id, 
        name: currentUser.name, 
        email: currentUser.email, 
        avatarUrl: currentUser.avatarUrl 
      }]);
    }
  }, [currentUser, selectedMembers]);

  useEffect(() => {
    const fetchAppContacts = async () => {
      if (!currentUser) { 
        setIsLoadingPotentialMembers(false);
        return;
      }
      setIsLoadingPotentialMembers(true);
      try {
        const contactsCollectionRef = collection(db, "appMemberContacts");
        const q = query(
          contactsCollectionRef, 
          where("addedByUid", "==", currentUser.id), 
          orderBy("name", "asc") 
        ); 
        const contactsSnapshot = await getDocs(q);

        const contactsList = contactsSnapshot.docs
          .map(doc => {
            const data = doc.data() as AppMemberContact;
            return {
              id: doc.id, 
              name: data.name,
              email: data.email ?? null,
              avatarUrl: undefined, 
            } as User; 
          })
          .filter(contact => contact.id !== currentUser.id); 

        setAllPotentialMembers(contactsList);
      } catch (error) {
        console.error("Error fetching app member contacts:", error);
        toast({ title: "Error", description: "Could not load your contacts. Ensure Firestore indexes are set if prompted.", variant: "destructive" });
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
            {isLoadingAuth ? "Loading user data..." : "Loading your contacts..."}
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

  const handlePhotoChange = (event: ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0]) {
      const file = event.target.files[0];
      setGroupPhoto(file);
      setGroupPhotoPreview(URL.createObjectURL(file));
    }
  };

  const toggleMemberSelection = (userToToggle: User) => {
    if (userToToggle.id === currentUser.id) return; 
    
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
          id: contact.email?.[0] || `imported-device-${Date.now()}-${index}`, 
          name: contact.name?.[0] || 'Unknown Contact',
          email: contact.email?.[0] || null,
          avatarUrl: contact.icon?.[0] ? URL.createObjectURL(contact.icon[0]) : undefined,
        }));

        setSelectedMembers(prevSelected => {
          const updatedMembers = [...prevSelected];
          newMembersFromDevice.forEach(newMember => {
            if (newMember.id !== currentUser.id && 
                !updatedMembers.some(m => m.id === newMember.id || (m.email && newMember.email && m.email === newMember.email))) {
              updatedMembers.push(newMember);
            }
          });
          return updatedMembers;
        });

        toast({
          title: "Contacts Processed",
          description: `${newMembersFromDevice.length} contact(s) from device processed. Review selected members. These are not saved to app contacts yet.`,
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

  const handleQuickAddMember = async () => {
    if (!newQuickMemberName.trim() || !currentUser) {
      toast({ title: "Name required", description: "Please enter a name for the new member.", variant: "destructive" });
      return;
    }
    const trimmedEmail = newQuickMemberEmail.trim();
    if (trimmedEmail && !isValidEmail(normalizeEmail(trimmedEmail))) {
      toast({ title: "Invalid email", description: "Enter a valid email or leave it blank.", variant: "destructive" });
      return;
    }

    setIsAddingQuickMember(true);
    const memberName = newQuickMemberName.trim();
    const memberEmail = trimmedEmail ? normalizeEmail(trimmedEmail) : null;
    try {
      const docRef = await addDoc(collection(db, 'appMemberContacts'), {
        name: memberName,
        ...(memberEmail ? { email: memberEmail } : {}),
        addedByUid: currentUser.id,
        createdAt: serverTimestamp(),
      });

      const newContact: User = {
        id: docRef.id, 
        name: memberName,
        email: memberEmail,
        avatarUrl: undefined,
      };

      setAllPotentialMembers(prev => [newContact, ...prev].sort((a,b) => (a.name || "").localeCompare(b.name || ""))); 
      setSelectedMembers(prev => {
        if (!prev.some(m => m.id === newContact.id)) {
          return [...prev, newContact];
        }
        return prev;
      });

      toast({
        title: "Member added & selected",
        description: memberEmail
          ? `"${memberName}" will be invited when you create the group.`
          : `"${memberName}" added for expense splits only.`,
      });
      addNotification({
        title: "New Member Added",
        message: `You added "${memberName}" to your contacts.`,
        type: "success",
      });
      setNewQuickMemberName('');
      setNewQuickMemberEmail('');
    } catch (error) {
      console.error("Error quick adding member:", error);
      toast({ title: "Error", description: "Could not add member to your contacts.", variant: "destructive" });
      addNotification({
        title: "Contact Add Failed",
        message: `Could not add contact: "${memberName}"`,
        type: "destructive",
      });
    } finally {
      setIsAddingQuickMember(false);
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
    if (selectedMembers.length === 0) { 
      toast({ title: "Add Members", description: "A group must have at least one member (you).", variant: "destructive" });
      return;
    }

    setIsSubmitting(true);

    let photoURLToSave = '';
    let dataAiHintToSave = '';
    if (groupPhoto && groupPhotoPreview && groupPhotoPreview.startsWith('blob:')) {
      console.warn("Group photo is a blob URL. In production, upload to Firebase Storage.");
      photoURLToSave = ''; 
    } else if (groupPhotoPreview && groupPhotoPreview.includes('placehold.co')) {
      photoURLToSave = groupPhotoPreview;
      dataAiHintToSave = 'group image'; 
    } else if (groupPhotoPreview) {
       photoURLToSave = groupPhotoPreview;
    }

    const numericBudget = groupBudget.trim() ? parseFloat(groupBudget) : undefined;
    if (groupBudget.trim() && (isNaN(numericBudget as number) || (numericBudget as number) < 0)) {
        toast({ title: "Invalid Budget", description: "Budget must be a non-negative number.", variant: "destructive"});
        setIsSubmitting(false);
        return;
    }

    const memberIds = selectedMembers.map(m => m.id);
    const uniqueMemberIds = Array.from(new Set(memberIds));

    const invitedEmails = Array.from(
      new Set(
        selectedMembers
          .filter((member) => memberNeedsAppInvite({ ownerId: currentUser.id }, member))
          .map((member) => normalizeEmail(member.email!))
      )
    );

    const groupDataToSave: Omit<Group, 'id' | 'createdAt'> & { createdAt: Timestamp } = {
      name: groupName.trim(),
      description: groupDescription.trim(),
      photoUrl: photoURLToSave,
      dataAiHint: dataAiHintToSave,
      ownerId: currentUser.id,
      members: selectedMembers.map(m => ({ 
        id: m.id, 
        name: m.name, 
        email: m.email?.trim() ? normalizeEmail(m.email) : null, 
        avatarUrl: m.avatarUrl || '' 
      })),
      memberIds: uniqueMemberIds,
      visibility: groupVisibility,
      category: groupCategory,
      invitedEmails,
      createdAt: serverTimestamp() as Timestamp,
      ...(numericBudget !== undefined && { budgetAmount: numericBudget }),
    };

    try {
      const docRef = await addDoc(collection(db, "groups"), groupDataToSave);
      toast({
        title: "Group Created!",
        description: `The group "${groupName}" has been successfully created in Firestore.`,
      });
      addNotification({
        title: "New Group Created",
        message: `You created the group: "${groupName.trim()}"`,
        type: "success",
        href: `/groups/${docRef.id}`,
      });
      router.push('/groups'); 
    } catch (error) {
      console.error("Error creating group:", error);
      toast({
        title: "Error Creating Group",
        description: (error instanceof Error ? error.message : "Could not save group to database."),
        variant: "destructive",
      });
      addNotification({
        title: "Group Creation Failed",
        message: `Could not create group: "${groupName.trim()}"`,
        type: "destructive",
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
          <CardDescription>Set up a new group to share expenses. Members can be chosen from your contacts.</CardDescription>
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
              <Label htmlFor="groupBudget">Group Budget (Optional)</Label>
              <div className="relative">
                <span className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground">{getCurrencySymbol()}</span>
                <Input
                  id="groupBudget"
                  type="number"
                  value={groupBudget}
                  onChange={(e) => setGroupBudget(e.target.value)}
                  placeholder="0.00"
                  className="pl-8"
                  step="0.01"
                  min="0"
                  disabled={isSubmitting}
                />
              </div>
            </div>
            <div>
              <Label>Group Category*</Label>
              <RadioGroup
                value={groupCategory}
                onValueChange={(value) => setGroupCategory(value as GroupCategory)}
                className="mt-2 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3"
                disabled={isSubmitting}
              >
                {(Object.keys(groupCategoryIcons) as GroupCategory[]).map((cat) => {
                  const IconComponent = groupCategoryIcons[cat];
                  return (
                    <div key={cat}>
                      <RadioGroupItem value={cat} id={`category-${cat}`} className="peer sr-only" disabled={isSubmitting} />
                      <Label
                        htmlFor={`category-${cat}`}
                        className={`flex flex-col items-center justify-center rounded-md border-2 border-muted bg-popover p-3 h-full hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary ${isSubmitting ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'}`}
                      >
                        <IconComponent className="mb-1.5 h-5 w-5" />
                        <span className="text-xs text-center">{cat.charAt(0) + cat.slice(1).toLowerCase()}</span>
                      </Label>
                    </div>
                  );
                })}
              </RadioGroup>
            </div>
            <div>
              <Label htmlFor="groupPhoto">Group Photo (Optional)</Label>
              <div className="mt-1 flex items-center gap-4">
                {groupPhotoPreview ? (
                  <NextImage 
                    src={groupPhotoPreview} 
                    alt="Group photo preview" 
                    width={80} 
                    height={80} 
                    className="rounded-md object-cover h-20 w-20"
                    {...(groupPhoto || (groupPhotoPreview && groupPhotoPreview.startsWith('blob:')) ? {} : { 'data-ai-hint': 'group image' })}

                  />
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
               <p className="text-xs text-muted-foreground mt-1">Note: Photo upload to server requires Firebase Storage integration (not fully implemented in this demo).</p>
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
                    className={`flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 h-full hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary ${isSubmitting ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'}`}
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
                    className={`flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 h-full hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary ${isSubmitting ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'}`}
                  >
                    <Unlock className="mb-2 h-6 w-6" />
                    Public
                    <span className="text-xs text-muted-foreground text-center mt-1">Anyone logged in can view. Only members can participate.</span>
                  </Label>
                </div>
              </RadioGroup>
            </div>

            <div>
              <div className="flex justify-between items-center mb-2">
                <Label>Add Members to Group</Label>
                <Button type="button" variant="outline" size="sm" onClick={handleImportDeviceContacts} disabled={isImportingContacts || isSubmitting}>
                  <Contact className="mr-2 h-4 w-4" />
                  {isImportingContacts ? "Importing..." : "Import from Device Contacts"}
                </Button>
              </div>
              
              <Card className="mb-4 border-dashed">
                <CardContent className="p-3 space-y-2">
                  <Label htmlFor="quickMemberName" className="text-sm font-medium">Add new person</Label>
                  <Input
                    id="quickMemberName"
                    value={newQuickMemberName}
                    onChange={(e) => setNewQuickMemberName(e.target.value)}
                    placeholder="Name (e.g. Rahul)"
                    disabled={isAddingQuickMember || isSubmitting}
                    className="h-9"
                  />
                  <Input
                    id="quickMemberEmail"
                    type="email"
                    value={newQuickMemberEmail}
                    onChange={(e) => setNewQuickMemberEmail(e.target.value)}
                    placeholder="Email (optional — for app access)"
                    disabled={isAddingQuickMember || isSubmitting}
                    className="h-9"
                  />
                  <Button 
                    type="button" 
                    size="sm"
                    onClick={handleQuickAddMember} 
                    disabled={isAddingQuickMember || isSubmitting || !newQuickMemberName.trim()}
                  >
                    {isAddingQuickMember ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                    <span className="ml-1.5">{isAddingQuickMember ? "Adding..." : "Add & Select"}</span>
                  </Button>
                   <p className="text-xs text-muted-foreground">Name only = splits. Name + email = splits and app invite when they sign in.</p>
                </CardContent>
              </Card>
              
              <Card className="mt-1">
                <CardHeader className="p-3 border-b">
                  <CardTitle className="text-base">Select from Your Contacts</CardTitle>
                </CardHeader>
                <CardContent className="p-2 max-h-60 overflow-y-auto space-y-1">
                  {currentUser && (
                     <div key={currentUser.id} className="flex items-center justify-between p-2 rounded-md bg-muted/50 cursor-not-allowed">
                        <div className="flex items-center gap-3">
                            <Avatar className="h-8 w-8">
                            <AvatarImage src={currentUser.avatarUrl || undefined} alt={currentUser.name || ''} />
                            <AvatarFallback>{getInitials(currentUser.name)}</AvatarFallback>
                            </Avatar>
                            <span className="text-sm">{currentUser.name} (You - Admin)</span>
                        </div>
                        <Users className="h-5 w-5 text-primary" />
                    </div>
                  )}
                  {isLoadingPotentialMembers ? (
                     <div className="flex items-center justify-center p-4"> <Loader2 className="h-6 w-6 animate-spin text-primary"/> <span className="ml-2 text-muted-foreground">Loading your contacts...</span></div>
                  ) : allPotentialMembers.length === 0 && selectedMembers.filter(sm => sm.id !== currentUser?.id).length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-3">No other contacts found. Use "Quick Add" or "Import".</p>
                  ): (
                    allPotentialMembers.map(user => (
                        <div key={user.id} 
                            className={`flex items-center justify-between p-2 rounded-md text-sm ${isSubmitting ? 'cursor-not-allowed opacity-70' : 'hover:bg-accent cursor-pointer'} ${selectedMembers.find(m => m.id === user.id) ? 'bg-accent/70' : ''}`}
                            onClick={() => !isSubmitting && toggleMemberSelection(user)}>
                        <div className="flex items-center gap-3">
                            <Avatar className="h-8 w-8">
                            <AvatarFallback>{getInitials(user.name)}</AvatarFallback>
                            </Avatar>
                            <div className="flex flex-col min-w-0">
                            <span className="truncate">{user.name}</span>
                            {user.email ? (
                              <span className="text-xs text-muted-foreground truncate">{user.email}</span>
                            ) : (
                              <span className="text-xs text-muted-foreground">Splits only</span>
                            )}
                            </div>
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
                          className={`flex items-center justify-between p-2 rounded-md text-sm bg-accent/70 ${isSubmitting ? 'cursor-not-allowed opacity-70' : 'cursor-pointer'}`}
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
              <p className="text-xs text-muted-foreground mt-2">
                Selected for group: {selectedMembers.length > 0 ? selectedMembers.map(m => m.name || `User ${m.id.substring(0,4)}`).join(', ') : 'None'}
              </p>
            </div>
          </CardContent>
          <CardFooter className="border-t px-6 py-4">
            <Button type="submit" className="ml-auto" disabled={isAddingQuickMember || isImportingContacts || isSubmitting}>
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
