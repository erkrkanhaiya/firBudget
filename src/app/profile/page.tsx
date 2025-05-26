
"use client";

import { useState, useEffect } from 'react';
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
import { auth } from '@/lib/firebase'; // Import auth directly

export default function ProfilePage() {
  const { currentUser, isLoadingAuth } = useUser();
  const [isEditing, setIsEditing] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState(''); // Email is generally not editable directly this way
  const [avatarPreview, setAvatarPreview] = useState<string | undefined | null>(null); // For new image preview
  const [isSaving, setIsSaving] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (currentUser) {
      setName(currentUser.name || '');
      setEmail(currentUser.email || 'No email provided');
      setAvatarPreview(currentUser.avatarUrl); // Initialize with current Firebase photoURL
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

  const handleSave = async () => {
    if (!auth.currentUser) {
      toast({ title: "Error", description: "Not authenticated.", variant: "destructive" });
      return;
    }
    setIsSaving(true);
    try {
      const updates: { displayName?: string; photoURL?: string } = {};
      if (name !== currentUser.name) {
        updates.displayName = name;
      }
      // Avatar update logic:
      // If avatarPreview is different AND it's a new file (e.g., data URI),
      // it should be uploaded to Firebase Storage first.
      // Then, updates.photoURL should be set to the new storage URL.
      // For simplicity, this example assumes avatarPreview would be a direct URL if changed.
      // A real avatar upload is more complex.
      // if (avatarPreview && avatarPreview !== currentUser.avatarUrl) {
      //   updates.photoURL = avatarPreview; // This line is simplified
      // }

      if (Object.keys(updates).length > 0) {
        await updateProfile(auth.currentUser, updates);
        // UserContext will pick up changes via onAuthStateChanged,
        // or you might need to manually trigger a refresh of currentUser in context.
        // Forcing a reload of the user profile can sometimes help:
        // await auth.currentUser.reload(); 
        toast({
          title: "Profile Updated",
          description: "Your profile information has been saved.",
        });
      } else {
        toast({
          title: "No Changes",
          description: "No changes were made to your profile.",
        });
      }
      setIsEditing(false);
    } catch (error) {
      console.error("Error updating profile:", error);
      toast({ title: "Error", description: "Could not update profile.", variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };
  
  const handleAvatarChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0]) {
      const file = event.target.files[0];
      const reader = new FileReader();
      reader.onloadend = () => {
        setAvatarPreview(reader.result as string);
        toast({ title: "Avatar Preview Updated", description: "Click 'Save Changes' to apply. Note: Full avatar upload to server is not implemented in this demo."});
      };
      reader.readAsDataURL(file);
    }
  };

  const handleCancelEdit = () => {
    // Reset fields to original currentUser values
    if (currentUser) {
      setName(currentUser.name || '');
      setAvatarPreview(currentUser.avatarUrl);
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
                  <input id="avatar-upload" type="file" className="hidden" accept="image/*" onChange={handleAvatarChange} />
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
              <Button onClick={handleSave} disabled={isSaving || (name === currentUser.name && avatarPreview === currentUser.avatarUrl) }>
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

    