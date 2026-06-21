
"use client";

import React, { useState, useEffect, FormEvent, ChangeEvent, useCallback } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { ArrowLeft, PlusCircle, DollarSign as DollarSignIcon, Users, CalendarDays, User, Info, Loader2, Paperclip, XCircle, Image as ImageIconLucide, Sparkles } from 'lucide-react';
import NextImage from 'next/image';
import { useUser } from '@/contexts/UserContext';
import type { Group, User as UserType, ExpenseParticipant, Expense, ActivityLog } from '@/types';
import { useToast } from "@/hooks/use-toast";
// Removed ToastAction as it's not used directly here anymore for undo
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { format, parseISO } from 'date-fns';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useCurrency } from '@/contexts/CurrencyContext';
import { db, storage } from '@/lib/firebase';
import { loadGroupAsMember } from '@/lib/group-access';
import { doc, getDoc, collection, addDoc, serverTimestamp, Timestamp, writeBatch, type DocumentData, query, where, getDocs, deleteDoc } from 'firebase/firestore';
import { ref as storageRef, uploadBytesResumable, getDownloadURL } from "firebase/storage";
import { useNotification } from '@/contexts/NotificationContext';
import { extractExpenseDetails } from '@/ai/flows/extract-expense-details-flow';
import { buildExpenseParticipants } from '@/lib/expense-utils';

interface StoredExpenseData {
  groupId: string;
  description: string;
  amount: number;
  paidByUserId: string;
  date: string; // ISO string
  participants: ExpenseParticipant[];
  tempId: string; // For UI identification before sync
  actorNameForLog: string | null;
  receiptUrl?: string;
  receiptFileName?: string;
}

export default function AddExpensePage() {
  const params = useParams();
  const router = useRouter();
  const { currentUser } = useUser();
  const { toast } = useToast();
  const groupId = params.groupId as string;
  const { getCurrencySymbol } = useCurrency();
  const { addNotification } = useNotification();

  const [group, setGroup] = useState<Group | null>(null);
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState<string>('');
  const [paidByUserId, setPaidByUserId] = useState<string>('');
  const [expenseDate, setExpenseDate] = useState<Date | undefined>(new Date());
  const [selectedParticipantIds, setSelectedParticipantIds] = useState<string[]>([]);
  const [splitEqually, setSplitEqually] = useState(true);
  const [customSplitAmounts, setCustomSplitAmounts] = useState<Record<string, string>>({});

  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [receiptPreview, setReceiptPreview] = useState<string | null>(null);

  const [sumOfCustomShares, setSumOfCustomShares] = useState<number>(0);
  const [remainingToAllocate, setRemainingToAllocate] = useState<number>(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoadingGroup, setIsLoadingGroup] = useState(true);
  const [isOnline, setIsOnline] = useState(true);

  const [isAiProcessing, setIsAiProcessing] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  // Removed undoTimeoutId as the undo mechanism is moving to the details page

  const resetFormFields = useCallback(() => {
    setDescription('');
    setAmount('');
    setExpenseDate(new Date());
    if (currentUser && group) {
        setPaidByUserId(currentUser.id);
        setSelectedParticipantIds(group.members.map(m => m.id));
        const initialCustomAmounts: Record<string, string> = {};
        group.members.forEach(memberUser => { initialCustomAmounts[memberUser.id] = ''; });
        setCustomSplitAmounts(initialCustomAmounts);
    } else if (currentUser) {
        setPaidByUserId(currentUser.id);
        setSelectedParticipantIds([]);
        setCustomSplitAmounts({});
    }

    setSplitEqually(true);
    setReceiptFile(null);
    setReceiptPreview(null);
    const fileInput = document.getElementById('receipt') as HTMLInputElement;
    if (fileInput) fileInput.value = "";
    setAiError(null);
  }, [currentUser, group]);

  // Removed useEffect for undoTimeoutId cleanup

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
        const { group: fetchedGroup, denied } = await loadGroupAsMember(groupId, currentUser);

        if (denied || !fetchedGroup) {
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
            const newExpenseDocRef = doc(expenseColRef);

            const expenseDataForFirestore: DocumentData = {
              groupId: storedExp.groupId,
              description: storedExp.description,
              amount: storedExp.amount,
              paidByUserId: storedExp.paidByUserId,
              date: storedExp.date,
              participants: storedExp.participants,
              createdAt: serverTimestamp(),
            };
            
            if (storedExp.receiptFileName) {
              expenseDataForFirestore.receiptFileName = storedExp.receiptFileName;
            }
            if (storedExp.receiptUrl) {
              expenseDataForFirestore.receiptUrl = storedExp.receiptUrl;
            }

            batch.set(newExpenseDocRef, expenseDataForFirestore);

            const activityLogColRef = collection(db, 'groups', storedExp.groupId, 'activityLog');
            const activityLogForFirestore: Omit<ActivityLog, 'id' | 'timestamp'> = {
              groupId: storedExp.groupId,
              userId: storedExp.paidByUserId,
              actionType: 'expense_added',
              description: `${storedExp.actorNameForLog || 'User'} added expense: ${storedExp.description} (synced from offline)`,
              relatedExpenseId: newExpenseDocRef.id,
            };
            batch.set(doc(activityLogColRef), { ...activityLogForFirestore, timestamp: serverTimestamp() });
            syncedCount++;

            addNotification({
              title: "Offline Expense Synced",
              message: `Expense "${storedExp.description}" for group "${group.name}" submitted.`,
              type: "success",
              href: `/groups/${storedExp.groupId}`,
            });
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
             router.refresh();
          } catch (error) {
            console.error("Error syncing expenses to Firestore:", error);
            toast({ title: "Sync Error", description: "Some offline expenses could not be synced.", variant: "destructive" });
            addNotification({
              title: "Expense Sync Failed",
              message: `Could not sync ${syncedCount} offline expense(s).`,
              type: "destructive",
            });
          }
        }
      }
    };
    syncPendingExpenses();
  }, [isOnline, group, currentUser, groupId, toast, router, addNotification]);


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
                    updatedAmounts[userId] = '';
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

  const handleReceiptFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0]) {
      const file = event.target.files[0];
      if (file.size > 5 * 1024 * 1024) {
        toast({ title: "File too large", description: "Receipt image cannot exceed 5MB.", variant: "destructive"});
        event.target.value = "";
        setReceiptFile(null);
        setReceiptPreview(null);
        return;
      }
      if (!file.type.startsWith("image/")) {
        toast({ title: "Invalid File Type", description: "Only image files are accepted for receipts.", variant: "destructive"});
        event.target.value = "";
        setReceiptFile(null);
        setReceiptPreview(null);
        return;
      }
      setReceiptFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setReceiptPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    } else {
      setReceiptFile(null);
      setReceiptPreview(null);
    }
  };

  const removeReceiptFile = () => {
    setReceiptFile(null);
    setReceiptPreview(null);
    const fileInput = document.getElementById('receipt') as HTMLInputElement;
    if (fileInput) fileInput.value = "";
    setAiError(null);
  };

  const handleAiExtract = async () => {
      if (!receiptPreview) {
        toast({ title: "No Receipt", description: "Please select a receipt image first.", variant: "destructive" });
        return;
      }
      if (!isOnline) {
        toast({ title: "Offline Mode", description: "AI features are disabled while offline.", variant: "default" });
        return;
      }
      setIsAiProcessing(true);
      setAiError(null);

      try {
        toast({ title: "Analyzing Receipt...", description: "AI is processing the image. This may take a moment.", variant: "default" });
        const result = await extractExpenseDetails({
          receiptDataUri: receiptPreview,
          userDescription: description,
        });
        
        if (result) {
          let fieldsUpdated = false;
          if (result.extractedDescription) { setDescription(result.extractedDescription); fieldsUpdated = true; }
          if (result.extractedAmount !== undefined && result.extractedAmount !== null) { setAmount(result.extractedAmount.toString()); fieldsUpdated = true; }
          
          if (result.extractedDate) {
            let parsedDate: Date | null = null;
            const ymdParts = result.extractedDate.match(/^(\d{4})-(\d{2})-(\d{2})$/);
            if (ymdParts) {
              const year = parseInt(ymdParts[1]);
              const month = parseInt(ymdParts[2]) - 1;
              const day = parseInt(ymdParts[3]);
              const tempDate = new Date(Date.UTC(year, month, day));
              if (!isNaN(tempDate.getTime())) parsedDate = tempDate;
            }
            if (!parsedDate) { try { const tempDate = parseISO(result.extractedDate); if (!isNaN(tempDate.getTime())) parsedDate = tempDate; } catch (e) {} }
            if (!parsedDate) { try { const tempDate = new Date(result.extractedDate); if (!isNaN(tempDate.getTime())) parsedDate = tempDate; } catch (e) {} }

            if (parsedDate) { setExpenseDate(parsedDate); fieldsUpdated = true; }
             else { console.warn("Could not parse AI suggested date:", result.extractedDate); toast({ title: "AI Date Format Issue", description: `AI suggested date "${result.extractedDate}" couldn't be parsed. Please set manually.`, variant: "default", duration: 7000 }); }
          }
          
          if (fieldsUpdated) {
            toast({ title: "AI Autofill Complete", description: "Fields updated based on receipt. Please review." });
          } else {
            toast({ title: "AI Analysis Note", description: "AI could not extract significant details. Please fill manually.", variant: "default" });
          }

        } else {
          toast({ title: "AI Analysis Failed", description: "Could not extract details from the receipt.", variant: "destructive" });
          setAiError("AI analysis returned no result.");
        }
      } catch (error: any) {
        console.error("[AddExpense] Error calling AI extraction flow:", error);
        const errorMessage = error.message || "An unknown error occurred during AI processing.";
        toast({ title: "AI Error", description: errorMessage, variant: "destructive" });
        setAiError(errorMessage);
      } finally {
        setIsAiProcessing(false);
      }
    };

  // handleUndoAddExpense is removed as undo logic moves to group details page

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setIsSubmitting(true);

    try {
        if (!description.trim() || !amount || parseFloat(amount) <= 0 || !paidByUserId || selectedParticipantIds.length === 0 || !expenseDate) {
        toast({ title: "Missing Information", description: "Please fill all required fields, ensure amount is positive, and at least one participant is selected.", variant: "destructive" });
        setIsSubmitting(false);
        return;
        }

        const numericAmount = parseFloat(amount);
        const participantResult = buildExpenseParticipants(
          numericAmount,
          selectedParticipantIds,
          splitEqually,
          customSplitAmounts,
          (userId) => group.members.find(m => m.id === userId)?.name ?? undefined
        );

        if ('error' in participantResult) {
          toast({
            title: splitEqually ? "Split Error" : "Custom Split Mismatch",
            description: splitEqually
              ? participantResult.error
              : `${participantResult.error} Remaining: ${getCurrencySymbol()}${remainingToAllocate.toFixed(2)}`,
            variant: "destructive",
          });
          setIsSubmitting(false);
          return;
        }

        const expenseParticipants = participantResult.participants;

        const actor = group.members.find(u => u.id === paidByUserId) || currentUser;
        
        const expenseColRef = collection(db, 'groups', groupId, 'expenses');
        const newExpenseDocRef = doc(expenseColRef);
        const expenseId = newExpenseDocRef.id;

        let receiptUrlToStore: string | undefined = undefined;
        let receiptFileNameToStore: string | undefined = undefined;

        if (receiptFile && isOnline) {
            toast({ title: "Uploading Receipt", description: "Please wait...", variant: "default" });
            try {
                const filePath = `receipts/${groupId}/${expenseId}/${receiptFile.name}`;
                const fileStorageRef = storageRef(storage, filePath);
                const uploadTask = uploadBytesResumable(fileStorageRef, receiptFile);
                await uploadTask;
                receiptFileNameToStore = receiptFile.name;
                receiptUrlToStore = await getDownloadURL(uploadTask.snapshot.ref);
                toast({ title: "Receipt Uploaded", description: "Receipt successfully uploaded to Firebase Storage.", variant: "default" });
            } catch (uploadError: any) {
                console.error("[AddExpense] Error during receipt upload or getting URL:", uploadError);
                let errorDescription = "Could not upload receipt. Expense will be added without it.";
                if (uploadError.code) {
                    errorDescription += ` (Error: ${uploadError.code}). Please check Firebase Storage rules.`;
                }
                toast({ title: "Receipt Upload Failed", description: errorDescription, variant: "destructive", duration: 7000 });
                if (receiptFile) {
                    receiptFileNameToStore = receiptFile.name;
                }
            }
        } else if (receiptFile && !isOnline) {
            receiptFileNameToStore = receiptFile.name;
            toast({ title: "Offline Receipt", description: "Receipt file noted. Upload will be attempted when online if app supports it.", variant: "default" });
        }

        const expenseDataForStorage: StoredExpenseData = {
            groupId,
            description: description.trim(),
            amount: numericAmount,
            paidByUserId,
            date: expenseDate.toISOString(),
            participants: expenseParticipants,
            tempId: isOnline ? expenseId : `offline-${Date.now()}`,
            actorNameForLog: actor?.name || 'User',
            receiptUrl: receiptUrlToStore,
            receiptFileName: receiptFileNameToStore,
        };

        if (!isOnline) {
            const pending = JSON.parse(localStorage.getItem('pendingExpenses') || '[]') as StoredExpenseData[];
            pending.push(expenseDataForStorage);
            localStorage.setItem('pendingExpenses', JSON.stringify(pending));
            toast({ title: "Offline", description: "Expense saved locally. Will submit to Firestore when online." });
            addNotification({
                title: "Expense Saved Offline",
                message: `"${description.trim()}" for group "${group.name}" saved locally.`,
                type: "info",
            });
            resetFormFields();
            router.push(`/groups/${groupId}?refresh=${Date.now()}&tab=expenses`); // Navigate immediately for offline
            return;
        }

        const dataToSetInFirestore: DocumentData = {
            groupId: expenseDataForStorage.groupId,
            description: expenseDataForStorage.description,
            amount: expenseDataForStorage.amount,
            paidByUserId: expenseDataForStorage.paidByUserId,
            date: expenseDataForStorage.date,
            participants: expenseDataForStorage.participants,
            createdAt: serverTimestamp(),
        };

        if (expenseDataForStorage.receiptUrl) {
            dataToSetInFirestore.receiptUrl = expenseDataForStorage.receiptUrl;
        }
        if (expenseDataForStorage.receiptFileName) {
            dataToSetInFirestore.receiptFileName = expenseDataForStorage.receiptFileName;
        }

        const activityLogColRef = collection(db, 'groups', groupId, 'activityLog');
        const activityLogForFirestore: Omit<ActivityLog, 'id' | 'timestamp'> = {
            groupId: expenseDataForStorage.groupId,
            userId: expenseDataForStorage.paidByUserId,
            actionType: 'expense_added',
            description: `${actor?.name || 'User'} added expense: ${expenseDataForStorage.description}`,
            relatedExpenseId: expenseId,
            actorName: actor?.name || 'User',
        };

        const batch = writeBatch(db);
        batch.set(newExpenseDocRef, dataToSetInFirestore);
        batch.set(doc(activityLogColRef), { ...activityLogForFirestore, timestamp: serverTimestamp() });

        await batch.commit();

        addNotification({
            title: "Expense Added",
            message: `You added "${description.trim()}" to group "${group.name}".`,
            type: "success",
            href: `/groups/${groupId}?tab=expenses`,
        });

        // Store details for undo toast on the next page
        sessionStorage.setItem('undoItemDetails', JSON.stringify({
            itemId: expenseId,
            itemType: 'expense',
            groupId: groupId,
            description: description.trim(),
            actorName: actor?.name || 'User',
            amount: numericAmount, // Store amount for display in undo toast if needed
        }));
        
        resetFormFields();
        router.push(`/groups/${groupId}?refresh=${Date.now()}&tab=expenses&undoAction=expense&itemId=${expenseId}`);

    } catch (error) {
        console.error("[AddExpense] Error in handleSubmit:", error);
        toast({ title: "Submission Error", description: "Could not save expense. Please try again.", variant: "destructive" });
        addNotification({
        title: "Expense Add Failed",
        message: `Could not add "${description.trim()}" to group "${group.name}".`,
        type: "destructive",
        });
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
              <Label htmlFor="receipt">Receipt (Optional)</Label>
              <Input
                id="receipt"
                type="file"
                accept="image/*"
                onChange={handleReceiptFileChange}
                disabled={isSubmitting || isAiProcessing}
                className="file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-primary/10 file:text-primary hover:file:bg-primary/20"
              />
              {receiptFile && (
                <div className="mt-2 p-2 border rounded-md bg-muted/50">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-sm">
                      {receiptPreview ? (
                        <NextImage src={receiptPreview} alt="Receipt preview" width={32} height={32} className="h-8 w-8 object-cover rounded" />
                      ) : (
                        <ImageIconLucide className="h-5 w-5 text-muted-foreground" />
                      )}
                      <span className="truncate max-w-[200px]">{receiptFile.name}</span>
                      <span className="text-xs text-muted-foreground">({(receiptFile.size / 1024).toFixed(1)} KB)</span>
                    </div>
                    <Button type="button" variant="ghost" size="icon" onClick={removeReceiptFile} disabled={isSubmitting || isAiProcessing} className="h-7 w-7">
                      <XCircle className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              )}
              <p className="text-xs text-muted-foreground mt-1">Max file size: 5MB. Only image files (JPEG, PNG, GIF, etc.) are accepted.</p>
              {receiptPreview && (
                <Button
                  type="button"
                  onClick={handleAiExtract}
                  variant="outline"
                  className="w-full mt-2"
                  disabled={isAiProcessing || !isOnline || isSubmitting}
                >
                  {isAiProcessing ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Sparkles className="mr-2 h-4 w-4 text-primary" />
                  )}
                  {isAiProcessing ? 'Analyzing Receipt...' : 'Auto-fill from Receipt (AI)'}
                </Button>
              )}
              {!isOnline && receiptPreview && <p className="text-xs text-muted-foreground text-center mt-1">AI auto-fill disabled in offline mode.</p>}
              {aiError && <p className="text-sm text-destructive mt-1 text-center">{aiError}</p>}
            </div>

            <div>
              <Label htmlFor="description">Description*</Label>
              <Input
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="e.g., Groceries, Dinner, Train tickets"
                required
                disabled={isSubmitting || isAiProcessing}
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
                    disabled={isSubmitting || isAiProcessing}
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
                        disabled={isSubmitting || isAiProcessing}
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
                        disabled={isSubmitting || isAiProcessing || !expenseDate}
                        />
                    </PopoverContent>
                </Popover>
              </div>
            </div>
            <div>
              <Label htmlFor="paidBy">Paid by*</Label>
              <Select value={paidByUserId} onValueChange={setPaidByUserId} required disabled={isSubmitting || isAiProcessing}>
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
                      disabled={isSubmitting || isAiProcessing}
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
                  disabled={isSubmitting || isAiProcessing}
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
                            disabled={isSubmitting || isAiProcessing}
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
            <Button type="submit" className="ml-auto" disabled={isSubmitting || isAiProcessing || (!splitEqually && Math.abs(remainingToAllocate) >= 0.005)}>
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

