
"use client";

import { useState, useEffect, FormEvent, useCallback } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowLeft, DollarSign as DollarSignIcon, Send, CalendarDays, User, Loader2, AlertTriangle } from 'lucide-react';
import { useUser } from '@/contexts/UserContext';
import type { Group, User as UserType, Balance, Expense } from '@/types';
import { useToast } from "@/hooks/use-toast";
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { format, parseISO } from 'date-fns';
import { useCurrency } from '@/contexts/CurrencyContext';
import { db } from '@/lib/firebase';
import { doc, getDoc, collection, query, getDocs, Timestamp } from 'firebase/firestore';

// Helper to calculate balances (can be moved to utils if used elsewhere)
const calculateGroupBalancesForSettleUp = (groupMembers: UserType[], groupExpenses: Expense[]): Balance[] => {
    if (groupMembers.length === 0) return [];
    const memberBalances: Record<string, { owes: Record<string, number>, owedBy: Record<string, number>, netBalance: number }> = {};
    
    groupMembers.forEach(member => {
        memberBalances[member.id] = { owes: {}, owedBy: {}, netBalance: 0 };
    });

    groupExpenses.forEach(expense => {
        const payerId = expense.paidByUserId;
        if (!memberBalances[payerId] && groupMembers.find(m => m.id === payerId)) {
             memberBalances[payerId] = { owes: {}, owedBy: {}, netBalance: 0 };
        }

        expense.participants.forEach(participant => {
            const debtorId = participant.userId;
            const amountOwedByDebtor = participant.amountOwed;

            if (debtorId === payerId) return; 
            
            if(!memberBalances[debtorId] && groupMembers.find(m => m.id === debtorId)) {
                memberBalances[debtorId] = { owes: {}, owedBy: {}, netBalance: 0 };
            }
            
            if (memberBalances[debtorId] && memberBalances[payerId]) {
                memberBalances[debtorId].owes[payerId] = (memberBalances[debtorId].owes[payerId] || 0) + amountOwedByDebtor;
                memberBalances[debtorId].netBalance -= amountOwedByDebtor;
                memberBalances[payerId].owedBy[debtorId] = (memberBalances[payerId].owedBy[debtorId] || 0) + amountOwedByDebtor;
                memberBalances[payerId].netBalance += amountOwedByDebtor;
            }
        });
    });
    return Object.entries(memberBalances).map(([userId, balanceData]) => ({
        userId,
        ...balanceData
    })).filter(b => groupMembers.some(m => m.id === b.userId));
};


export default function SettleUpPage() {
  const params = useParams();
  const router = useRouter();
  const { currentUser } = useUser();
  const { toast } = useToast();
  const groupId = params.groupId as string;
  const { getCurrencySymbol } = useCurrency();

  const [group, setGroup] = useState<Group | null>(null);
  const [balances, setBalances] = useState<Balance[]>([]);
  const [payerId, setPayerId] = useState<string>('');
  const [payeeId, setPayeeId] = useState<string>('');
  const [amount, setAmount] = useState<string>('');
  const [paymentDate, setPaymentDate] = useState<Date | undefined>(new Date());
  const [paymentMethod, setPaymentMethod] = useState<string>('');
  const [notes, setNotes] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchGroupAndExpenses = useCallback(async () => {
    if (!currentUser || !groupId) {
      setIsLoading(false);
      if(!currentUser) router.push('/login');
      return;
    }
    setIsLoading(true);
    setError(null);

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
          setError("Access Denied."); // Set error for page display
          setIsLoading(false);
          // router.push('/groups'); // Or let the page show access denied message
          return;
        }
        setGroup(fetchedGroup);
        if (currentUser) setPayerId(currentUser.id);

        // Fetch expenses for this group
        const expensesColRef = collection(db, 'groups', groupId, 'expenses');
        const expensesQuery = query(expensesColRef); // No specific order needed for balance calculation
        const expensesSnapshot = await getDocs(expensesQuery);
        const fetchedExpenses = expensesSnapshot.docs.map(docSnap => {
            const data = docSnap.data();
            return { 
                id: docSnap.id, 
                ...data,
                date: (data.date instanceof Timestamp ? data.date.toDate().toISOString() : data.date as string),
            } as Expense;
        });
        
        const calculatedBalances = calculateGroupBalancesForSettleUp(fetchedGroup.members, fetchedExpenses);
        setBalances(calculatedBalances);
        
      } else {
        toast({ title: "Group not found", variant: "destructive" });
        setError("Group not found.");
        // router.push('/groups');
      }
    } catch (err) {
      console.error("Error fetching data for settle up:", err);
      toast({ title: "Error", description: "Could not load group data.", variant: "destructive" });
      setError("Could not load data.");
    } finally {
      setIsLoading(false);
    }
  }, [groupId, currentUser, router, toast]);
  
  useEffect(() => {
    fetchGroupAndExpenses();
  }, [fetchGroupAndExpenses]);
  
  useEffect(() => {
    if (payerId && balances.length > 0 && group) {
      const payerBalance = balances.find(b => b.userId === payerId);
      if (payerBalance && payerBalance.netBalance < -0.005) { // Payer owes money
        const owesMostEntry = Object.entries(payerBalance.owes)
                                    .filter(([,owedAmount]) => owedAmount > 0.005) // filter out negligible amounts
                                    .sort(([,a],[,b]) => b - a)[0]; // who they owe the most
        if (owesMostEntry) {
          const suggestedPayeeId = owesMostEntry[0];
          // Ensure suggested payee is actually a member of the current group and not the payer
          if (group.members.some(m => m.id === suggestedPayeeId) && suggestedPayeeId !== payerId) {
            setPayeeId(suggestedPayeeId);
            setAmount(owesMostEntry[1].toFixed(2));
          } else {
            setPayeeId(''); // Clear if no valid suggestion
            setAmount('');
          }
        } else {
          setPayeeId('');
          setAmount('');
        }
      } else {
        // Payer is owed or settled, clear suggestions or suggest paying someone they are owed by if that's desired
        setPayeeId('');
        setAmount('');
      }
    }
  }, [payerId, balances, group]);


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
          {error === "Access Denied." ? "You are not a member of this group." : "Could not load data for settling up."}
        </p>
        <Button asChild>
          <Link href={`/groups/${groupId}`}>Back to Group</Link>
        </Button>
      </div>
    );
  }
  
  if (!currentUser || !group) { // Should be caught by isLoading or error, but good to have
    return <p>Loading or an error occurred...</p>;
  }


  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    if (!payerId || !payeeId || !amount || parseFloat(amount) <= 0 || !paymentDate || !paymentMethod) {
      toast({ title: "Missing Information", description: "Please fill all required fields for the payment.", variant: "destructive" });
      return;
    }
    if (payerId === payeeId) {
      toast({ title: "Invalid Payment", description: "Payer and payee cannot be the same person.", variant: "destructive" });
      return;
    }

    // TODO: In a real app, send this to Firestore to record the payment
    // This would likely involve creating a new document in a 'payments' subcollection
    // or a specific type of 'activityLog' entry.
    // After successful save, balances would need to be recalculated or adjusted.
    console.log("Submitting payment (mock):", {
      groupId,
      paidByUserId: payerId,
      paidToUserId: payeeId,
      amount: parseFloat(amount),
      date: paymentDate.toISOString(),
      method: paymentMethod,
      notes,
    });

    toast({
      title: "Payment Recorded (Mock)!",
      description: `Payment of ${getCurrencySymbol()}${parseFloat(amount).toFixed(2)} from ${group.members.find(m=>m.id===payerId)?.name} to ${group.members.find(m=>m.id===payeeId)?.name} has been logged. Balance recalculation would happen next.`,
    });
    // Potentially clear form or redirect. For now, just show toast.
    // router.push(`/groups/${groupId}?tab=balances`); // Redirect if payment was real
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
          <CardTitle className="text-2xl">Settle Up in "{group.name}"</CardTitle>
          <CardDescription>Record a payment made to settle debts. Uses Firestore data for suggestions.</CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="payerId">Who Paid?*</Label>
                <Select value={payerId} onValueChange={setPayerId} required>
                  <SelectTrigger id="payerId">
                     <User className="mr-2 h-4 w-4 text-muted-foreground inline-block" /> <SelectValue placeholder="Select payer" />
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
                <Label htmlFor="payeeId">To Whom?*</Label>
                <Select value={payeeId} onValueChange={setPayeeId} required>
                  <SelectTrigger id="payeeId">
                     <User className="mr-2 h-4 w-4 text-muted-foreground inline-block" /> <SelectValue placeholder="Select payee" />
                  </SelectTrigger>
                  <SelectContent>
                    {group.members.filter(m => m.id !== payerId).map(member => ( 
                      <SelectItem key={member.id} value={member.id}>
                        {member.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                    />
                    </div>
                </div>
                 <div>
                    <Label htmlFor="paymentDate">Payment Date*</Label>
                    <Popover>
                        <PopoverTrigger asChild>
                            <Button
                            variant={"outline"}
                            className="w-full justify-start text-left font-normal"
                            >
                            <CalendarDays className="mr-2 h-4 w-4" />
                            {paymentDate ? format(paymentDate, "PPP") : <span>Pick a date</span>}
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0">
                            <Calendar
                            mode="single"
                            selected={paymentDate}
                            onSelect={setPaymentDate}
                            initialFocus
                            />
                        </PopoverContent>
                    </Popover>
                </div>
            </div>

            <div>
              <Label htmlFor="paymentMethod">Payment Method*</Label>
              <Select value={paymentMethod} onValueChange={setPaymentMethod} required>
                <SelectTrigger id="paymentMethod">
                  <SelectValue placeholder="Select method (e.g., Cash, UPI)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="cash">Cash</SelectItem>
                  <SelectItem value="upi">UPI / Digital Wallet</SelectItem>
                  <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label htmlFor="notes">Notes (Optional)</Label>
              <Input
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="e.g., Settled for dinner, Reimbursement"
              />
            </div>
            {payeeId && parseFloat(amount) > 0 && (
              <p className="text-sm text-muted-foreground">
                You are about to record a payment of <span className="font-semibold">{getCurrencySymbol()}{parseFloat(amount).toFixed(2)}</span> from <span className="font-semibold">{group.members.find(m => m.id === payerId)?.name || 'Payer'}</span> to <span className="font-semibold">{group.members.find(m => m.id === payeeId)?.name || 'Payee'}</span>.
              </p>
            )}
          </CardContent>
          <CardFooter className="border-t px-6 py-4">
            <Button type="submit" className="ml-auto" disabled={!payerId || !payeeId || !amount || parseFloat(amount) <= 0}>
              <Send className="mr-2 h-4 w-4" /> Record Payment
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}

    