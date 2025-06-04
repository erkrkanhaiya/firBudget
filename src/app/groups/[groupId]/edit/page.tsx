
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowLeft, Save, Image as ImageIcon, Lock, Unlock, AlertTriangle, Loader2, Briefcase, Home as HomeIconLucide, Heart, PartyPopper, Shapes, DollarSign } from 'lucide-react'; // Renamed Home to HomeIconLucide
import { useUser } from '@/contexts/UserContext';
import type { Group, GroupVisibility, GroupCategory } from '@/types';
import { useToast } from "@/hooks/use-toast";
import NextImage from 'next/image'; 
import { db, auth, storage } from '@/lib/firebase'; 
import { doc, getDoc, updateDoc, Timestamp, deleteField } from 'firebase/firestore';
import { ref as storageRef, uploadBytesResumable, getDownloadURL } from "firebase/storage";
import { useNotification } from '@/contexts/NotificationContext';
import { useCurrency } from '@/contexts/CurrencyContext';

const groupCategoryIcons: Record<GroupCategory, React.ElementType> = {
  TRIP: Briefcase,
  HOME: HomeIconLucide, 
  COUPLE: Heart,
  PARTY: PartyPopper,
  OTHER: Shapes,
};


export default function EditGroupPage() {
  const params = useParams();
  const router = useRouter();
  const { currentUser } = useUser();
  const { toast } = useToast();
  const { addNotification } = useNotification();
  const { getCurrencySymbol } = useCurrency();
  const groupId = params.groupId as string;

  const [group, setGroup] = useState<Group | null>(null);
  const [groupName, setGroupName] = useState('');
  const [groupDescription, setGroupDescription] = useState('');
  const [groupBudget, setGroupBudget] = useState('');
  const [groupPhotoFile, setGroupPhotoFile] = useState<File | null>(null);
  const [groupPhotoPreview, setGroupPhotoPreview] = useState<string | null>(null);
  const [groupVisibility, setGroupVisibility] = useState<GroupVisibility>('private');
  const [groupCategory, setGroupCategory] = useState<GroupCategory>('OTHER');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [accessDenied, setAccessDenied] = useState(false);
  const [accessDeniedReason, setAccessDeniedReason] = useState<"not_found" | "not_owner" | "generic_error">("generic_error");


  useEffect(() => {
    const fetchGroup = async () => {
      if (!currentUser || !groupId) {
        setIsLoading(false);
        if (!currentUser) {
            setTimeout(() => {
                if (!auth.currentUser) router.push('/login');
            }, 500);
        }
        return;
      }
      setIsLoading(true);
      setAccessDenied(false); 

      try {
        const groupDocRef = doc(db, 'groups', groupId);
        const groupDocSnap = await getDoc(groupDocRef);

        if (!auth.currentUser) { 
            toast({ title: "Authentication Error", description: "User session might have expired. Please log in again.", variant: "destructive" });
            router.push('/login');
            setAccessDenied(true);
            setAccessDeniedReason("generic_error");
            setIsLoading(false);
            return;
        }
        
        if (groupDocSnap.exists()) {
          const data = groupDocSnap.data();
           if (!data) {
            toast({ title: "Group Data Error", description: "Could not retrieve group data.", variant: "destructive" });
            setAccessDenied(true);
            setAccessDeniedReason("not_found");
            setIsLoading(false);
            return;
          }
          const groupData = data as Omit<Group, 'id' | 'createdAt'> & {createdAt?: Timestamp | {seconds: number, nanoseconds: number} };

          const fetchedGroup: Group = {
            id: groupDocSnap.id,
            name: groupData.name || '', 
            description: groupData.description || '',
            photoUrl: groupData.photoUrl || '',
            dataAiHint: groupData.dataAiHint || '',
            ownerId: groupData.ownerId || '', 
            members: groupData.members || [],
            memberIds: groupData.memberIds || [],
            visibility: groupData.visibility || 'private',
            category: groupData.category || 'OTHER',
            budgetAmount: groupData.budgetAmount,
            createdAt: (groupData.createdAt && typeof (groupData.createdAt as Timestamp).toDate === 'function')
              ? (groupData.createdAt as Timestamp).toDate().toISOString()
              : (groupData.createdAt && (groupData.createdAt as {seconds: number}).seconds) 
              ? new Date((groupData.createdAt as {seconds: number}).seconds * 1000).toISOString()
              : new Date().toISOString(), 
          };
          
          if (fetchedGroup.ownerId !== currentUser.id) { 
            toast({ title: "Access Denied", description: "You are not the owner of this group.", variant: "destructive" });
            setAccessDenied(true);
            setAccessDeniedReason("not_owner");
            setGroup(fetchedGroup); 
            setIsLoading(false);
            return;
          }

          setGroup(fetchedGroup);
          setGroupName(fetchedGroup.name);
          setGroupDescription(fetchedGroup.description || '');
          setGroupBudget(fetchedGroup.budgetAmount !== undefined ? fetchedGroup.budgetAmount.toString() : '');
          setGroupPhotoPreview(fetchedGroup.photoUrl || null);
          setGroupVisibility(fetchedGroup.visibility);
          setGroupCategory(fetchedGroup.category || 'OTHER');
        } else {
          toast({ title: "Group Not Found", description: "The group you are trying to edit does not exist.", variant: "destructive" });
          setAccessDenied(true);
          setAccessDeniedReason("not_found");
        }
      } catch (error) {
        console.error("Error fetching group for edit:", error);
        toast({ title: "Error", description: "Could not load group details for editing.", variant: "destructive" });
        setAccessDenied(true);
        setAccessDeniedReason("generic_error");
      } finally {
        setIsLoading(false);
      }
    };
    fetchGroup();
  }, [groupId, currentUser, toast, router]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-10rem)]">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  if (accessDenied) {
    let message = "An error occurred or you do not have permission.";
    if (accessDeniedReason === "not_found") {
        message = "This group could not be found. It might have been deleted.";
    } else if (accessDeniedReason === "not_owner" && group) {
        message = `You do not have permission to edit the group "${group.name}". Only the owner can make changes.`;
    } else if (accessDeniedReason === "not_owner") {
        message = "You do not have permission to edit this group. Only the owner can make changes.";
    }

    return (
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-15rem)] text-center p-4">
        <AlertTriangle className="w-16 h-16 text-destructive mb-4" />
        <h1 className="text-3xl font-bold mb-2">Access Denied</h1>
        <p className="text-lg text-muted-foreground mb-6">{message}</p>
        <Button asChild>
          <Link href={group ? `/groups/${group.id}` : "/groups"}>
            {group ? "Back to Group" : "Back to Groups"}
          </Link>
        </Button>
      </div>
    );
  }
  
  if (!group) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-10rem)]">
        <Loader2 className="h-12 w-12 animate-spin text-muted-foreground" />
        <p className="ml-2 text-muted-foreground">Loading group data...</p>
      </div>
    );
  }


  const handlePhotoChange = (event: ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0]) {
      const file = event.target.files[0];
       if (file.size > 5 * 1024 * 1024) { // 5MB limit
        toast({ title: "File too large", description: "Group photo cannot exceed 5MB.", variant: "destructive"});
        return;
      }
      if (!file.type.startsWith("image/")) {
        toast({ title: "Invalid File Type", description: "Only image files are accepted for group photos.", variant: "destructive"});
        return;
      }
      setGroupPhotoFile(file);
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
    if (!group) { 
        toast({ title: "Error", description: "Group data not loaded.", variant: "destructive" });
        setIsSubmitting(false);
        return;
    }

    const oldGroupName = group.name;
    let photoUrlToSave = group.photoUrl;
    let dataAiHintToSave = group.dataAiHint;
    let photoChangedDuringSubmit = false;

    if (groupPhotoFile) { // A new file was selected
      photoChangedDuringSubmit = true;
      toast({ title: "Uploading Photo...", description: "Please wait.", variant: "default" });
      try {
        const timestampedFileName = `${Date.now()}_${groupPhotoFile.name}`;
        const filePath = `group-photos/${groupId}/${timestampedFileName}`;
        const fileStorageRef = storageRef(storage, filePath);
        const uploadTask = uploadBytesResumable(fileStorageRef, groupPhotoFile);
        await uploadTask;
        photoUrlToSave = await getDownloadURL(uploadTask.snapshot.ref);
        dataAiHintToSave = ''; // Clear hint for real images
        toast({ title: "Photo Uploaded!", description: "New group photo is saved.", variant: "default" });
      } catch (uploadError) {
        console.error("Error uploading group photo:", uploadError);
        toast({ title: "Photo Upload Failed", description: "Could not upload new photo. Previous photo (if any) will be kept.", variant: "destructive" });
        setGroupPhotoPreview(group.photoUrl || null); // Revert preview
        photoUrlToSave = group.photoUrl; // Keep original if upload failed
        dataAiHintToSave = group.dataAiHint;
        setIsSubmitting(false);
        return;
      }
    } else { // No new file was selected, check if preview indicates removal or change to placeholder
      if (groupPhotoPreview === null && group.photoUrl) { // Photo was removed
        photoChangedDuringSubmit = true;
        photoUrlToSave = '';
        dataAiHintToSave = '';
      } else if (groupPhotoPreview && groupPhotoPreview !== group.photoUrl) { // Placeholder or external URL (if preview was directly set)
        photoChangedDuringSubmit = true;
        photoUrlToSave = groupPhotoPreview;
        if (groupPhotoPreview.includes('placehold.co')) {
          dataAiHintToSave = group.dataAiHint || 'group image'; 
        } else {
          dataAiHintToSave = ''; // For other external URLs or if original hint is not relevant
        }
      }
      // If groupPhotoPreview is the same as group.photoUrl, no change to photo.
    }


    const numericBudget = groupBudget.trim() ? parseFloat(groupBudget) : undefined;
    if (groupBudget.trim() && (isNaN(numericBudget as number) || (numericBudget as number) < 0)) {
        toast({ title: "Invalid Budget", description: "Budget must be a non-negative number.", variant: "destructive"});
        setIsSubmitting(false);
        return;
    }

    const updatePayload: { [key: string]: any } = {
      name: groupName.trim(),
      description: groupDescription.trim(),
      visibility: groupVisibility,
      category: groupCategory,
    };

    if(photoChangedDuringSubmit || photoUrlToSave !== group.photoUrl || dataAiHintToSave !== group.dataAiHint) {
      updatePayload.photoUrl = photoUrlToSave;
      updatePayload.dataAiHint = dataAiHintToSave;
    }
    

    if (groupBudget.trim() === '' && group.budgetAmount !== undefined) {
      updatePayload.budgetAmount = deleteField();
    } else if (numericBudget !== undefined && numericBudget !== group.budgetAmount) {
      updatePayload.budgetAmount = numericBudget;
    } else if (groupBudget.trim() !== '' && numericBudget === undefined) {
      // This case should be caught by the isNaN check earlier, but as a safeguard
      // if budget string is present but not parseable or negative, don't change budgetAmount.
    }
    
    try {
      const groupDocRef = doc(db, 'groups', groupId);
      await updateDoc(groupDocRef, updatePayload);

      toast({
        title: "Group Updated!",
        description: `The group "${groupName}" has been successfully updated in Firestore.`,
      });
      addNotification({
        title: "Group Updated",
        message: `Group "${oldGroupName}" was updated to "${groupName.trim()}".`,
        type: "success",
        href: `/groups/${groupId}`,
      });
      router.push(`/groups/${groupId}?refresh=${Date.now()}`); 
    } catch (error) {
      console.error("Error updating group:", error);
      toast({ title: "Error Updating Group", description: "Could not update group details in Firestore.", variant: "destructive" });
      addNotification({
        title: "Group Update Failed",
        message: `Could not update group: "${oldGroupName}"`,
        type: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
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
          <CardDescription>Update the details for your group. Changes will be saved to Firestore.</CardDescription>
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
              <Label htmlFor="groupCategory">Group Category*</Label>
              <Select
                value={groupCategory}
                onValueChange={(value) => setGroupCategory(value as GroupCategory)}
                required
                disabled={isSubmitting}
              >
                <SelectTrigger id="groupCategory">
                  <SelectValue placeholder="Select a category" />
                </SelectTrigger>
                <SelectContent>
                  {(Object.keys(groupCategoryIcons) as GroupCategory[]).map((cat) => {
                    const IconComponent = groupCategoryIcons[cat];
                    return (
                      <SelectItem key={cat} value={cat}>
                        <div className="flex items-center gap-2">
                          <IconComponent className="h-4 w-4 text-muted-foreground" />
                          {cat.charAt(0) + cat.slice(1).toLowerCase()}
                        </div>
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
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
                    data-ai-hint={groupPhotoPreview.includes('placehold.co') ? (group.dataAiHint || 'group image') : ''}
                  />
                ) : (
                  <div className="h-20 w-20 bg-muted rounded-md flex items-center justify-center">
                    <ImageIcon className="h-10 w-10 text-muted-foreground" />
                  </div>
                )}
                 <div className="flex flex-col gap-2">
                    <Button type="button" variant="outline" size="sm" asChild disabled={isSubmitting}>
                        <label htmlFor="group-photo-upload" className="cursor-pointer">
                            {groupPhotoPreview ? 'Change Photo' : 'Upload Photo'}
                        </label>
                    </Button>
                    {groupPhotoPreview && (
                        <Button type="button" variant="ghost" size="sm" className="text-xs text-destructive" onClick={() => { setGroupPhotoPreview(null); setGroupPhotoFile(null); }} disabled={isSubmitting}>
                            Remove Photo
                        </Button>
                    )}
                 </div>
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
          </CardContent>
          <CardFooter className="border-t px-6 py-4">
            <Button type="submit" className="ml-auto" disabled={isSubmitting}>
              {isSubmitting ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
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

    

    