
"use client";

import { useState, useEffect, FormEvent, useCallback } from 'react';
import Link from 'next/link';
import { useParams, useRouter, useSearchParams } from 'next/navigation'; // Import useSearchParams
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowLeft, DollarSign as DollarSignIcon, Send, CalendarDays, User, Loader2, AlertTriangle } from 'lucide-react';
import { useUser } from '@/contexts/UserContext';
import type { Group, User as UserType, Balance, Expense, Payment, ActivityLog } from '@/types';
import { useToast } from "@/hooks/use-toast";
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { format, parseISO } from 'date-fns';
import { useCurrency } from '@/contexts/CurrencyContext';
import { db } from '@/lib/firebase';
import { doc, getDoc, collection, query, getDocs, Timestamp, addDoc, writeBatch, serverTimestamp } from 'firebase/firestore';
import { useNotification } from '@/contexts/NotificationContext';

// Helper to calculate balances considering expenses and payments
const calculateBalancesWithPayments = (groupMembers: UserType[], expenses: Expense[], payments: Payment[]): Balance[] => {
    if (groupMembers.length === 0) return [];
    const memberBalances: Record<string, { owes: Record<string, number>, owedBy: Record<string, number>, netBalance: number }> = {};

    groupMembers.forEach(member => {
        memberBalances[member.id] = { owes: {}, owedBy: {}, netBalance: 0 };
    });

    // Process expenses
    expenses.forEach(expense => {
        const payerId = expense.paidByUserId;
        if (!memberBalances[payerId] && groupMembers.some(m => m.id === payerId)) {
            memberBalances[payerId] = { owes: {}, owedBy: {}, netBalance: 0 };
        }
        expense.participants.forEach(participant => {
            const debtorId = participant.userId;
            const amountOwedByDebtor = participant.amountOwed;
            if (debtorId === payerId) return;
            if (memberBalances[debtorId] && memberBalances[payerId]) {
                memberBalances[debtorId].owes[payerId] = (memberBalances[debtorId].owes[payerId] || 0) + amountOwedByDebtor;
                memberBalances[debtorId].netBalance -= amountOwedByDebtor;
                memberBalances[payerId].owedBy[debtorId] = (memberBalances[payerId].owedBy[debtorId] || 0) + amountOwedByDebtor;
                memberBalances[payerId].netBalance += amountOwedByDebtor;
            }
        });
    });

    // Process payments
    payments.forEach(payment => {
        const payerId = payment.paidByUserId;
        const payeeId = payment.paidToUserId;
        const amount = payment.amount;

        if (memberBalances[payerId] && memberBalances[payeeId]) {
            memberBalances[payerId].owes[payeeId] = (memberBalances[payerId].owes[payeeId] || 0) - amount;
            memberBalances[payerId].netBalance += amount; 

            memberBalances[payeeId].owedBy[payerId] = (memberBalances[payeeId].owedBy[payerId] || 0) - amount;
            memberBalances[payeeId].netBalance -= amount; 
        }
    });

    return Object.entries(memberBalances).map(([userId, balanceData]) => ({
        userId,
        ...balanceData
    })).filter(b => groupMembers.some(m => m.id === b.userId));
};


export default function SettleUpPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams(); 
  const { currentUser } = useUser();
  const { toast } = useToast();
  const { addNotification } = useNotification();
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
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchGroupDataForSettlement = useCallback(async () => {
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
          setError("Access Denied.");
          setIsLoading(false);
          return;
        }
        setGroup(fetchedGroup);
        
        const queryPayerId = searchParams.get('payerId');
        const queryPayeeId = searchParams.get('payeeId');
        const queryAmount = searchParams.get('amount');

        if (queryPayerId && fetchedGroup.members.some(m => m.id === queryPayerId)) {
            setPayerId(queryPayerId);
        } else if (currentUser && !payerId) { // Only set to current user if not pre-filled
            setPayerId(currentUser.id);
        }

        if (queryPayeeId && fetchedGroup.members.some(m => m.id === queryPayeeId)) {
            setPayeeId(queryPayeeId);
        }
        if (queryAmount && !isNaN(parseFloat(queryAmount))) {
            setAmount(parseFloat(queryAmount).toFixed(2));
        }


        const expensesColRef = collection(db, 'groups', groupId, 'expenses');
        const expensesQuery = query(expensesColRef);
        const expensesSnapshot = await getDocs(expensesQuery);
        const fetchedExpenses = expensesSnapshot.docs.map(docSnap => {
            const data = docSnap.data();
            return { 
                id: docSnap.id, 
                ...data,
                date: (data.date instanceof Timestamp ? data.date.toDate().toISOString() : data.date as string),
                 createdAt: (data.createdAt instanceof Timestamp ? data.createdAt.toDate().toISOString() : new Date().toISOString()),
            } as Expense;
        });
        
        const paymentsColRef = collection(db, 'groups', groupId, 'payments');
        const paymentsQuery = query(paymentsColRef);
        const paymentsSnapshot = await getDocs(paymentsQuery);
        const fetchedPayments = paymentsSnapshot.docs.map(docSnap => {
            const data = docSnap.data();
            return {
                id: docSnap.id,
                ...data,
                date: (data.date instanceof Timestamp ? data.date.toDate().toISOString() : data.date as string),
                createdAt: (data.createdAt instanceof Timestamp ? data.createdAt.toDate().toISOString() : new Date().toISOString()),
            } as Payment;
        });
        
        const calculatedBalances = calculateBalancesWithPayments(fetchedGroup.members, fetchedExpenses, fetchedPayments);
        setBalances(calculatedBalances);
        
      } else {
        toast({ title: "Group not found", variant: "destructive" });
        setError("Group not found.");
      }
    } catch (err) {
      console.error("Error fetching data for settle up:", err);
      toast({ title: "Error", description: "Could not load group data.", variant: "destructive" });
      setError("Could not load data.");
    } finally {
      setIsLoading(false);
    }
  }, [groupId, currentUser, router, toast, searchParams, payerId]); 
  
  useEffect(() => {
    fetchGroupDataForSettlement();
  }, [fetchGroupDataForSettlement]);
  
  useEffect(() => {
    const queryPayeeId = searchParams.get('payeeId');
    const queryAmount = searchParams.get('amount');

    if (payerId && balances.length > 0 && group && !queryPayeeId && !queryAmount) {
      const payerBalance = balances.find(b => b.userId === payerId);
      if (payerBalance && payerBalance.netBalance < -0.005) { 
        const owesMostEntry = Object.entries(payerBalance.owes)
                                    .filter(([, owedAmount]) => owedAmount > 0.005)
                                    .sort(([,a],[,b]) => b - a)[0];
        if (owesMostEntry) {
          const suggestedPayeeId = owesMostEntry[0];
          if (group.members.some(m => m.id === suggestedPayeeId) && suggestedPayeeId !== payerId) {
            setPayeeId(suggestedPayeeId);
            setAmount(Math.min(owesMostEntry[1], Math.abs(payerBalance.netBalance)).toFixed(2));
          } else {
            setPayeeId('');
            setAmount('');
          }
        } else {
          setPayeeId('');
          setAmount('');
        }
      } else {
        setPayeeId('');
        setAmount('');
      }
    }
  }, [payerId, balances, group, searchParams]); 


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
  
  if (!currentUser || !group) {
    return <p className="text-center p-4">Loading group data or an error occurred...</p>;
  }


  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!payerId || !payeeId || !amount || parseFloat(amount) <= 0 || !paymentDate || !paymentMethod) {
      toast({ title: "Missing Information", description: "Please fill all required fields for the payment.", variant: "destructive" });
      return;
    }
    if (payerId === payeeId) {
      toast({ title: "Invalid Payment", description: "Payer and payee cannot be the same person.", variant: "destructive" });
      return;
    }

    setIsSubmitting(true);
    const numericAmount = parseFloat(amount);
    const payerUser = group.members.find(m => m.id === payerId);
    const payeeUser = group.members.find(m => m.id === payeeId);

    if (!payerUser || !payeeUser) {
        toast({ title: "User Not Found", description: "Payer or payee could not be identified in the group.", variant: "destructive"});
        setIsSubmitting(false);
        return;
    }

    const paymentForFirestore: Omit<Payment, 'id' | 'createdAt'> = {
      groupId,
      paidByUserId: payerId,
      paidToUserId: payeeId,
      amount: numericAmount,
      date: paymentDate.toISOString(),
      method: paymentMethod as Payment['method'],
      notes: notes.trim(),
    };

    const activityLogForFirestore: Omit<ActivityLog, 'id' | 'timestamp'> = {
      groupId,
      userId: payerId, 
      actionType: 'payment_recorded',
      description: `${payerUser.name || 'User'} paid ${getCurrencySymbol()}${numericAmount.toFixed(2)} to ${payeeUser.name || 'User'} via ${paymentMethod}. ${notes.trim() ? `Notes: ${notes.trim()}` : ''}`,
      relatedPaymentId: '', 
      actorName: payerUser.name,
    };
    
    try {
        const batch = writeBatch(db);
        
        const paymentsColRef = collection(db, 'groups', groupId, 'payments');
        const newPaymentDocRef = doc(paymentsColRef); 
        activityLogForFirestore.relatedPaymentId = newPaymentDocRef.id; 

        batch.set(newPaymentDocRef, { ...paymentForFirestore, createdAt: serverTimestamp() });
        
        const activityLogColRef = collection(db, 'groups', groupId, 'activityLog');
        batch.set(doc(activityLogColRef), { ...activityLogForFirestore, timestamp: serverTimestamp() });
        
        await batch.commit();

      toast({
        title: "Payment Recorded!",
        description: `Payment of ${getCurrencySymbol()}${numericAmount.toFixed(2)} from ${payerUser.name} to ${payeeUser.name} has been saved to Firestore.`,
      });
      addNotification({
          title: "Payment Recorded",
          message: `You recorded a payment from ${payerUser.name} to ${payeeUser.name} in group "${group.name}".`,
          type: "success",
          href: `/groups/${groupId}?tab=balances`
      });
      
      // Clear specific query params after successful submission
      const currentUrl = new URL(window.location.href);
      const currentPath = currentUrl.pathname;
      const existingParams = new URLSearchParams(currentUrl.search);
      existingParams.delete('payerId');
      existingParams.delete('payeeId');
      existingParams.delete('amount');
      const newSearch = existingParams.toString() ? `?${existingParams.toString()}` : '';
      
      // Use router.replace to avoid adding to history stack
      router.replace(`${currentPath}${newSearch}`, { scroll: false });

      router.push(`/groups/${groupId}?refresh=${Date.now()}&tab=balances`);
    } catch (error) {
        console.error("Error recording payment:", error);
        toast({ title: "Error", description: "Could not record payment to Firestore.", variant: "destructive" });
        addNotification({
          title: "Payment Record Failed",
          message: `Failed to record payment in group "${group.name}".`,
          type: "destructive",
      });
    } finally {
        setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-xl mx-auto">
      <Button variant="outline" size="sm" asChild className="mb-4">
        <Link href={`/groups/${groupId}?tab=balances`}>
          <ArrowLeft className="mr-2 h-4 w-4" /> Back to Group Balances
        </Link>
      </Button>
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">Settle Up in "{group.name}"</CardTitle>
          <CardDescription>Record a payment made to settle debts. Uses Firestore data for suggestions. This will update group balances.</CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="payerId">Who Paid?*</Label>
                <Select value={payerId} onValueChange={setPayerId} required disabled={isSubmitting}>
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
                <Select value={payeeId} onValueChange={setPayeeId} required disabled={isSubmitting}>
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
                        disabled={isSubmitting}
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
                            disabled={isSubmitting}
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
                            disabled={isSubmitting || !paymentDate}
                            />
                        </PopoverContent>
                    </Popover>
                </div>
            </div>

            <div>
              <Label htmlFor="paymentMethod">Payment Method*</Label>
              <Select value={paymentMethod} onValueChange={setPaymentMethod} required disabled={isSubmitting}>
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
                disabled={isSubmitting}
              />
            </div>
            {payeeId && parseFloat(amount) > 0 && group.members.find(m => m.id === payerId) && group.members.find(m => m.id === payeeId) && (
              <p className="text-sm text-muted-foreground">
                You are about to record a payment of <span className="font-semibold">{getCurrencySymbol()}{(parseFloat(amount) || 0).toFixed(2)}</span> from <span className="font-semibold">{group.members.find(m => m.id === payerId)?.name || 'Payer'}</span> to <span className="font-semibold">{group.members.find(m => m.id === payeeId)?.name || 'Payee'}</span>.
              </p>
            )}
          </CardContent>
          <CardFooter className="border-t px-6 py-4">
            <Button type="submit" className="ml-auto" disabled={isSubmitting || !payerId || !payeeId || !amount || parseFloat(amount) <= 0}>
              {isSubmitting ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Send className="mr-2 h-4 w-4" />
              )}
              {isSubmitting ? "Recording..." : "Record Payment"}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}

