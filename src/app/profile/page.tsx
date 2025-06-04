
"use client";

import { useState, useEffect, ChangeEvent } from 'react';
import { useUser } from '@/contexts/UserContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Camera, Edit3, Save, AlertTriangle, Loader2 } from 'lucide-react';
import { useToast } from "@/hooks/use-toast";
import Link from 'next/link';
import { updateProfile } from 'firebase/auth';
import { auth, storage } from '@/lib/firebase'; // Import auth and storage
import { ref as storageRef, uploadBytesResumable, getDownloadURL } from "firebase/storage";
import { useNotification } from '@/contexts/NotificationContext';

export default function ProfilePage() {
  const { currentUser, isLoadingAuth, setCurrentUser } = useUser(); // Added setCurrentUser from context
  const { addNotification } = useNotification();
  const [isEditing, setIsEditing] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | undefined | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (currentUser) {
      setName(currentUser.name || '');
      setEmail(currentUser.email || 'No email provided');
      setAvatarPreview(currentUser.avatarUrl); 
    }
  }, [currentUser]);

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
        <p className="text-lg text-muted-foreground mb-6">Please log in to view your profile.</p>
        <Button asChild>
          <Link href="/login">Go to Login</Link>
        </Button>
      </div>
    );
  }
  
  const getInitials = (nameStr: string | null | undefined) => {
    if (!nameStr) return "U";
    const names = nameStr.split(' ');
    if (names.length > 1 && names[0] && names[names.length-1]) {
      return (names[0][0] + names[names.length - 1][0]).toUpperCase();
    }
    if(nameStr.length > 0) return nameStr.substring(0, 2).toUpperCase();
    return "U";
  };

  const handleAvatarChange = (event: ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0]) {
      const file = event.target.files[0];
      if (file.size > 2 * 1024 * 1024) { // 2MB limit
        toast({ title: "File too large", description: "Avatar image cannot exceed 2MB.", variant: "destructive"});
        return;
      }
      if (!file.type.startsWith("image/")) {
        toast({ title: "Invalid File Type", description: "Only image files are accepted for avatars.", variant: "destructive"});
        return;
      }
      setAvatarFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setAvatarPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSave = async () => {
    if (!auth.currentUser) {
      toast({ title: "Error", description: "Not authenticated.", variant: "destructive" });
      return;
    }
    setIsSaving(true);
    const oldName = currentUser.name;
    let newAvatarUrl: string | undefined = currentUser.avatarUrl || undefined;
    let avatarChanged = false;

    try {
      if (avatarFile) {
        const filePath = `profile-avatars/${currentUser.id}/${Date.now()}_${avatarFile.name}`;
        const fileStorageRef = storageRef(storage, filePath);
        
        toast({ title: "Uploading Avatar...", description: "Please wait.", variant: "default" });
        const uploadTask = uploadBytesResumable(fileStorageRef, avatarFile);
        await uploadTask;
        newAvatarUrl = await getDownloadURL(uploadTask.snapshot.ref);
        avatarChanged = true;
        toast({ title: "Avatar Uploaded!", description: "Your new avatar is uploaded.", variant: "default" });
      }

      const updates: { displayName?: string; photoURL?: string } = {};
      if (name !== currentUser.name) {
        updates.displayName = name;
      }
      if (avatarChanged && newAvatarUrl !== currentUser.avatarUrl) {
        updates.photoURL = newAvatarUrl;
      }

      if (Object.keys(updates).length > 0) {
        await updateProfile(auth.currentUser, updates);
        
        // Manually update the currentUser in context for immediate UI reflection
        setCurrentUser({
          ...currentUser,
          name: updates.displayName !== undefined ? updates.displayName : currentUser.name,
          avatarUrl: updates.photoURL !== undefined ? updates.photoURL : currentUser.avatarUrl,
        });

        toast({
          title: "Profile Updated",
          description: "Your profile information has been saved.",
        });
        if (updates.displayName && updates.displayName !== oldName) {
            addNotification({
            title: "Profile Name Updated",
            message: `Your name was changed to "${updates.displayName}".`,
            type: "success",
            });
        }
        if (updates.photoURL) {
            addNotification({
            title: "Profile Avatar Updated",
            message: `Your avatar has been successfully changed.`,
            type: "success",
            });
        }
      } else {
        toast({
          title: "No Changes",
          description: "No changes were made to your profile.",
        });
      }
      setIsEditing(false);
      setAvatarFile(null); // Reset file input after save
    } catch (error) {
      console.error("Error updating profile:", error);
      toast({ title: "Error", description: "Could not update profile.", variant: "destructive" });
      addNotification({
        title: "Profile Update Failed",
        message: "Could not save profile changes.",
        type: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };
  
  const handleCancelEdit = () => {
    if (currentUser) {
      setName(currentUser.name || '');
      setAvatarPreview(currentUser.avatarUrl);
      setAvatarFile(null);
    }
    setIsEditing(false);
  };

  return (
    <div className="max-w-2xl mx-auto">
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">User Profile</CardTitle>
          <CardDescription>View and manage your profile settings. Email is read-only.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex flex-col items-center space-y-4">
            <div className="relative">
              <Avatar className="h-32 w-32">
                <AvatarImage src={avatarPreview || undefined} alt={name || ""} />
                <AvatarFallback className="text-4xl">{getInitials(name)}</AvatarFallback>
              </Avatar>
              {isEditing && (
                <label htmlFor="avatar-upload" className="absolute -bottom-2 -right-2 bg-primary text-primary-foreground p-2 rounded-full cursor-pointer hover:bg-primary/90 transition-colors">
                  <Camera className="h-5 w-5" />
                  <input id="avatar-upload" type="file" className="hidden" accept="image/*" onChange={handleAvatarChange} disabled={isSaving} />
                </label>
              )}
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <Label htmlFor="name">Name</Label>
              {isEditing ? (
                <Input id="name" value={name} onChange={(e) => setName(e.target.value)} disabled={isSaving} />
              ) : (
                <p className="text-lg font-medium pt-1">{name || "Not set"}</p>
              )}
            </div>
            <div>
              <Label htmlFor="email">Email (Read-only)</Label>
              <p className="text-lg pt-1 text-muted-foreground">{email}</p>
            </div>
          </div>
        </CardContent>
        <CardFooter className="border-t px-6 py-4">
          {isEditing ? (
            <div className="flex justify-end gap-2 w-full">
              <Button variant="outline" onClick={handleCancelEdit} disabled={isSaving}>Cancel</Button>
              <Button onClick={handleSave} disabled={isSaving || (name === currentUser.name && !avatarFile) }>
                {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                {isSaving ? "Saving..." : "Save Changes"}
              </Button>
            </div>
          ) : (
            <Button onClick={() => setIsEditing(true)} className="ml-auto">
              <Edit3 className="mr-2 h-4 w-4" /> Edit Profile
            </Button>
          )}
        </CardFooter>
      </Card>
    </div>
  );
}


    