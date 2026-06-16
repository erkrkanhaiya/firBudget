
"use client";

import React, { useState, useEffect, FormEvent, ChangeEvent, useCallback } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { ArrowLeft, Save, CalendarDays, User, Info, Loader2, XCircle, Image as ImageIconLucide } from 'lucide-react';
import NextImage from 'next/image';
import { useUser } from '@/contexts/UserContext';
import type { Group, Expense, ExpenseParticipant, ActivityLog } from '@/types';
import { useToast } from "@/hooks/use-toast";
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { format, parseISO } from 'date-fns';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useCurrency } from '@/contexts/CurrencyContext';
import { db, storage } from '@/lib/firebase';
import { doc, getDoc, collection, serverTimestamp, Timestamp, writeBatch, type DocumentData } from 'firebase/firestore';
import { ref as storageRef, uploadBytesResumable, getDownloadURL } from "firebase/storage";
import { useNotification } from '@/contexts/NotificationContext';
import {
  buildExpenseParticipants,
  isEqualSplit,
  summarizeExpenseChanges,
} from '@/lib/expense-utils';

export default function EditExpensePage() {
  const params = useParams();
  const router = useRouter();
  const { currentUser } = useUser();
  const { toast } = useToast();
  const groupId = params.groupId as string;
  const expenseId = params.expenseId as string;
  const { getCurrencySymbol } = useCurrency();
  const { addNotification } = useNotification();

  const [group, setGroup] = useState<Group | null>(null);
  const [originalExpense, setOriginalExpense] = useState<Expense | null>(null);
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState<string>('');
  const [paidByUserId, setPaidByUserId] = useState<string>('');
  const [expenseDate, setExpenseDate] = useState<Date | undefined>(undefined);
  const [selectedParticipantIds, setSelectedParticipantIds] = useState<string[]>([]);
  const [splitEqually, setSplitEqually] = useState(true);
  const [customSplitAmounts, setCustomSplitAmounts] = useState<Record<string, string>>({});

  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [receiptPreviewUrl, setReceiptPreviewUrl] = useState<string | null>(null);
  const [existingReceiptUrl, setExistingReceiptUrl] = useState<string | undefined>();
  const [existingReceiptFileName, setExistingReceiptFileName] = useState<string | undefined>();

  const [sumOfCustomShares, setSumOfCustomShares] = useState<number>(0);
  const [remainingToAllocate, setRemainingToAllocate] = useState<number>(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const memberNameLookup = useCallback(
    (userId: string) => group?.members.find((m) => m.id === userId)?.name ?? undefined,
    [group]
  );

  useEffect(() => {
    const fetchData = async () => {
      if (!currentUser || !groupId || !expenseId) {
        setIsLoading(false);
        if (!currentUser) router.push('/login');
        return;
      }

      setIsLoading(true);
      try {
        const groupDocRef = doc(db, 'groups', groupId);
        const groupDocSnap = await getDoc(groupDocRef);
        if (!groupDocSnap.exists()) {
          toast({ title: "Group not found", variant: "destructive" });
          router.push('/groups');
          return;
        }

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

        const expenseDocRef = doc(db, 'groups', groupId, 'expenses', expenseId);
        const expenseDocSnap = await getDoc(expenseDocRef);
        if (!expenseDocSnap.exists()) {
          toast({ title: "Expense not found", variant: "destructive" });
          router.push(`/groups/${groupId}?tab=expenses`);
          return;
        }

        const expenseData = expenseDocSnap.data();
        const fetchedExpense: Expense = {
          id: expenseDocSnap.id,
          groupId,
          description: expenseData.description,
          amount: expenseData.amount,
          paidByUserId: expenseData.paidByUserId,
          date: expenseData.date instanceof Timestamp
            ? expenseData.date.toDate().toISOString()
            : String(expenseData.date),
          participants: expenseData.participants || [],
          createdAt: expenseData.createdAt instanceof Timestamp
            ? expenseData.createdAt.toDate().toISOString()
            : new Date().toISOString(),
          receiptUrl: expenseData.receiptUrl,
          receiptFileName: expenseData.receiptFileName,
        };

        setGroup(fetchedGroup);
        setOriginalExpense(fetchedExpense);
        setDescription(fetchedExpense.description);
        setAmount(fetchedExpense.amount.toString());
        setPaidByUserId(fetchedExpense.paidByUserId);
        setExpenseDate(parseISO(fetchedExpense.date));

        const participantIds = fetchedExpense.participants.map((p) => p.userId);
        setSelectedParticipantIds(participantIds);

        const equallySplit = isEqualSplit(fetchedExpense.participants);
        setSplitEqually(equallySplit);

        const customAmounts: Record<string, string> = {};
        fetchedGroup.members.forEach((member) => {
          const participant = fetchedExpense.participants.find((p) => p.userId === member.id);
          customAmounts[member.id] = participant ? participant.amountOwed.toFixed(2) : '';
        });
        setCustomSplitAmounts(customAmounts);

        setExistingReceiptUrl(fetchedExpense.receiptUrl);
        setExistingReceiptFileName(fetchedExpense.receiptFileName);
        setReceiptPreviewUrl(fetchedExpense.receiptUrl ?? null);
      } catch (error) {
        console.error("Error loading expense:", error);
        toast({ title: "Error", description: "Could not load expense details.", variant: "destructive" });
        router.push(`/groups/${groupId}?tab=expenses`);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [groupId, expenseId, currentUser, router, toast]);

  useEffect(() => {
    if (!splitEqually) {
      const currentTotalAmount = parseFloat(amount) || 0;
      let sum = 0;
      selectedParticipantIds.forEach((pId) => {
        sum += parseFloat(customSplitAmounts[pId]) || 0;
      });
      setSumOfCustomShares(parseFloat(sum.toFixed(2)));
      setRemainingToAllocate(parseFloat((currentTotalAmount - sum).toFixed(2)));
    } else {
      setSumOfCustomShares(parseFloat(amount) || 0);
      setRemainingToAllocate(0);
    }
  }, [customSplitAmounts, amount, selectedParticipantIds, splitEqually]);

  if (isLoading || !currentUser || !group || !originalExpense) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-10rem)]">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="ml-4 text-muted-foreground">Loading expense...</p>
      </div>
    );
  }

  const handleParticipantChange = (userId: string, isChecked: boolean) => {
    setSelectedParticipantIds((prev) => {
      const newParticipants = isChecked ? [...prev, userId] : prev.filter((id) => id !== userId);
      if (!splitEqually) {
        setCustomSplitAmounts((currentAmounts) => {
          const updatedAmounts = { ...currentAmounts };
          if (!isChecked) updatedAmounts[userId] = '';
          else if (!(userId in updatedAmounts)) updatedAmounts[userId] = '';
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
      selectedParticipantIds.forEach((pid) => {
        initialAmounts[pid] = customSplitAmounts[pid] || '';
      });
      setCustomSplitAmounts(initialAmounts);
    }
  };

  const handleCustomSplitAmountChange = (userId: string, value: string) => {
    if (/^\d*(\.\d{0,2})?$/.test(value) || value === '') {
      setCustomSplitAmounts((prev) => ({ ...prev, [userId]: value }));
    }
  };

  const handleReceiptFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0]) {
      const file = event.target.files[0];
      if (file.size > 5 * 1024 * 1024) {
        toast({ title: "File too large", description: "Receipt image cannot exceed 5MB.", variant: "destructive" });
        event.target.value = "";
        return;
      }
      if (!file.type.startsWith("image/")) {
        toast({ title: "Invalid File Type", description: "Only image files are accepted.", variant: "destructive" });
        event.target.value = "";
        return;
      }
      setReceiptFile(file);
      const reader = new FileReader();
      reader.onloadend = () => setReceiptPreviewUrl(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const removeReceiptFile = () => {
    setReceiptFile(null);
    setReceiptPreviewUrl(existingReceiptUrl ?? null);
    const fileInput = document.getElementById('receipt') as HTMLInputElement;
    if (fileInput) fileInput.value = "";
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setIsSubmitting(true);

    try {
      if (!description.trim() || !amount || parseFloat(amount) <= 0 || !paidByUserId || selectedParticipantIds.length === 0 || !expenseDate) {
        toast({ title: "Missing Information", description: "Please fill all required fields.", variant: "destructive" });
        return;
      }

      const numericAmount = parseFloat(amount);
      const participantResult = buildExpenseParticipants(
        numericAmount,
        selectedParticipantIds,
        splitEqually,
        customSplitAmounts,
        memberNameLookup
      );

      if ('error' in participantResult) {
        toast({
          title: splitEqually ? "Split Error" : "Custom Split Mismatch",
          description: participantResult.error,
          variant: "destructive",
        });
        return;
      }

      const expenseParticipants: ExpenseParticipant[] = participantResult.participants;
      const expenseDateIso = expenseDate.toISOString();

      let receiptUrlToStore = existingReceiptUrl;
      let receiptFileNameToStore = existingReceiptFileName;

      if (receiptFile) {
        try {
          const filePath = `receipts/${groupId}/${expenseId}/${receiptFile.name}`;
          const fileStorageRef = storageRef(storage, filePath);
          const uploadTask = uploadBytesResumable(fileStorageRef, receiptFile);
          await uploadTask;
          receiptFileNameToStore = receiptFile.name;
          receiptUrlToStore = await getDownloadURL(uploadTask.snapshot.ref);
        } catch (uploadError) {
          console.error("Receipt upload failed:", uploadError);
          toast({ title: "Receipt Upload Failed", description: "Expense will be saved without updating the receipt.", variant: "destructive" });
        }
      }

      const updatePayload: DocumentData = {
        description: description.trim(),
        amount: numericAmount,
        paidByUserId,
        date: expenseDateIso,
        participants: expenseParticipants,
        updatedAt: serverTimestamp(),
      };

      if (receiptUrlToStore) updatePayload.receiptUrl = receiptUrlToStore;
      if (receiptFileNameToStore) updatePayload.receiptFileName = receiptFileNameToStore;

      const changeSummary = summarizeExpenseChanges(
        {
          description: originalExpense.description,
          amount: originalExpense.amount,
          paidByUserId: originalExpense.paidByUserId,
          date: originalExpense.date,
          participantIds: originalExpense.participants.map((p) => p.userId),
        },
        {
          description: description.trim(),
          amount: numericAmount,
          paidByUserId,
          date: expenseDateIso,
          participantIds: selectedParticipantIds,
        },
        memberNameLookup
      );

      const actorName = currentUser.name || 'User';
      const activityLog: Omit<ActivityLog, 'id' | 'timestamp'> = {
        groupId,
        userId: currentUser.id,
        actionType: 'expense_edited',
        description: `${actorName} edited expense "${description.trim()}": ${changeSummary}`,
        relatedExpenseId: expenseId,
        actorName,
      };

      const batch = writeBatch(db);
      batch.update(doc(db, 'groups', groupId, 'expenses', expenseId), updatePayload);
      batch.set(doc(collection(db, 'groups', groupId, 'activityLog')), {
        ...activityLog,
        timestamp: serverTimestamp(),
      });
      await batch.commit();

      addNotification({
        title: "Expense Updated",
        message: `"${description.trim()}" was updated in group "${group.name}".`,
        type: "success",
        href: `/groups/${groupId}?tab=expenses`,
      });

      toast({ title: "Expense Updated", description: "Changes saved. Balances will reflect the updated amounts." });
      router.push(`/groups/${groupId}?refresh=${Date.now()}&tab=expenses`);
    } catch (error) {
      console.error("Error updating expense:", error);
      toast({ title: "Update Failed", description: "Could not save changes. Please try again.", variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-xl mx-auto">
      <Button variant="outline" size="sm" asChild className="mb-4">
        <Link href={`/groups/${groupId}?tab=expenses`}><ArrowLeft className="mr-2 h-4 w-4" />Back to Expenses</Link>
      </Button>
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">Edit Expense</CardTitle>
          <CardDescription>Update expense details for &quot;{group.name}&quot;. Balances recalculate automatically.</CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-6">
            <div>
              <Label htmlFor="receipt">Receipt (Optional)</Label>
              <Input
                id="receipt"
                type="file"
                accept="image/*"
                onChange={handleReceiptFileChange}
                disabled={isSubmitting}
                className="file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-primary/10 file:text-primary hover:file:bg-primary/20"
              />
              {(receiptPreviewUrl || existingReceiptFileName) && (
                <div className="mt-2 p-2 border rounded-md bg-muted/50">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-sm">
                      {receiptPreviewUrl ? (
                        <NextImage src={receiptPreviewUrl} alt="Receipt preview" width={32} height={32} className="h-8 w-8 object-cover rounded" />
                      ) : (
                        <ImageIconLucide className="h-5 w-5 text-muted-foreground" />
                      )}
                      <span className="truncate max-w-[200px]">{receiptFile?.name || existingReceiptFileName}</span>
                    </div>
                    {receiptFile && (
                      <Button type="button" variant="ghost" size="icon" onClick={removeReceiptFile} disabled={isSubmitting} className="h-7 w-7">
                        <XCircle className="h-4 w-4 text-destructive" />
                      </Button>
                    )}
                  </div>
                </div>
              )}
            </div>

            <div>
              <Label htmlFor="description">Description*</Label>
              <Input id="description" value={description} onChange={(e) => setDescription(e.target.value)} required disabled={isSubmitting} />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="amount">Amount*</Label>
                <div className="relative">
                  <span className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground">{getCurrencySymbol()}</span>
                  <Input id="amount" type="number" value={amount} onChange={(e) => setAmount(e.target.value)} className="pl-8" required step="0.01" min="0.01" disabled={isSubmitting} />
                </div>
              </div>
              <div>
                <Label htmlFor="expenseDate">Date*</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full justify-start text-left font-normal" disabled={isSubmitting}>
                      <CalendarDays className="mr-2 h-4 w-4" />
                      {expenseDate ? format(expenseDate, "PPP") : <span>Pick a date</span>}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar mode="single" selected={expenseDate} onSelect={setExpenseDate} initialFocus disabled={isSubmitting} />
                  </PopoverContent>
                </Popover>
              </div>
            </div>

            <div>
              <Label htmlFor="paidBy">Paid by*</Label>
              <Select value={paidByUserId} onValueChange={setPaidByUserId} required disabled={isSubmitting}>
                <SelectTrigger id="paidBy">
                  <User className="mr-2 h-4 w-4 text-muted-foreground inline-block" />
                  <SelectValue placeholder="Select who paid" />
                </SelectTrigger>
                <SelectContent>
                  {group.members.map((member) => (
                    <SelectItem key={member.id} value={member.id}>
                      {member.name} {member.id === currentUser.id && "(You)"}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Participants*</Label>
              <div className="space-y-2 max-h-48 overflow-y-auto border p-3 rounded-md mt-2">
                {group.members.map((member) => (
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
              <Checkbox id="splitEqually" checked={splitEqually} onCheckedChange={(checked) => handleSplitEquallyChange(Boolean(checked))} disabled={isSubmitting} />
              <Label htmlFor="splitEqually" className="font-normal">Split equally</Label>
            </div>

            {!splitEqually && selectedParticipantIds.length > 0 && (
              <Card className="p-4 space-y-4 bg-muted/50">
                <h4 className="font-medium">Custom Split by Amount</h4>
                {selectedParticipantIds.map((participantId) => {
                  const member = group.members.find((m) => m.id === participantId);
                  return (
                    <div key={participantId} className="grid grid-cols-3 items-center gap-2">
                      <Label htmlFor={`custom-amount-${participantId}`} className="col-span-1 truncate">
                        {member?.name}
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
                <Alert variant={Math.abs(remainingToAllocate) < 0.005 ? "default" : "destructive"}>
                  <Info className="h-4 w-4" />
                  <AlertTitle>{Math.abs(remainingToAllocate) < 0.005 ? "Amounts Match Total" : "Amounts Review"}</AlertTitle>
                  <AlertDescription className="text-xs space-y-0.5">
                    <p>Total Expense: {getCurrencySymbol()}{(parseFloat(amount) || 0).toFixed(2)}</p>
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
              {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
              {isSubmitting ? "Saving..." : "Save Changes"}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
