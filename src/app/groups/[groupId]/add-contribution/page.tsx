
"use client";

import { useState, useEffect, FormEvent, useCallback } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowLeft, DollarSign as DollarSignIcon, CalendarDays, User, Loader2, AlertTriangle, Handshake } from 'lucide-react';
import { useUser } from '@/contexts/UserContext';
import type { Group, User as UserType, Contribution, ActivityLog } from '@/types';
import { useToast } from "@/hooks/use-toast";
// Removed ToastAction as it's not used directly here for undo
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { format } from 'date-fns';
import { useCurrency } from '@/contexts/CurrencyContext';
import { db } from '@/lib/firebase';
import { loadGroupAsMember } from '@/lib/group-access';
import { doc, getDoc, collection, Timestamp, addDoc, writeBatch, serverTimestamp, query, where, getDocs, deleteDoc } from 'firebase/firestore';
import { useNotification } from '@/contexts/NotificationContext';

export default function AddContributionPage() {
  const params = useParams();
  const router = useRouter();
  const { currentUser } = useUser();
  const { toast } = useToast();
  const { addNotification } = useNotification();
  const groupId = params.groupId as string;
  const { getCurrencySymbol } = useCurrency();

  const [group, setGroup] = useState<Group | null>(null);
  const [contributorId, setContributorId] = useState<string>('');
  const [amount, setAmount] = useState<string>('');
  const [contributionDate, setContributionDate] = useState<Date | undefined>(new Date());
  const [description, setDescription] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  // Removed undoTimeoutId as the undo mechanism moves to the details page

  const resetFormFields = useCallback(() => {
    setAmount('');
    setContributionDate(new Date());
    setDescription('');
    if (currentUser) {
        setContributorId(currentUser.id);
    }
  }, [currentUser]);

  // Removed useEffect for undoTimeoutId cleanup

  useEffect(() => {
    const fetchGroupData = async () => {
      if (!currentUser || !groupId) {
        setIsLoading(false);
        if (!currentUser) router.push('/login');
        return;
      }
      setIsLoading(true);
      setError(null);

      try {
        const { group: fetchedGroup, denied } = await loadGroupAsMember(groupId, currentUser);

        if (denied || !fetchedGroup) {
          toast({ title: "Access Denied", description: "You are not a member of this group.", variant: "destructive" });
          setError("Access Denied.");
          setIsLoading(false);
          return;
        }

        setGroup(fetchedGroup);
        setContributorId(currentUser.id);
      } catch (err) {
        console.error("Error fetching data for contribution:", err);
        toast({ title: "Error", description: "Could not load group data.", variant: "destructive" });
        setError("Could not load data.");
      } finally {
        setIsLoading(false);
      }
    };
    fetchGroupData();
  }, [groupId, currentUser, router, toast]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-10rem)]">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-10rem)] text-center p-4">
        <AlertTriangle className="w-16 h-16 text-destructive mb-4" />
        <h1 className="text-3xl font-bold mb-2">{error === "Access Denied." ? "Access Denied" : "Error"}</h1>
        <p className="text-lg text-muted-foreground mb-6">
          {error === "Access Denied." ? "You are not a member of this group." : "Could not load data for adding contribution."}
        </p>
        <Button asChild>
          <Link href={`/groups/${groupId}`}>Back to Group</Link>
        </Button>
      </div>
    );
  }

  if (!currentUser || !group) {
    return <p className="text-center p-4">Loading group data or an error occurred...</p>;
  }

  // handleUndoAddContribution is removed as undo logic moves to group details page

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!contributorId || !amount || parseFloat(amount) <= 0 || !contributionDate) {
      toast({ title: "Missing Information", description: "Please select contributor, amount, and date.", variant: "destructive" });
      return;
    }

    setIsSubmitting(true);
    const numericAmount = parseFloat(amount);
    const contributorUser = group.members.find(m => m.id === contributorId);

    if (!contributorUser) {
      toast({ title: "Contributor Not Found", description: "Selected contributor could not be identified in the group.", variant: "destructive"});
      setIsSubmitting(false);
      return;
    }

    const contributionForFirestore: Omit<Contribution, 'id' | 'createdAt'> = {
      groupId,
      contributorId,
      amount: numericAmount,
      date: contributionDate.toISOString(),
      description: description.trim() || undefined,
    };

    const activityLogForFirestore: Omit<ActivityLog, 'id' | 'timestamp'> = {
      groupId,
      userId: contributorId,
      actionType: 'contribution_added',
      description: `${contributorUser.name || 'User'} contributed ${getCurrencySymbol()}${numericAmount.toFixed(2)} to the group. ${description.trim() ? `(${description.trim()})` : ''}`,
      relatedContributionId: '',
      actorName: contributorUser.name, // Use contributor's name for the log
    };
    
    try {
      const batch = writeBatch(db);
      
      const contributionsColRef = collection(db, 'groups', groupId, 'contributions');
      const newContributionDocRef = doc(contributionsColRef);
      activityLogForFirestore.relatedContributionId = newContributionDocRef.id;
      const contributionId = newContributionDocRef.id; // Get the generated ID

      batch.set(newContributionDocRef, { ...contributionForFirestore, createdAt: serverTimestamp() });
      
      const activityLogColRef = collection(db, 'groups', groupId, 'activityLog');
      batch.set(doc(activityLogColRef), { ...activityLogForFirestore, timestamp: serverTimestamp() });
      
      await batch.commit();

      addNotification({
          title: "Funds Contributed",
          message: `${contributorUser.name} contributed ${getCurrencySymbol()}${numericAmount.toFixed(2)} to "${group.name}".`,
          type: "success",
          href: `/groups/${groupId}?tab=contributions`
      });
      
      // Store details for undo toast on the next page
      sessionStorage.setItem('undoItemDetails', JSON.stringify({
          itemId: contributionId,
          itemType: 'contribution',
          groupId: groupId,
          description: description.trim() || `Contribution from ${contributorUser.name}`,
          actorName: contributorUser.name || 'User',
          amount: numericAmount,
      }));

      resetFormFields();
      router.push(`/groups/${groupId}?refresh=${Date.now()}&tab=contributions&undoAction=contribution&itemId=${contributionId}`);

    } catch (error) {
      console.error("Error recording contribution:", error);
      toast({ title: "Error", description: "Could not record contribution.", variant: "destructive" });
      addNotification({
        title: "Contribution Record Failed",
        message: `Failed to record contribution in group "${group.name}".`,
        type: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-xl mx-auto">
      <Button variant="outline" size="sm" asChild className="mb-4">
        <Link href={`/groups/${groupId}?tab=contributions`}>
          <ArrowLeft className="mr-2 h-4 w-4" /> Back to Group Contributions
        </Link>
      </Button>
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">Record Contribution to "{group.name}"</CardTitle>
          <CardDescription>Log funds added by a member to the group's pool.</CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-6">
            <div>
              <Label htmlFor="contributorId">Who Contributed?*</Label>
              <Select value={contributorId} onValueChange={setContributorId} required disabled={isSubmitting}>
                <SelectTrigger id="contributorId">
                   <User className="mr-2 h-4 w-4 text-muted-foreground inline-block" /> <SelectValue placeholder="Select contributor" />
                </SelectTrigger>
                <SelectContent>
                  {group.members.map(member => (
                    <SelectItem key={member.id} value={member.id}>
                      {member.name} {member.id === currentUser.id && "(You)"}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                    <Label htmlFor="amount">Amount Contributed*</Label>
                    <div className="relative">
                    <span className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground">{getCurrencySymbol()}</span>
                    <Input
                        id="amount"
                        type="number"
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                        placeholder="0.00"
                        className="pl-8"
                        required
                        step="0.01"
                        min="0.01"
                        disabled={isSubmitting}
                    />
                    </div>
                </div>
                 <div>
                    <Label htmlFor="contributionDate">Date of Contribution*</Label>
                    <Popover>
                        <PopoverTrigger asChild>
                            <Button
                            variant={"outline"}
                            className="w-full justify-start text-left font-normal"
                            disabled={isSubmitting}
                            >
                            <CalendarDays className="mr-2 h-4 w-4" />
                            {contributionDate ? format(contributionDate, "PPP") : <span>Pick a date</span>}
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0">
                            <Calendar
                            mode="single"
                            selected={contributionDate}
                            onSelect={setContributionDate}
                            initialFocus
                            disabled={isSubmitting || !contributionDate}
                            />
                        </PopoverContent>
                    </Popover>
                </div>
            </div>
            
            <div>
              <Label htmlFor="description">Description (Optional)</Label>
              <Input
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="e.g., Initial trip deposit, For groceries"
                disabled={isSubmitting}
              />
            </div>
          </CardContent>
          <CardFooter className="border-t px-6 py-4">
            <Button type="submit" className="ml-auto" disabled={isSubmitting || !contributorId || !amount || parseFloat(amount) <= 0}>
              {isSubmitting ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Handshake className="mr-2 h-4 w-4" />
              )}
              {isSubmitting ? "Recording..." : "Record Contribution"}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}

