"use client";

import { useState, useEffect, FormEvent } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowLeft, DollarSign, Send, CalendarDays, User } from 'lucide-react';
import { useUser } from '@/contexts/UserContext';
import { mockGroups, mockUsers, mockBalancesGroup1 } from '@/data/mock';
import type { Group, User as UserType, Balance } from '@/types';
import { useToast } from "@/hooks/use-toast";
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { format } from 'date-fns';

export default function SettleUpPage() {
  const params = useParams();
  const router = useRouter();
  const { currentUser } = useUser();
  const { toast } = useToast();
  const groupId = params.groupId as string;

  const [group, setGroup] = useState<Group | null>(null);
  const [balances, setBalances] = useState<Balance[]>([]);
  const [payerId, setPayerId] = useState<string>('');
  const [payeeId, setPayeeId] = useState<string>('');
  const [amount, setAmount] = useState<string>('');
  const [paymentDate, setPaymentDate] = useState<Date | undefined>(new Date());
  const [paymentMethod, setPaymentMethod] = useState<string>('');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    const foundGroup = mockGroups.find(g => g.id === groupId);
    if (foundGroup) {
      if (!currentUser || !foundGroup.members.find(m => m.id === currentUser.id)) {
        toast({ title: "Access Denied", description: "You are not a member of this group.", variant: "destructive" });
        router.push('/groups');
        return;
      }
      setGroup(foundGroup);
      if (currentUser) setPayerId(currentUser.id);
      // Load balances for suggestions (using mock for group1)
      if (groupId === 'group1') {
        setBalances(mockBalancesGroup1);
      }
    } else {
      toast({ title: "Group not found", variant: "destructive" });
      router.push('/groups');
    }
  }, [groupId, router, currentUser, toast]);
  
  useEffect(() => {
    // Suggest payee and amount if payer is selected and balances are available
    if (payerId && balances.length > 0) {
      const payerBalance = balances.find(b => b.userId === payerId);
      if (payerBalance) {
        // Find who the payer owes the most to
        const owesMostEntry = Object.entries(payerBalance.owes)
                                    .sort(([,a],[,b]) => b - a)[0];
        if (owesMostEntry) {
          setPayeeId(owesMostEntry[0]);
          setAmount(owesMostEntry[1].toFixed(2));
        } else {
          // Payer doesn't owe anyone, perhaps they are owed. Clear suggestions.
          setPayeeId('');
          setAmount('');
        }
      }
    }
  }, [payerId, balances]);

  if (!currentUser || !group) {
    return <p>Loading...</p>;
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

    // In a real app, send this to an API
    console.log({
      groupId,
      paidByUserId: payerId,
      paidToUserId: payeeId,
      amount: parseFloat(amount),
      date: paymentDate.toISOString(),
      method: paymentMethod,
      notes,
    });

    toast({
      title: "Payment Recorded!",
      description: `Payment of $${parseFloat(amount).toFixed(2)} from ${group.members.find(m=>m.id===payerId)?.name} to ${group.members.find(m=>m.id===payeeId)?.name} has been recorded.`,
    });
    router.push(`/groups/${groupId}?tab=balances`);
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
          <CardDescription>Record a payment made to settle debts.</CardDescription>
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
                    {group.members.filter(m => m.id !== payerId).map(member => ( // Exclude payer from payee list
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
                    <DollarSign className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                        id="amount"
                        type="number"
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                        placeholder="0.00"
                        className="pl-8"
                        required
                        step="0.01"
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
                  <SelectItem value="upi">UPI</SelectItem>
                  <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                  <SelectItem value="paypal">PayPal</SelectItem>
                  <SelectItem value="venmo">Venmo</SelectItem>
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
                placeholder="e.g., Settled for dinner, Train ticket reimbursement"
              />
            </div>
          </CardContent>
          <CardFooter className="border-t px-6 py-4">
            <Button type="submit" className="ml-auto">
              <Send className="mr-2 h-4 w-4" /> Record Payment
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
