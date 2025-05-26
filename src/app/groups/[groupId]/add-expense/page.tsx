"use client";

import { useState, useEffect, FormEvent } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { ArrowLeft, PlusCircle, DollarSign, Users, CalendarDays, User } from 'lucide-react';
import { useUser } from '@/contexts/UserContext';
import { mockGroups, mockUsers } from '@/data/mock';
import type { Group, User as UserType, ExpenseParticipant } from '@/types';
import { useToast } from "@/hooks/use-toast";
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { format } from 'date-fns';

export default function AddExpensePage() {
  const params = useParams();
  const router = useRouter();
  const { currentUser } = useUser();
  const { toast } = useToast();
  const groupId = params.groupId as string;

  const [group, setGroup] = useState<Group | null>(null);
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState<string>('');
  const [paidByUserId, setPaidByUserId] = useState<string>('');
  const [expenseDate, setExpenseDate] = useState<Date | undefined>(new Date());
  const [participants, setParticipants] = useState<string[]>([]); // Array of user IDs
  const [splitEqually, setSplitEqually] = useState(true); // For now, only equal split

  useEffect(() => {
    const foundGroup = mockGroups.find(g => g.id === groupId);
    if (foundGroup) {
      if (!currentUser || !foundGroup.members.find(m => m.id === currentUser.id)) {
         toast({ title: "Access Denied", description: "You are not a member of this group.", variant: "destructive" });
        router.push('/groups');
        return;
      }
      setGroup(foundGroup);
      // Pre-select all members as participants and current user as payer
      setParticipants(foundGroup.members.map(m => m.id));
      if (currentUser) {
        setPaidByUserId(currentUser.id);
      }
    } else {
      toast({ title: "Group not found", variant: "destructive" });
      router.push('/groups');
    }
  }, [groupId, router, currentUser, toast]);

  if (!currentUser || !group) {
    return <p>Loading...</p>;
  }

  const handleParticipantChange = (userId: string) => {
    setParticipants(prev =>
      prev.includes(userId) ? prev.filter(id => id !== userId) : [...prev, userId]
    );
  };

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    if (!description.trim() || !amount || parseFloat(amount) <= 0 || !paidByUserId || participants.length === 0 || !expenseDate) {
      toast({ title: "Missing Information", description: "Please fill all required fields and ensure amount is positive.", variant: "destructive" });
      return;
    }

    const numericAmount = parseFloat(amount);
    const share = numericAmount / participants.length;
    const expenseParticipants: ExpenseParticipant[] = participants.map(userId => ({
      userId,
      amountOwed: share,
    }));

    // In a real app, send this to an API
    console.log({
      groupId,
      description,
      amount: numericAmount,
      paidByUserId,
      date: expenseDate.toISOString(),
      participants: expenseParticipants,
    });

    toast({
      title: "Expense Added!",
      description: `Expense "${description}" for $${numericAmount.toFixed(2)} has been added.`,
    });
    router.push(`/groups/${groupId}`);
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
          <CardDescription>Record a new shared expense for the group.</CardDescription>
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
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
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
                <Label htmlFor="expenseDate">Date*</Label>
                <Popover>
                    <PopoverTrigger asChild>
                        <Button
                        variant={"outline"}
                        className="w-full justify-start text-left font-normal"
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
                        />
                    </PopoverContent>
                </Popover>
              </div>
            </div>
            <div>
              <Label htmlFor="paidBy">Paid by*</Label>
              <Select value={paidByUserId} onValueChange={setPaidByUserId} required>
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
                      checked={participants.includes(member.id)}
                      onCheckedChange={() => handleParticipantChange(member.id)}
                    />
                    <Label htmlFor={`participant-${member.id}`} className="font-normal cursor-pointer">
                      {member.name} {member.id === currentUser.id && "(You)"}
                    </Label>
                  </div>
                ))}
              </div>
            </div>
            {/* Future: Add advanced split options here */}
            <div className="flex items-center space-x-2">
                <Checkbox id="splitEqually" checked={splitEqually} onCheckedChange={(checked) => setSplitEqually(Boolean(checked))} disabled />
                <Label htmlFor="splitEqually" className="font-normal">Split equally (currently only option)</Label>
            </div>

          </CardContent>
          <CardFooter className="border-t px-6 py-4">
            <Button type="submit" className="ml-auto">
              <PlusCircle className="mr-2 h-4 w-4" /> Add Expense
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
