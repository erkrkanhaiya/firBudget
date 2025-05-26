
"use client";

import { useState, useEffect, FormEvent, ChangeEvent } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { ArrowLeft, PlusCircle, DollarSign as DollarSignIcon, Users, CalendarDays, User, Info, Loader2 } from 'lucide-react';
import { useUser } from '@/contexts/UserContext';
import type { Group, User as UserType, ExpenseParticipant, Expense, ActivityLog } from '@/types';
import { useToast } from "@/hooks/use-toast";
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { format } from 'date-fns';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useCurrency } from '@/contexts/CurrencyContext';
import { db } from '@/lib/firebase';
import { doc, getDoc, collection, addDoc, serverTimestamp, Timestamp, writeBatch } from 'firebase/firestore';

interface StoredExpenseData {
  groupId: string;
  description: string;
  amount: number;
  paidByUserId: string;
  date: string; // ISO string
  participants: ExpenseParticipant[];
  tempId: string; // For UI identification before sync
  // Store necessary info to reconstruct actor for activity log if needed
  actorNameForLog: string | null; 
}

export default function AddExpensePage() {
  const params = useParams();
  const router = useRouter();
  const { currentUser } = useUser();
  const { toast } = useToast();
  const groupId = params.groupId as string;
  const { getCurrencySymbol } = useCurrency();

  const [group, setGroup] = useState<Group | null>(null);
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState<string>('');
  const [paidByUserId, setPaidByUserId] = useState<string>('');
  const [expenseDate, setExpenseDate] = useState<Date | undefined>(new Date());
  const [selectedParticipantIds, setSelectedParticipantIds] = useState<string[]>([]);
  const [splitEqually, setSplitEqually] = useState(true);
  const [customSplitAmounts, setCustomSplitAmounts] = useState<Record<string, string>>({});
  
  const [sumOfCustomShares, setSumOfCustomShares] = useState<number>(0);
  const [remainingToAllocate, setRemainingToAllocate] = useState<number>(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoadingGroup, setIsLoadingGroup] = useState(true);
  const [isOnline, setIsOnline] = useState(true);

  useEffect(() => {
    const updateOnlineStatus = () => setIsOnline(navigator.onLine);
    window.addEventListener('online', updateOnlineStatus);
    window.addEventListener('offline', updateOnlineStatus);
    updateOnlineStatus();
    return () => {
      window.removeEventListener('online', updateOnlineStatus);
      window.removeEventListener('offline', updateOnlineStatus);
    };
  }, []);

  useEffect(() => {
    const fetchGroup = async () => {
      if (!currentUser || !groupId) {
        setIsLoadingGroup(false);
        if (!currentUser) router.push('/login');
        return;
      }
      setIsLoadingGroup(true);
      try {
        const groupDocRef = doc(db, 'groups', groupId);
        const groupDocSnap = await getDoc(groupDocRef);
        if (groupDocSnap.exists()) {
          const groupData = groupDocSnap.data() as Omit<Group, 'id' | 'createdAt'> & { createdAt: Timestamp };
          const fetchedGroup: Group = {
            id: groupDocSnap.id,
            ...groupData,
            members: groupData.members || [],
            memberIds: groupData.memberIds || [],
            createdAt: groupData.createdAt.toDate().toISOString(),
          };

          if (!fetchedGroup.memberIds.includes(currentUser.id)) {
            toast({ title: "Access Denied", description: "You are not a member of this group.", variant: "destructive" });
            router.push('/groups');
            return;
          }
          setGroup(fetchedGroup);
          const memberIds = fetchedGroup.members.map(m => m.id);
          setSelectedParticipantIds(memberIds);
          setPaidByUserId(currentUser.id);
          const initialCustomAmounts: Record<string, string> = {};
          memberIds.forEach(id => { initialCustomAmounts[id] = ''; });
          setCustomSplitAmounts(initialCustomAmounts);
        } else {
          toast({ title: "Group not found", variant: "destructive" });
          router.push('/groups');
        }
      } catch (error) {
        console.error("Error fetching group:", error);
        toast({ title: "Error", description: "Could not load group details.", variant: "destructive" });
        router.push('/groups');
      } finally {
        setIsLoadingGroup(false);
      }
    };
    fetchGroup();
  }, [groupId, currentUser, router, toast]);

  useEffect(() => {
    if (!splitEqually) {
        const currentTotalAmount = parseFloat(amount) || 0;
        let sum = 0;
        selectedParticipantIds.forEach(pId => {
            sum += parseFloat(customSplitAmounts[pId]) || 0;
        });
        setSumOfCustomShares(parseFloat(sum.toFixed(2)));
        setRemainingToAllocate(parseFloat((currentTotalAmount - sum).toFixed(2)));
    } else {
        setSumOfCustomShares(parseFloat(amount) || 0);
        setRemainingToAllocate(0);
    }
  }, [customSplitAmounts, amount, selectedParticipantIds, splitEqually]);

  useEffect(() => {
    const syncPendingExpenses = async () => {
      if (isOnline && group && currentUser) {
        const pendingExpensesData = localStorage.getItem('pendingExpenses');
        if (!pendingExpensesData) return;

        const allPendingStoredExpenses: StoredExpenseData[] = JSON.parse(pendingExpensesData);
        const expensesToSyncForThisGroup = allPendingStoredExpenses.filter(exp => exp.groupId === groupId);

        if (expensesToSyncForThisGroup.length > 0) {
          const batch = writeBatch(db);
          let syncedCount = 0;

          for (const storedExp of expensesToSyncForThisGroup) {
            const expenseColRef = collection(db, 'groups', storedExp.groupId, 'expenses');
            const newExpenseDocRef = doc(expenseColRef); // Auto-generate ID
            
            const expenseForFirestore: Omit<Expense, 'id' | 'createdAt'> = {
              groupId: storedExp.groupId,
              description: storedExp.description,
              amount: storedExp.amount,
              paidByUserId: storedExp.paidByUserId,
              date: storedExp.date, // Already ISO string
              participants: storedExp.participants,
            };
            batch.set(newExpenseDocRef, { ...expenseForFirestore, createdAt: serverTimestamp() });

            const activityLogColRef = collection(db, 'groups', storedExp.groupId, 'activityLog');
            const activityLogForFirestore: Omit<ActivityLog, 'id' | 'timestamp'> = {
              groupId: storedExp.groupId,
              userId: storedExp.paidByUserId, // Actor is the payer
              actionType: 'expense_added',
              description: `${storedExp.actorNameForLog || 'User'} added expense: ${storedExp.description} (synced from offline)`,
              relatedExpenseId: newExpenseDocRef.id, // Link to the new expense ID
            };
            batch.set(doc(activityLogColRef), { ...activityLogForFirestore, timestamp: serverTimestamp() });
            syncedCount++;
          }

          try {
            await batch.commit();
            const remainingOverallPendingExpenses = allPendingStoredExpenses.filter(exp => exp.groupId !== groupId);
            if (remainingOverallPendingExpenses.length > 0) {
              localStorage.setItem('pendingExpenses', JSON.stringify(remainingOverallPendingExpenses));
            } else {
              localStorage.removeItem('pendingExpenses');
            }
            toast({
              title: "Back Online!",
              description: `${syncedCount} pending expense(s) for this group have been submitted to Firestore.`,
            });
             router.refresh(); // To reflect synced data on group page
          } catch (error) {
            console.error("Error syncing expenses to Firestore:", error);
            toast({ title: "Sync Error", description: "Some offline expenses could not be synced.", variant: "destructive" });
          }
        }
      }
    };
    syncPendingExpenses();
  }, [isOnline, group, currentUser, groupId, toast, router]);


  if (isLoadingGroup || !currentUser || !group) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-10rem)]">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="ml-4 text-muted-foreground">Loading group details...</p>
      </div>
    );
  }
  
  const handleParticipantChange = (userId: string, isChecked: boolean) => {
    setSelectedParticipantIds(prev => {
        const newParticipants = isChecked 
            ? [...prev, userId] 
            : prev.filter(id => id !== userId);

        if (!splitEqually) {
            setCustomSplitAmounts(currentAmounts => {
                const updatedAmounts = { ...currentAmounts };
                if (!isChecked && userId in updatedAmounts) { 
                    updatedAmounts[userId] = ''; // Clear amount if deselected
                } else if (isChecked && !(userId in updatedAmounts)) { 
                    updatedAmounts[userId] = ''; 
                }
                return updatedAmounts;
            });
        }
        return newParticipants;
    });
  };
  
  const handleSplitEquallyChange = (checked: boolean) => {
    setSplitEqually(checked);
    if (!checked) { 
        const initialAmounts: Record<string, string> = {};
        selectedParticipantIds.forEach(pid => {
            initialAmounts[pid] = ''; 
        });
        setCustomSplitAmounts(initialAmounts);
    }
  };

  const handleCustomSplitAmountChange = (userId: string, value: string) => {
    if (/^\d*(\.\d{0,2})?$/.test(value) || value === '') {
        setCustomSplitAmounts(prev => ({
            ...prev,
            [userId]: value
        }));
    }
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setIsSubmitting(true);

    if (!description.trim() || !amount || parseFloat(amount) <= 0 || !paidByUserId || selectedParticipantIds.length === 0 || !expenseDate) {
      toast({ title: "Missing Information", description: "Please fill all required fields, ensure amount is positive, and at least one participant is selected.", variant: "destructive" });
      setIsSubmitting(false);
      return;
    }

    const numericAmount = parseFloat(amount);
    let expenseParticipants: ExpenseParticipant[];

    if (splitEqually) {
      const share = numericAmount / selectedParticipantIds.length;
      expenseParticipants = selectedParticipantIds.map(userId => ({
        userId,
        amountOwed: parseFloat(share.toFixed(2)),
      }));
    } else {
      let currentTotalCustomSplit = 0;
      expenseParticipants = [];

      for (const userId of selectedParticipantIds) {
        const customAmountStr = customSplitAmounts[userId];
        if (customAmountStr === undefined || customAmountStr.trim() === '') {
            toast({ title: "Custom Split Error", description: `Please enter an amount for ${group.members.find(m=>m.id===userId)?.name}.`, variant: "destructive" });
            setIsSubmitting(false);
            return;
        }
        const customAmount = parseFloat(customAmountStr);
        if (isNaN(customAmount) || customAmount < 0) {
          toast({ title: "Invalid Amount", description: `Please enter a valid, non-negative amount for ${group.members.find(m=>m.id===userId)?.name}.`, variant: "destructive" });
          setIsSubmitting(false);
          return;
        }
        expenseParticipants.push({ userId, amountOwed: parseFloat(customAmount.toFixed(2)) });
        currentTotalCustomSplit += customAmount;
      }
      
      currentTotalCustomSplit = parseFloat(currentTotalCustomSplit.toFixed(2));
      const totalExpenseAmount = parseFloat(numericAmount.toFixed(2));

      if (Math.abs(currentTotalCustomSplit - totalExpenseAmount) > 0.005) { // Allow for small floating point discrepancies
        toast({
          title: "Custom Split Mismatch",
          description: `The sum of custom shares (${getCurrencySymbol()}${currentTotalCustomSplit.toFixed(2)}) must equal the total expense amount (${getCurrencySymbol()}${totalExpenseAmount.toFixed(2)}). Remaining: ${getCurrencySymbol()}${(totalExpenseAmount - currentTotalCustomSplit).toFixed(2)}`,
          variant: "destructive",
        });
        setIsSubmitting(false);
        return;
      }
    }
    
    const actor = group.members.find(u => u.id === paidByUserId) || currentUser;

    const expenseDataForStorage: StoredExpenseData = {
      groupId,
      description: description.trim(),
      amount: numericAmount,
      paidByUserId,
      date: expenseDate.toISOString(),
      participants: expenseParticipants,
      tempId: `pending-${Date.now()}`,
      actorNameForLog: actor?.name || 'User'
    };

    if (!isOnline) {
      const pending = JSON.parse(localStorage.getItem('pendingExpenses') || '[]') as StoredExpenseData[];
      pending.push(expenseDataForStorage);
      localStorage.setItem('pendingExpenses', JSON.stringify(pending));
      toast({ title: "Offline", description: "Expense saved locally. Will submit to Firestore when online." });
      setIsSubmitting(false);
      router.push(`/groups/${groupId}`);
      return;
    }

    // ---- ONLINE SUBMISSION to FIRESTORE ----
    try {
      const expenseColRef = collection(db, 'groups', groupId, 'expenses');
      const newExpenseDocRef = doc(expenseColRef); // Auto-generate ID for the new expense

      const expenseForFirestore: Omit<Expense, 'id' | 'createdAt'> = {
        groupId: expenseDataForStorage.groupId,
        description: expenseDataForStorage.description,
        amount: expenseDataForStorage.amount,
        paidByUserId: expenseDataForStorage.paidByUserId,
        date: expenseDataForStorage.date, // ISO string
        participants: expenseDataForStorage.participants,
      };
      
      const activityLogColRef = collection(db, 'groups', groupId, 'activityLog');
      const activityLogForFirestore: Omit<ActivityLog, 'id' | 'timestamp'> = {
        groupId: expenseDataForStorage.groupId,
        userId: expenseDataForStorage.paidByUserId, // Actor is the payer
        actionType: 'expense_added',
        description: `${actor?.name || 'User'} added expense: ${expenseDataForStorage.description}`,
        relatedExpenseId: newExpenseDocRef.id, // Link to the new expense ID
      };
      
      const batch = writeBatch(db);
      batch.set(newExpenseDocRef, { ...expenseForFirestore, createdAt: serverTimestamp() });
      batch.set(doc(activityLogColRef), { ...activityLogForFirestore, timestamp: serverTimestamp() });
      
      await batch.commit();

      toast({
        title: "Expense Added to Firestore!",
        description: `Expense "${description}" for ${getCurrencySymbol()}${numericAmount.toFixed(2)} has been added.`,
      });
      await new Promise(resolve => setTimeout(resolve, 300)); // UI nicety
      router.push(`/groups/${groupId}?refresh=${Date.now()}`); // Add refresh query param to trigger data reload on group page

    } catch (error) {
        console.error("Error adding expense to Firestore:", error);
        toast({ title: "Firestore Error", description: "Could not save expense. Please try again.", variant: "destructive" });
    } finally {
        setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-xl mx-auto">
      <Button variant="outline" size="sm" asChild className="mb-4">
        <Link href={`/groups/${groupId}`}>
          <ArrowLeft className="mr-2 h-4 w-4" /> Back to Group
        </Link>
      </Button>
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">Add Expense to "{group.name}"</CardTitle>
          <CardDescription>Record a new shared expense for the group. {isOnline ? "" : <span className="text-destructive font-semibold">(Offline Mode)</span>}</CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-6">
            <div>
              <Label htmlFor="description">Description*</Label>
              <Input
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="e.g., Groceries, Dinner, Train tickets"
                required
                disabled={isSubmitting}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="amount">Amount*</Label>
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
                <Label htmlFor="expenseDate">Date*</Label>
                <Popover>
                    <PopoverTrigger asChild>
                        <Button
                        variant={"outline"}
                        className="w-full justify-start text-left font-normal"
                        disabled={isSubmitting}
                        >
                        <CalendarDays className="mr-2 h-4 w-4" />
                        {expenseDate ? format(expenseDate, "PPP") : <span>Pick a date</span>}
                        </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                        <Calendar
                        mode="single"
                        selected={expenseDate}
                        onSelect={setExpenseDate}
                        initialFocus
                        disabled={isSubmitting || !expenseDate} // Ensure date is not cleared accidently
                        />
                    </PopoverContent>
                </Popover>
              </div>
            </div>
            <div>
              <Label htmlFor="paidBy">Paid by*</Label>
              <Select value={paidByUserId} onValueChange={setPaidByUserId} required disabled={isSubmitting}>
                <SelectTrigger id="paidBy">
                  <User className="mr-2 h-4 w-4 text-muted-foreground inline-block" /> <SelectValue placeholder="Select who paid" />
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
            <div>
              <Label>Participants*</Label>
              <p className="text-xs text-muted-foreground mb-2">Select who this expense should be split amongst.</p>
              <div className="space-y-2 max-h-48 overflow-y-auto border p-3 rounded-md">
                {group.members.map(member => (
                  <div key={member.id} className="flex items-center space-x-2">
                    <Checkbox
                      id={`participant-${member.id}`}
                      checked={selectedParticipantIds.includes(member.id)}
                      onCheckedChange={(checked) => handleParticipantChange(member.id, Boolean(checked))}
                      disabled={isSubmitting}
                    />
                    <Label htmlFor={`participant-${member.id}`} className="font-normal cursor-pointer">
                      {member.name} {member.id === currentUser.id && "(You)"}
                    </Label>
                  </div>
                ))}
              </div>
            </div>
            <div className="flex items-center space-x-2">
                <Checkbox
                  id="splitEqually"
                  checked={splitEqually}
                  onCheckedChange={(checked) => handleSplitEquallyChange(Boolean(checked))}
                  disabled={isSubmitting}
                />
                <Label htmlFor="splitEqually" className="font-normal">Split equally</Label>
            </div>

            {!splitEqually && selectedParticipantIds.length > 0 && (
              <Card className="p-4 space-y-4 bg-muted/50">
                 <div className="flex justify-between items-baseline">
                    <h4 className="font-medium">Custom Split by Amount</h4>
                 </div>
                {selectedParticipantIds.map(participantId => {
                  const member = group.members.find(m => m.id === participantId);
                  return (
                    <div key={participantId} className="grid grid-cols-3 items-center gap-2">
                      <Label htmlFor={`custom-amount-${participantId}`} className="col-span-1 truncate">
                        {member?.name} {member?.id === currentUser.id && "(You)"}
                      </Label>
                      <div className="relative col-span-2">
                         <span className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground">{getCurrencySymbol()}</span>
                         <Input
                            id={`custom-amount-${participantId}`}
                            type="number"
                            value={customSplitAmounts[participantId] || ''}
                            onChange={(e) => handleCustomSplitAmountChange(participantId, e.target.value)}
                            placeholder="0.00"
                            className="pl-8"
                            step="0.01"
                            min="0"
                            disabled={isSubmitting}
                         />
                      </div>
                    </div>
                  );
                })}
                <Alert variant={Math.abs(remainingToAllocate) < 0.005 ? "default" : "destructive"} className="mt-4">
                    <Info className="h-4 w-4" />
                    <AlertTitle>
                        {Math.abs(remainingToAllocate) < 0.005 && sumOfCustomShares === (parseFloat(amount) || 0) ? "Amounts Match Total" : "Amounts Review"}
                    </AlertTitle>
                    <AlertDescription className="text-xs space-y-0.5">
                        <p>Total Expense: {getCurrencySymbol()}{ (parseFloat(amount) || 0).toFixed(2) }</p>
                        <p>Sum of Shares: {getCurrencySymbol()}{sumOfCustomShares.toFixed(2)}</p>
                        <p className={Math.abs(remainingToAllocate) >= 0.005 ? 'text-destructive font-semibold' : ''}>
                           Remaining to Allocate: {getCurrencySymbol()}{remainingToAllocate.toFixed(2)}
                        </p>
                    </AlertDescription>
                </Alert>
              </Card>
            )}

          </CardContent>
          <CardFooter className="border-t px-6 py-4">
            <Button type="submit" className="ml-auto" disabled={isSubmitting || (!splitEqually && Math.abs(remainingToAllocate) >= 0.005)}>
              {isSubmitting ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <PlusCircle className="mr-2 h-4 w-4" />
              )}
              {isSubmitting ? "Adding..." : (isOnline ? "Add Expense" : "Save Offline")}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}

