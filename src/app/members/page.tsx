
"use client";

import { useState, useEffect, FormEvent } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AlertTriangle, UserPlus, Users2, Loader2, Trash2 } from 'lucide-react';
import { useUser } from '@/contexts/UserContext';
import { db } from '@/lib/firebase';
import { collection, addDoc, serverTimestamp, query, orderBy, onSnapshot, Timestamp, where, doc, deleteDoc } from 'firebase/firestore';
import type { AppMemberContact } from '@/types';
import { useToast } from "@/hooks/use-toast";
import { format } from 'date-fns';
import { Skeleton } from '@/components/ui/skeleton';
import { useNotification } from '@/contexts/NotificationContext';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

export default function MembersPage() {
  const { currentUser } = useUser();
  const { toast } = useToast();
  const { addNotification } = useNotification();

  const [members, setMembers] = useState<AppMemberContact[]>([]);
  const [newMemberName, setNewMemberName] = useState('');
  const [isLoadingMembers, setIsLoadingMembers] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [contactToDelete, setContactToDelete] = useState<AppMemberContact | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    if (!currentUser) {
      setIsLoadingMembers(false);
      return;
    }

    setIsLoadingMembers(true);
    const membersCollectionRef = collection(db, 'appMemberContacts');
    const q = query(
      membersCollectionRef,
      where("addedByUid", "==", currentUser.id),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetchedMembers = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          name: data.name,
          addedByUid: data.addedByUid,
          createdAt: (data.createdAt as Timestamp)?.toDate().toISOString() || new Date().toISOString(),
        } as AppMemberContact;
      });
      setMembers(fetchedMembers);
      setIsLoadingMembers(false);
    }, (error) => {
      console.error("Error fetching members:", error);
      toast({ title: "Error", description: "Could not fetch your contacts. Ensure Firestore indexes are set up if prompted.", variant: "destructive" });
      setIsLoadingMembers(false);
    });

    return () => unsubscribe();
  }, [currentUser, toast]);

  const handleAddMember = async (event: FormEvent) => {
    event.preventDefault();
    if (!newMemberName.trim() || !currentUser) {
      toast({ title: "Name required", description: "Please enter a name for the member.", variant: "destructive" });
      return;
    }

    setIsSubmitting(true);
    const memberName = newMemberName.trim();
    try {
      await addDoc(collection(db, 'appMemberContacts'), {
        name: memberName,
        addedByUid: currentUser.id,
        createdAt: serverTimestamp(),
      });
      toast({ title: "Contact Added", description: `"${memberName}" has been added to your contacts.` });
      addNotification({
        title: "New Contact Added",
        message: `You added "${memberName}" to your contacts.`,
        type: "success",
      });
      setNewMemberName('');
    } catch (error) {
      console.error("Error adding member:", error);
      toast({ title: "Error", description: "Could not add member.", variant: "destructive" });
      addNotification({
        title: "Contact Add Failed",
        message: `Could not add contact: "${memberName}"`,
        type: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteContact = async () => {
    if (!contactToDelete || !currentUser) {
      toast({ title: "Error", description: "No contact selected for deletion or user not authenticated.", variant: "destructive" });
      return;
    }
    if (contactToDelete.addedByUid !== currentUser.id) {
      toast({ title: "Permission Denied", description: "You can only delete contacts you added.", variant: "destructive" });
      setContactToDelete(null);
      return;
    }

    setIsDeleting(true);
    const contactName = contactToDelete.name;
    try {
      const contactDocRef = doc(db, 'appMemberContacts', contactToDelete.id);
      await deleteDoc(contactDocRef);
      toast({ title: "Contact Deleted", description: `"${contactName}" has been removed from your contacts.` });
      addNotification({
        title: "Contact Deleted",
        message: `You removed "${contactName}" from your contacts.`,
        type: "info", // Using 'info' for deletion, could be 'success'
      });
      setContactToDelete(null); // Close dialog by resetting state
    } catch (error) {
      console.error("Error deleting contact:", error);
      toast({ title: "Error", description: "Could not delete contact.", variant: "destructive" });
      addNotification({
        title: "Contact Deletion Failed",
        message: `Could not delete contact: "${contactName}"`,
        type: "destructive",
      });
    } finally {
      setIsDeleting(false);
    }
  };


  if (!currentUser && !isLoadingMembers) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-10rem)] text-center p-4">
        <AlertTriangle className="w-16 h-16 text-destructive mb-4" />
        <h1 className="text-3xl font-bold mb-2">Access Denied</h1>
        <p className="text-lg text-muted-foreground mb-6">Please log in to manage members.</p>
        <Button asChild>
          <Link href="/login">Go to Login</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Manage Your Contacts</h1>
        <p className="text-muted-foreground">Add and view contacts you've saved to the application. Only contacts you added are shown here.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Add New Contact</CardTitle>
        </CardHeader>
        <form onSubmit={handleAddMember}>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="memberName">Contact Name*</Label>
              <Input
                id="memberName"
                value={newMemberName}
                onChange={(e) => setNewMemberName(e.target.value)}
                placeholder="Enter contact's name"
                required
                disabled={isSubmitting}
              />
            </div>
          </CardContent>
          <CardFooter>
            <Button type="submit" disabled={isSubmitting || !newMemberName.trim()}>
              {isSubmitting ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <UserPlus className="mr-2 h-4 w-4" />
              )}
              {isSubmitting ? "Adding..." : "Add Contact"}
            </Button>
          </CardFooter>
        </form>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Your Contact List</CardTitle>
          <CardDescription>Contacts you have added. These are private to you.</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoadingMembers ? (
            <div className="space-y-3">
              {[1, 2, 3].map(i => (
                <div key={i} className="flex items-center justify-between p-3 border rounded-md">
                  <div className="space-y-1.5">
                    <Skeleton className="h-5 w-32" />
                    <Skeleton className="h-3 w-40" />
                  </div>
                   <Skeleton className="h-8 w-8 rounded-md" />
                </div>
              ))}
            </div>
          ) : members.length > 0 ? (
            <ul className="space-y-3">
              {members.map((member) => (
                <li key={member.id} className="flex items-center justify-between p-3 border rounded-md hover:bg-muted/50">
                  <div>
                    <p className="font-medium">{member.name}</p>
                    <p className="text-xs text-muted-foreground">
                      Added on: {format(new Date(member.createdAt), "MMMM d, yyyy 'at' h:mm a")}
                    </p>
                  </div>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="ghost" size="icon" onClick={() => setContactToDelete(member)} disabled={isDeleting}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                        <span className="sr-only">Delete {member.name}</span>
                      </Button>
                    </AlertDialogTrigger>
                    {/* AlertDialogContent will only render if contactToDelete is set and matches */}
                    {contactToDelete && contactToDelete.id === member.id && (
                        <AlertDialogContent>
                        <AlertDialogHeader>
                            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                            <AlertDialogDescription>
                            This action cannot be undone. This will permanently delete the contact
                            "{contactToDelete.name}" from your private contact list. This will not remove them from any groups they are already in.
                            </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                            <AlertDialogCancel onClick={() => setContactToDelete(null)} disabled={isDeleting}>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={handleDeleteContact} disabled={isDeleting} className="bg-destructive hover:bg-destructive/90">
                            {isDeleting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Delete"}
                            </AlertDialogAction>
                        </AlertDialogFooter>
                        </AlertDialogContent>
                    )}
                  </AlertDialog>
                </li>
              ))}
            </ul>
          ) : (
            <div className="text-center py-10">
              <Users2 className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground">You haven't added any contacts yet. Add one using the form above.</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

