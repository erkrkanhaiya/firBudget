
"use client";

import { useEffect, useState, useMemo, useCallback } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ArrowLeft, Users, CreditCard, ListChecks, Activity as ActivityIcon, PlusCircle, Edit, Trash2, UserPlus, DollarSign as DollarSignIcon, Download, Lock, Eye, AlertTriangle, Share2, Link as LinkIconProp, MessageCircle, Facebook, Twitter, Mail, Loader2, Plane, Home as HomeIconLucide, Heart, PartyPopper, Shapes, Check, Paperclip, HandCoins, Send, BarChartHorizontal, Coins as CoinsIcon } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import type { Group, Expense, User as UserType, ActivityLog, Balance, GroupCategory, AppMemberContact, Payment, Contribution } from '@/types';
import { useUser } from '@/contexts/UserContext';
import { format, parseISO } from 'date-fns';
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuGroup,
} from "@/components/ui/dropdown-menu";
import { useToast } from '@/hooks/use-toast';
import { useCurrency } from '@/contexts/CurrencyContext';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { Badge } from '@/components/ui/badge';
import { db } from '@/lib/firebase'; 
import { doc, getDoc, Timestamp, deleteDoc, collection, query, orderBy, getDocs, runTransaction, updateDoc, arrayUnion, writeBatch, serverTimestamp, where } from 'firebase/firestore';
import { useNotification } from '@/contexts/NotificationContext'; 
import React from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
  type ChartConfig
} from "@/components/ui/chart";
import { BarChart, CartesianGrid, XAxis, YAxis, Bar } from "recharts";


interface jsPDFWithAutoTable extends jsPDF {
  autoTable: (options: any) => jsPDFWithAutoTable;
}

const getInitials = (name: string | undefined | null) => {
  if (!name) return "U";
  const names = name.split(' ');
  if (names.length > 1 && names[0] && names[names.length - 1]) {
    return (names[0][0] + names[names.length - 1][0]).toUpperCase();
  }
  if (name.length > 0) return name.substring(0, 2).toUpperCase();
  return "U";
};

const groupCategoryIcons: Record<GroupCategory, React.ElementType> = {
  TRIP: Plane,
  HOME: HomeIconLucide,
  COUPLE: Heart,
  PARTY: PartyPopper,
  OTHER: Shapes,
};

interface SpendingByPayerChartData {
  name: string;
  totalPaid: number;
  fill?: string; // for chart bar color
}


export default function GroupDetailPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams(); 
  const { currentUser } = useUser();
  const { toast } = useToast();
  const groupId = params.groupId as string;
  const { getCurrencySymbol } = useCurrency();
  const { addNotification } = useNotification(); 

  const [group, setGroup] = useState<Group | null>(null);
  const [firestoreExpenses, setFirestoreExpenses] = useState<Expense[]>([]);
  const [firestorePayments, setFirestorePayments] = useState<Payment[]>([]);
  const [firestoreContributions, setFirestoreContributions] = useState<Contribution[]>([]);
  const [firestoreActivityLogs, setFirestoreActivityLogs] = useState<ActivityLog[]>([]);
  const [balances, setBalances] = useState<Balance[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [accessDenied, setAccessDenied] = useState(false);
  const [isWebShareSupported, setIsWebShareSupported] = useState(false);

  const [isAddMemberDialogOpen, setIsAddMemberDialogOpen] = useState(false);
  const [potentialNewMembers, setPotentialNewMembers] = useState<UserType[]>([]);
  const [isLoadingPotentialMembers, setIsLoadingPotentialMembers] = useState(false);
  const [selectedContactsToAdd, setSelectedContactsToAdd] = useState<string[]>([]);
  const [isAddingMembers, setIsAddingMembers] = useState(false);

  const [spendingByPayerChartData, setSpendingByPayerChartData] = useState<SpendingByPayerChartData[]>([]);
  
  const memberDetailsMap = useMemo(() => {
    if (!group || !group.members) return new Map<string, UserType>();
    const map = new Map<string, UserType>();
    group.members.forEach(member => map.set(member.id, member));
    return map;
  }, [group]);

  const calculateGroupBalances = useCallback((
    currentGroupMembers: UserType[], 
    groupExpenses: Expense[], 
    groupPayments: Payment[],
    groupContributions: Contribution[]
  ): Balance[] => {
    if (currentGroupMembers.length === 0) return [];
    
    const memberNetBalances: Record<string, number> = {};
    currentGroupMembers.forEach(member => {
      memberNetBalances[member.id] = 0;
    });

    // 1. Process Contributions
    groupContributions.forEach(contrib => {
      if (memberNetBalances[contrib.contributorId] !== undefined) {
        memberNetBalances[contrib.contributorId] += contrib.amount;
      }
    });

    // 2. Process Expenses
    groupExpenses.forEach(expense => {
      // Credit the payer (money effectively comes back to them from the pool or reduces what they owe to the pool)
      if (memberNetBalances[expense.paidByUserId] !== undefined) {
        memberNetBalances[expense.paidByUserId] += expense.amount;
      }
      // Debit participants for their share (money they owe to the pool)
      expense.participants.forEach(p => {
        if (memberNetBalances[p.userId] !== undefined) {
          memberNetBalances[p.userId] -= p.amountOwed;
        }
      });
    });

    // 3. Process Payments (Settlements between members, or to/from group fund if modeled that way)
    // For settlements recorded through the "Settle Up" page which are direct peer-to-peer for simplicity:
    groupPayments.forEach(payment => {
      // Payer's balance (what they are owed by the fund) decreases.
      if (memberNetBalances[payment.paidByUserId] !== undefined) {
        memberNetBalances[payment.paidByUserId] -= payment.amount;
      }
      // Payee's balance (what they are owed by the fund) increases.
      if (memberNetBalances[payment.paidToUserId] !== undefined) {
        memberNetBalances[payment.paidToUserId] += payment.amount;
      }
    });

    // 4. Simplify debts based on final netBalances
    const finalBalances: Balance[] = [];
    const creditors: Array<{ id: string, amount: number }> = []; // Positive netBalance, group fund owes them
    const debtors: Array<{ id: string, amount: number }> = []; // Negative netBalance, they owe group fund

    currentGroupMembers.forEach(member => {
      const net = parseFloat((memberNetBalances[member.id] || 0).toFixed(2));
      if (net > 0.005) creditors.push({ id: member.id, amount: net });
      else if (net < -0.005) debtors.push({ id: member.id, amount: Math.abs(net) });
      finalBalances.push({ userId: member.id, owes: {}, owedBy: {}, netBalance: net });
    });

    creditors.sort((a, b) => b.amount - a.amount); 
    debtors.sort((a, b) => b.amount - a.amount);   

    let i = 0, j = 0;
    while (i < debtors.length && j < creditors.length) {
      const debtor = debtors[i];
      const creditor = creditors[j];
      const amountToSettle = parseFloat(Math.min(debtor.amount, creditor.amount).toFixed(2));

      if (amountToSettle > 0.005) {
        const debtorBalanceEntry = finalBalances.find(b => b.userId === debtor.id)!;
        const creditorBalanceEntry = finalBalances.find(b => b.userId === creditor.id)!;

        debtorBalanceEntry.owes[creditor.id] = (debtorBalanceEntry.owes[creditor.id] || 0) + amountToSettle;
        creditorBalanceEntry.owedBy[debtor.id] = (creditorBalanceEntry.owedBy[debtor.id] || 0) + amountToSettle;

        debtor.amount = parseFloat((debtor.amount - amountToSettle).toFixed(2));
        creditor.amount = parseFloat((creditor.amount - amountToSettle).toFixed(2));
      }

      if (debtor.amount < 0.005) i++;
      if (creditor.amount < 0.005) j++;
    }
    return finalBalances;
  }, []);


  const fetchGroupData = useCallback(async (showLoadingSpinner = true) => {
    if (!currentUser || !groupId) {
      if(showLoadingSpinner) setIsLoading(false);
      if(!currentUser) router.push('/login');
      return;
    }
    if(showLoadingSpinner) setIsLoading(true);
    setAccessDenied(false);

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
          category: groupData.category || 'OTHER',
        };

        const isMember = fetchedGroup.memberIds.includes(currentUser.id);
        if (fetchedGroup.visibility === 'private' && !isMember) {
          toast({ title: "Access Denied", description: "This is a private group and you are not a member.", variant: "destructive" });
          setAccessDenied(true);
          if(showLoadingSpinner) setIsLoading(false);
          return;
        }
        setGroup(fetchedGroup);

        // Fetch Expenses
        const expensesColRef = collection(db, 'groups', groupId, 'expenses');
        const expensesQuery = query(expensesColRef, orderBy('date', 'desc'));
        const expensesSnapshot = await getDocs(expensesQuery);
        const fetchedExpenses = expensesSnapshot.docs.map(docSnap => {
            const data = docSnap.data();
            return { 
                id: docSnap.id, 
                ...data,
                date: (data.date instanceof Timestamp ? data.date.toDate().toISOString() : data.date as string),
                createdAt: (data.createdAt instanceof Timestamp ? data.createdAt.toDate().toISOString() : data.createdAt as string),
                receiptUrl: data.receiptUrl,
                receiptFileName: data.receiptFileName,
            } as Expense;
        });
        setFirestoreExpenses(fetchedExpenses);

        // Fetch Payments
        const paymentsColRef = collection(db, 'groups', groupId, 'payments');
        const paymentsQuery = query(paymentsColRef, orderBy('date', 'desc'));
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
        setFirestorePayments(fetchedPayments);

        // Fetch Contributions
        const contributionsColRef = collection(db, 'groups', groupId, 'contributions');
        const contributionsQuery = query(contributionsColRef, orderBy('date', 'desc'));
        const contributionsSnapshot = await getDocs(contributionsQuery);
        const fetchedContributions = contributionsSnapshot.docs.map(docSnap => {
            const data = docSnap.data();
            return {
                id: docSnap.id,
                ...data,
                date: (data.date instanceof Timestamp ? data.date.toDate().toISOString() : data.date as string),
                createdAt: (data.createdAt instanceof Timestamp ? data.createdAt.toDate().toISOString() : new Date().toISOString()),
            } as Contribution;
        });
        setFirestoreContributions(fetchedContributions);


        // Fetch Activity Logs
        const activityLogColRef = collection(db, 'groups', groupId, 'activityLog');
        const activityLogQuery = query(activityLogColRef, orderBy('timestamp', 'desc'));
        const activityLogSnapshot = await getDocs(activityLogQuery);
        const fetchedActivityLogs = activityLogSnapshot.docs.map(docSnap => {
            const data = docSnap.data();
            return { 
                id: docSnap.id, 
                ...data,
                timestamp: (data.timestamp instanceof Timestamp ? data.timestamp.toDate().toISOString() : data.timestamp as string)
            } as ActivityLog;
        });
        setFirestoreActivityLogs(fetchedActivityLogs);
        
        const calculatedBalances = calculateGroupBalances(fetchedGroup.members, fetchedExpenses, fetchedPayments, fetchedContributions);
        setBalances(calculatedBalances);
        
        // Calculate spending by payer for chart
        const payerTotals: Record<string, number> = {};
        fetchedExpenses.forEach(expense => {
            payerTotals[expense.paidByUserId] = (payerTotals[expense.paidByUserId] || 0) + expense.amount;
        });

        const chartData = fetchedGroup.members.map((member, index) => ({
            name: member.name || `User ${member.id.substring(0, 4)}`,
            totalPaid: payerTotals[member.id] || 0,
            fill: `var(--chart-${(index % 5) + 1})` 
        })).filter(data => data.totalPaid > 0) 
           .sort((a,b) => b.totalPaid - a.totalPaid); 

        setSpendingByPayerChartData(chartData);


      } else {
        toast({ title: "Group not found", description: "The group you are looking for does not exist.", variant: "destructive" });
        setAccessDenied(true);
      }
    } catch (error) {
      console.error("Error fetching group data:", error);
      toast({ title: "Error", description: "Could not fetch group details.", variant: "destructive" });
      setAccessDenied(true);
    } finally {
      if(showLoadingSpinner) setIsLoading(false);
    }
  }, [groupId, currentUser, router, toast, calculateGroupBalances]);

  useEffect(() => {
    fetchGroupData();
  }, [fetchGroupData, searchParams]); 

  useEffect(() => {
    if (typeof navigator !== "undefined" && navigator.share) {
      setIsWebShareSupported(true);
    }
  }, []);

  const handleDownloadPdf = () => {
    if (!group || !currentUser) return;
    const doc = new jsPDF() as jsPDFWithAutoTable;
    const currencySymbol = getCurrencySymbol();
    let yPos = 20;
    doc.setFontSize(18);
    doc.text(group.name, 14, yPos);
    yPos += 7;
    doc.setFontSize(10);
    doc.setTextColor(150);
    doc.text(group.visibility === 'public' ? 'Public Group' : 'Private Group', 14, yPos);
    yPos += 10;
    doc.setTextColor(0);

    if (group.description) {
      doc.setFontSize(11);
      doc.setTextColor(100);
      const splitDescription = doc.splitTextToSize(group.description, 180);
      doc.text(splitDescription, 14, yPos);
      yPos += (splitDescription.length * 5) + 5;
    }
    
    doc.setFontSize(11);
    doc.setTextColor(0);
    doc.text(`Report generated on: ${format(new Date(), "MMMM d, yyyy 'at' h:mm a")}`, 14, yPos);
    yPos += 7;
    doc.text(`Currency: ${currencySymbol === '₹' ? 'INR' : 'USD'} (${currencySymbol})`, 14, yPos);
    yPos += 10;

    doc.setFontSize(14);
    doc.text("Group Members", 14, yPos);
    yPos += 8;
    doc.setFontSize(11);
    group.members.forEach(member => {
      doc.text(`- ${member.name || 'N/A'} (${member.email || 'N/A'})${member.id === group.ownerId ? ' (Admin)' : ''}`, 16, yPos);
      yPos += 6;
    });
    yPos += 4; 

    if (firestoreContributions.length > 0) {
      doc.setFontSize(14);
      doc.text("Contributions to Group Fund", 14, yPos);
      yPos += 2;
      const contributionData = firestoreContributions.map(c => {
        const contributor = memberDetailsMap.get(c.contributorId);
        return [
          format(parseISO(c.date), "MMM d, yyyy"),
          contributor?.name || c.contributorId.substring(0,6),
          c.description || "-",
          `${currencySymbol}${c.amount.toFixed(2)}`
        ];
      });
      doc.autoTable({
        startY: yPos,
        head: [['Date', 'Contributor', 'Description', 'Amount']],
        body: contributionData,
        theme: 'striped',
        headStyles: { fillColor: [22, 160, 133] },
        margin: { top: yPos }
      });
      yPos = doc.autoTable.previous.finalY + 10;
    }


    if (firestoreExpenses.length > 0) {
      doc.setFontSize(14);
      doc.text("Expenses", 14, yPos);
      yPos += 2; 
      const expenseData = firestoreExpenses.map(exp => {
        const payer = memberDetailsMap.get(exp.paidByUserId);
        return [
          format(parseISO(exp.date), "MMM d, yyyy"),
          exp.description + (exp.receiptFileName ? ` (Receipt: ${exp.receiptFileName.substring(0,15)}...)` : ""),
          payer?.name || exp.paidByUserId.substring(0,6), 
          `${currencySymbol}${exp.amount.toFixed(2)}`
        ];
      });
      doc.autoTable({
        startY: yPos,
        head: [['Date', 'Description', 'Paid By', 'Amount']],
        body: expenseData,
        theme: 'striped',
        headStyles: { fillColor: [52, 73, 94] }, 
        margin: { top: yPos }
      });
      yPos = doc.autoTable.previous.finalY + 10;
    } else {
      doc.setFontSize(11);
      doc.text("No expenses recorded for this group.", 14, yPos);
      yPos += 10;
    }

    if (firestorePayments.length > 0) {
      doc.setFontSize(14);
      doc.text("Recorded Payments (Settlements)", 14, yPos);
      yPos += 2;
      const paymentData = firestorePayments.map(p => {
        const payer = memberDetailsMap.get(p.paidByUserId);
        const payee = memberDetailsMap.get(p.paidToUserId);
        return [
          format(parseISO(p.date), "MMM d, yyyy"),
          `${payer?.name || p.paidByUserId.substring(0,6)} paid ${payee?.name || p.paidToUserId.substring(0,6)}`,
          `${currencySymbol}${p.amount.toFixed(2)}`,
          p.method,
          p.notes || ""
        ];
      });
      doc.autoTable({
        startY: yPos,
        head: [['Date', 'Transaction', 'Amount', 'Method', 'Notes']],
        body: paymentData,
        theme: 'striped',
        headStyles: { fillColor: [40, 116, 166] }, 
        margin: { top: yPos }
      });
      yPos = doc.autoTable.previous.finalY + 10;
    }


    if (balances.length > 0) {
      doc.setFontSize(14);
      doc.text("Net Balances (After All Transactions)", 14, yPos);
      yPos += 8;
      doc.setFontSize(11);
      const balanceSummary: string[][] = [];
      balances.forEach(balance => {
        const user = memberDetailsMap.get(balance.userId);
        if (!user) return;
        let balanceText = "";
        if (balance.netBalance > 0.005) { 
          balanceText = `Is Owed by Group: ${currencySymbol}${balance.netBalance.toFixed(2)}`;
        } else if (balance.netBalance < -0.005) { 
          balanceText = `Owes to Group: ${currencySymbol}${Math.abs(balance.netBalance).toFixed(2)}`;
        } else {
          balanceText = "Settled with Group";
        }
        balanceSummary.push([user.name || balance.userId.substring(0,6), balanceText]);
      });
       doc.autoTable({
        startY: yPos,
        head: [['Member', 'Net Position with Group Fund']],
        body: balanceSummary,
        theme: 'grid',
        headStyles: { fillColor: [52, 73, 94] },
        margin: { top: yPos }
      });
      yPos = doc.autoTable.previous.finalY + 10;

      let detailedOwesText = "";
      balances.forEach(balance => {
        const user = memberDetailsMap.get(balance.userId);
        if (!user) return;
        const owedToList = Object.entries(balance.owes)
          .filter(([, amount]) => amount > 0.005) 
          .map(([owedToId, amount]) => ({
            user: memberDetailsMap.get(owedToId),
            amount
          }))
          .filter(item => item.user);
          
        if (owedToList.length > 0) {
            detailedOwesText += `${user.name || balance.userId.substring(0,6)} should pay:\n`;
            owedToList.forEach(item => {
                 detailedOwesText += `  - ${currencySymbol}${item.amount.toFixed(2)} to ${item.user!.name || item.user!.id.substring(0,6)}\n`;
            });
            detailedOwesText += "\n";
        }
      });
      
      if (detailedOwesText) {
        if (yPos > 250) { doc.addPage(); yPos = 20; } 
        doc.setFontSize(14);
        doc.text("Simplified Settlement Suggestions (Who Owes Whom Directly)", 14, yPos);
        yPos += 10;
        doc.setFontSize(10);
        const splitOwesText = doc.splitTextToSize(detailedOwesText, 180);
        doc.text(splitOwesText, 14, yPos);
      }
    } else {
      doc.setFontSize(11);
      doc.text("No balances to display or balances are being calculated.", 14, yPos);
      yPos += 10;
    }
    doc.save(`HisabKaro_Group_${group.name.replace(/\s+/g, '_')}_Summary.pdf`);
    toast({ title: "PDF Generated", description: "Your group summary PDF has been downloaded." });
  };

  const groupUrl = typeof window !== 'undefined' ? `${window.location.origin}/groups/${groupId}` : '';
  const shareMessageDefault = `Check out this group on HisabKaro: "${group?.name || 'a group'}"`;
  const shareTitle = group?.name || 'HisabKaro Group';

  const handleNativeShare = async () => {
    if (!group) return;
    const shareData = {
      title: shareTitle,
      text: `${shareMessageDefault}\n${groupUrl}`,
      url: groupUrl,
    };
    try {
      if (navigator.share && (typeof navigator.canShare !== 'function' || navigator.canShare(shareData))) {
        await navigator.share(shareData);
      } else {
        toast({ title: "Web Share Not Supported", description: "Cannot share using system dialog.", variant: "destructive" });
      }
    } catch (err) {
      console.error("Failed to share natively: ", err);
      if ((err as DOMException).name !== 'AbortError') { 
        toast({ title: "Sharing Failed", description: "Could not share using system dialog.", variant: "destructive" });
      }
    }
  };

  const handleCopyLink = async () => {
    if (!group) return;
    try {
      await navigator.clipboard.writeText(groupUrl);
      toast({ title: "Link Copied!", description: "Group link copied to clipboard." });
    } catch (err) {
      console.error('Failed to copy: ', err);
      toast({ title: "Copy Failed", description: "Could not copy link to clipboard.", variant: "destructive" });
    }
  };

  const handleShareWhatsApp = () => { if (!group) return; const message = `${shareMessageDefault}\n${groupUrl}`; const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(message)}`; window.open(whatsappUrl, '_blank', 'noopener,noreferrer'); };
  const handleShareFacebook = () => { if (!group) return; const facebookUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(groupUrl)}`; window.open(facebookUrl, '_blank', 'noopener,noreferrer'); };
  const handleShareTwitter = () => { if (!group) return; const text = `${shareMessageDefault}`; const twitterUrl = `https://twitter.com/intent/tweet?url=${encodeURIComponent(groupUrl)}&text=${encodeURIComponent(text)}`; window.open(twitterUrl, '_blank', 'noopener,noreferrer'); };
  const handleShareEmail = () => { if (!group) return; const subject = `Check out this HisabKaro group: ${group.name}`; const body = `${shareMessageDefault}\n${groupUrl}`; const mailtoUrl = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`; window.location.href = mailtoUrl; };

  const handleDeleteGroup = async () => {
    if (!group || !currentUser || group.ownerId !== currentUser.id) {
      toast({ title: "Error", description: "You do not have permission to delete this group.", variant: "destructive"});
      return;
    }
    const groupName = group.name; 
    try {
      await runTransaction(db, async (transaction) => {
        const groupDocRef = doc(db, 'groups', groupId);
        
        const expensesColRef = collection(db, 'groups', groupId, 'expenses');
        const expensesSnapshot = await getDocs(query(expensesColRef)); 
        expensesSnapshot.forEach(docSnap => transaction.delete(docSnap.ref));

        const paymentsColRef = collection(db, 'groups', groupId, 'payments');
        const paymentsSnapshot = await getDocs(query(paymentsColRef));
        paymentsSnapshot.forEach(docSnap => transaction.delete(docSnap.ref));

        const contributionsColRef = collection(db, 'groups', groupId, 'contributions'); 
        const contributionsSnapshot = await getDocs(query(contributionsColRef));
        contributionsSnapshot.forEach(docSnap => transaction.delete(docSnap.ref));
        
        const activityLogColRef = collection(db, 'groups', groupId, 'activityLog');
        const activityLogSnapshot = await getDocs(query(activityLogColRef)); 
        activityLogSnapshot.forEach(docSnap => transaction.delete(docSnap.ref));
        
        transaction.delete(groupDocRef);
      });

      toast({ title: "Group Deleted", description: `Group "${groupName}" and all its data have been deleted from Firestore.`});
      addNotification({
        title: "Group Deleted",
        message: `You deleted the group: "${groupName}"`,
        type: "destructive",
      });
      router.push('/groups');
    } catch (error) {
      console.error("Error deleting group and its subcollections:", error);
      toast({ title: "Error", description: "Could not delete group. Subcollections might still exist.", variant: "destructive"});
      addNotification({
        title: "Group Deletion Failed",
        message: `Could not delete group: "${groupName}"`,
        type: "destructive",
      });
    }
  };

  const fetchPotentialNewMembers = async () => {
    if (!currentUser || !group) return;
    setIsLoadingPotentialMembers(true);
    try {
      const contactsCollectionRef = collection(db, "appMemberContacts");
      const q = query(
        contactsCollectionRef,
        where("addedByUid", "==", currentUser.id),
        orderBy("name", "asc")
      );
      const contactsSnapshot = await getDocs(q);
      const contactsList = contactsSnapshot.docs
        .map(docSnap => {
          const data = docSnap.data() as AppMemberContact;
          return {
            id: docSnap.id,
            name: data.name,
            email: null, 
            avatarUrl: undefined, 
          } as UserType;
        })
        .filter(contact => !group.memberIds.includes(contact.id)); 
      
      setPotentialNewMembers(contactsList);
    } catch (error) {
      console.error("Error fetching potential new members:", error);
      toast({ title: "Error", description: "Could not load your contacts. Ensure Firestore indexes are set if prompted.", variant: "destructive" });
    } finally {
      setIsLoadingPotentialMembers(false);
    }
  };

  const handleAddMemberDialogOpenChange = (open: boolean) => {
    setIsAddMemberDialogOpen(open);
    if (open) {
      fetchPotentialNewMembers();
      setSelectedContactsToAdd([]); 
    }
  };

  const handleToggleContactSelection = (contactId: string) => {
    setSelectedContactsToAdd(prev =>
      prev.includes(contactId)
        ? prev.filter(id => id !== contactId)
        : [...prev, contactId]
    );
  };

  const handleAddSelectedMembers = async () => {
    if (!currentUser || !group || selectedContactsToAdd.length === 0) {
      toast({ title: "No members selected", variant: "destructive" });
      return;
    }
    setIsAddingMembers(true);
    try {
      const groupDocRef = doc(db, 'groups', groupId);
      const batch = writeBatch(db);

      const newMemberObjects: UserType[] = [];
      selectedContactsToAdd.forEach(contactId => {
        const contact = potentialNewMembers.find(p => p.id === contactId);
        if (contact) {
          newMemberObjects.push({
            id: contact.id,
            name: contact.name,
            email: null, 
            avatarUrl: contact.avatarUrl || '',
          });
        }
      });

      batch.update(groupDocRef, {
        memberIds: arrayUnion(...selectedContactsToAdd),
        members: arrayUnion(...newMemberObjects)
      });

      const activityLogColRef = collection(db, 'groups', groupId, 'activityLog');
      newMemberObjects.forEach(member => {
        const logEntry: Omit<ActivityLog, 'id' | 'timestamp'> = {
          groupId: groupId,
          userId: currentUser.id, 
          actorName: currentUser.name, 
          actionType: 'member_added',
          description: `${currentUser.name || 'Admin'} added ${member.name || 'a new member'} to the group.`,
          relatedUserId: member.id,
        };
        batch.set(doc(activityLogColRef), { ...logEntry, timestamp: serverTimestamp() });

        addNotification({
          title: "Member Added to Group",
          message: `You added ${member.name || 'a new member'} to "${group.name}".`,
          type: "success",
          href: `/groups/${groupId}`,
        });
      });

      await batch.commit();
      toast({ title: "Members Added!", description: `${newMemberObjects.length} member(s) added to the group.` });
      setIsAddMemberDialogOpen(false);
      fetchGroupData(false); 

    } catch (error) {
      console.error("Error adding members to group:", error);
      toast({ title: "Error", description: "Could not add members to the group.", variant: "destructive" });
      addNotification({
        title: "Failed to Add Members",
        message: `Could not add members to "${group.name}".`,
        type: "destructive",
      });
    } finally {
      setIsAddingMembers(false);
    }
  };


  if (isLoading) {
    return (
        <div className="flex items-center justify-center min-h-[calc(100vh-10rem)]">
            <Loader2 className="h-12 w-12 animate-spin text-primary" />
        </div>
    );
  }
  
  if (accessDenied) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-15rem)] text-center p-4">
        <AlertTriangle className="w-16 h-16 text-destructive mb-4" />
        <h1 className="text-3xl font-bold mb-2">Access Denied</h1>
        <p className="text-lg text-muted-foreground mb-6">
          {group ? "This is a private group and you are not a member." : "Group not found or you do not have permission to view it."}
        </p>
        <Button asChild>
          <Link href="/groups">Back to Groups</Link>
        </Button>
      </div>
    );
  }

  if (!currentUser) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-15rem)] text-center p-4">
        <AlertTriangle className="w-16 h-16 text-destructive mb-4" />
        <h1 className="text-3xl font-bold mb-2">Authentication Required</h1>
        <p className="text-lg text-muted-foreground mb-6">Please log in to view this page.</p>
        <Button asChild><Link href="/login">Go to Login</Link></Button>
      </div>
    );
  }
  
  if (!group) {
    return (
         <div className="flex items-center justify-center min-h-[calc(100vh-10rem)]">
            <Loader2 className="h-12 w-12 animate-spin text-muted-foreground" />
            <p className="ml-2 text-muted-foreground">Loading group data...</p>
        </div>
    );
  }
  
  const isMember = group.memberIds.includes(currentUser.id);
  const isOwner = group.ownerId === currentUser.id; 
  const CategoryIcon = groupCategoryIcons[group.category || 'OTHER'] || Shapes;

  const chartConfigSpendingByPayer = {
    totalPaid: {
      label: `Total Paid (${getCurrencySymbol()})`,
    },
    ...spendingByPayerChartData.reduce((acc, member) => {
      acc[member.name] = { label: member.name, color: member.fill };
      return acc;
    }, {} as ChartConfig)
  } satisfies ChartConfig;

  return (
    <div className="space-y-6">
      <Button variant="outline" size="sm" asChild className="mb-4">
        <Link href="/groups">
          <ArrowLeft className="mr-2 h-4 w-4" /> Back to Groups
        </Link>
      </Button>

      <Card>
        <CardHeader className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
          <div className="flex items-start gap-4">
            {group.photoUrl ? (
              <Image 
                src={group.photoUrl} 
                alt={group.name} 
                width={100} 
                height={100} 
                className="rounded-lg object-cover h-24 w-24 md:h-28 md:w-28 shadow-md"
                data-ai-hint={group.dataAiHint || "group image"}
                priority
              />
            ) : (
              <div className="rounded-lg h-24 w-24 md:h-28 md:w-28 flex items-center justify-center bg-muted shadow-md">
                <CategoryIcon className="h-12 w-12 md:h-14 md:w-14 text-muted-foreground" />
              </div>
            )}
            <div>
              <div className="flex items-center gap-2 mb-1">
                 <CardTitle className="text-3xl">{group.name}</CardTitle>
                 {group.visibility === 'public' ? (
                    <Badge variant="outline" className="text-sm flex items-center gap-1"><Eye className="h-4 w-4"/>Public</Badge>
                 ) : (
                    <Badge variant="secondary" className="text-sm flex items-center gap-1"><Lock className="h-4 w-4"/>Private</Badge>
                 )}
              </div>
              <CardDescription className="text-base">{group.description}</CardDescription>
              <p className="text-xs text-muted-foreground mt-2">Created on: {format(parseISO(group.createdAt), "MMMM d, yyyy")}</p>
              {isMember && isOwner && <Badge variant="default" className="mt-2">You are the Admin</Badge>}
              {isMember && !isOwner && <Badge variant="outline" className="mt-2">You are a Member</Badge>}
              {!isMember && group.visibility === 'public' && <Badge variant="outline" className="mt-2">Viewing as Non-Member</Badge>}
            </div>
          </div>
          {isOwner && ( 
            <div className="flex gap-2 mt-4 md:mt-0">
              <Button variant="outline" size="sm" asChild>
                <Link href={`/groups/${groupId}/edit`}>
                    <Edit className="mr-2 h-4 w-4" /> Edit Group
                </Link>
              </Button>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="destructive" size="sm">
                    <Trash2 className="mr-2 h-4 w-4" /> Delete Group
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This action cannot be undone. This will permanently delete the group
                      "{group.name}" and all its associated data (expenses, activity logs, payments, contributions) from Firestore.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={handleDeleteGroup} className="bg-destructive hover:bg-destructive/90">
                      Delete
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          )}
        </CardHeader>
      </Card>
      <TooltipProvider>
        <Tabs defaultValue="expenses" className="w-full" value={searchParams.get('tab') || 'expenses'} onValueChange={(value) => router.replace(`/groups/${groupId}?tab=${value}`)}>
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 gap-4">
            <TabsList>
              <TabsTrigger value="expenses"><CreditCard className="mr-2 h-4 w-4 sm:hidden md:inline-block" />Expenses</TabsTrigger>
              <TabsTrigger value="contributions"><CoinsIcon className="mr-2 h-4 w-4 sm:hidden md:inline-block" />Contributions</TabsTrigger>
              <TabsTrigger value="payments"><HandCoins className="mr-2 h-4 w-4 sm:hidden md:inline-block" />Payments</TabsTrigger>
              <TabsTrigger value="balances"><ListChecks className="mr-2 h-4 w-4 sm:hidden md:inline-block" />Balances</TabsTrigger>
              <TabsTrigger value="reports"><BarChartHorizontal className="mr-2 h-4 w-4 sm:hidden md:inline-block" />Reports</TabsTrigger>
              <TabsTrigger value="members"><Users className="mr-2 h-4 w-4 sm:hidden md:inline-block" />Members</TabsTrigger>
              <TabsTrigger value="activity"><ActivityIcon className="mr-2 h-4 w-4 sm:hidden md:inline-block" />Activity</TabsTrigger>
            </TabsList>
             <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
              {isMember && ( 
                <>
                  <Button asChild className="flex-1 sm:flex-none">
                    <Link href={`/groups/${groupId}/add-expense`}>
                      <PlusCircle className="mr-2 h-4 w-4" /> Add Expense
                    </Link>
                  </Button>
                  <Button variant="secondary" asChild className="flex-1 sm:flex-none">
                    <Link href={`/groups/${groupId}/add-contribution`}>
                      <CoinsIcon className="mr-2 h-4 w-4" /> Add Funds
                    </Link>
                  </Button>
                  <Button variant="outline" asChild className="flex-1 sm:flex-none">
                    <Link href={`/groups/${groupId}/settle-up`}>
                      <DollarSignIcon className="mr-2 h-4 w-4" /> Settle Up
                    </Link>
                  </Button>
                </>
              )}
               <Button variant="outline" onClick={handleDownloadPdf} className="flex-1 sm:flex-none">
                  <Download className="mr-2 h-4 w-4" /> Download PDF
              </Button>
              {(group.visibility === 'public' || isMember) && ( 
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" className="flex-1 sm:flex-none">
                        <Share2 className="mr-2 h-4 w-4" /> Share Group
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-56">
                      <DropdownMenuLabel>Share "{group.name}"</DropdownMenuLabel>
                      <DropdownMenuSeparator />
                      {isWebShareSupported && (
                        <DropdownMenuItem onClick={handleNativeShare} className="cursor-pointer">
                          <Share2 className="mr-2 h-4 w-4" /> Share via System
                        </DropdownMenuItem>
                      )}
                      <DropdownMenuItem onClick={handleCopyLink} className="cursor-pointer">
                        <LinkIconProp className="mr-2 h-4 w-4" /> Copy Link
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={handleShareWhatsApp} className="cursor-pointer">
                        <MessageCircle className="mr-2 h-4 w-4" /> Share on WhatsApp
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={handleShareFacebook} className="cursor-pointer">
                        <Facebook className="mr-2 h-4 w-4" /> Share on Facebook
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={handleShareTwitter} className="cursor-pointer">
                        <Twitter className="mr-2 h-4 w-4" /> Share on Twitter
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={handleShareEmail} className="cursor-pointer">
                        <Mail className="mr-2 h-4 w-4" /> Share via Email
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
              )}
            </div>
          </div>

          <TabsContent value="expenses">
            <Card>
              <CardHeader>
                <CardTitle>Expenses</CardTitle>
                <CardDescription>All expenses recorded in this group from Firestore.</CardDescription>
              </CardHeader>
              <CardContent>
                {firestoreExpenses.length > 0 ? (
                  <ul className="space-y-4">
                    {firestoreExpenses.map(expense => {
                      const payer = memberDetailsMap.get(expense.paidByUserId);
                      const currentUserShare = expense.participants.find(p => p.userId === currentUser.id);
                      return (
                      <li key={expense.id} className="flex items-center justify-between p-3 border rounded-md hover:bg-muted/50">
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                          <Avatar className="h-10 w-10">
                              <AvatarImage src={payer?.avatarUrl || undefined} />
                              <AvatarFallback>{getInitials(payer?.name)}</AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-1.5">
                                <p className="font-medium truncate">{expense.description}</p>
                                {expense.receiptFileName && (
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      {expense.receiptUrl ? (
                                        <Link href={expense.receiptUrl} target="_blank" rel="noopener noreferrer" aria-label={`View receipt for ${expense.description}`}>
                                          <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:text-primary shrink-0">
                                            <Paperclip className="h-4 w-4" />
                                          </Button>
                                        </Link>
                                      ) : (
                                        <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground/50 hover:text-primary shrink-0 cursor-not-allowed" disabled>
                                          <Paperclip className="h-4 w-4" />
                                        </Button>
                                      )}
                                    </TooltipTrigger>
                                    <TooltipContent>
                                      <p>
                                        {expense.receiptUrl ? "View Receipt: " : "Receipt: "}
                                        {expense.receiptFileName}
                                      </p>
                                      {!expense.receiptUrl && <p className="text-xs">(Offline, not uploaded)</p>}
                                    </TooltipContent>
                                  </Tooltip>
                                )}
                              </div>
                              <p className="text-sm text-muted-foreground">
                                  Paid by {payer?.name || expense.paidByUserId.substring(0,6)} on {format(parseISO(expense.date), "MMM d, yyyy")}
                              </p>
                          </div>
                        </div>
                        <div className="text-right ml-2">
                          <p className="text-lg font-semibold">{getCurrencySymbol()}{expense.amount.toFixed(2)}</p>
                          {isMember && currentUserShare && (
                             <p className="text-xs text-blue-600 dark:text-blue-400">Your share: {getCurrencySymbol()}{currentUserShare.amountOwed.toFixed(2)}</p>
                          )}
                        </div>
                      </li>
                    )})}
                  </ul>
                ) : (
                  <p className="text-muted-foreground text-center py-4">No expenses recorded yet in Firestore for this group.</p>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="contributions">
            <Card>
              <CardHeader>
                <CardTitle>Fund Contributions</CardTitle>
                <CardDescription>All funds contributed by members to this group's pool.</CardDescription>
              </CardHeader>
              <CardContent>
                {firestoreContributions.length > 0 ? (
                  <ul className="space-y-4">
                    {firestoreContributions.map(contribution => {
                      const contributor = memberDetailsMap.get(contribution.contributorId);
                      return (
                        <li key={contribution.id} className="flex items-center justify-between p-3 border rounded-md hover:bg-muted/50">
                          <div className="flex items-center gap-3">
                            <Avatar className="h-10 w-10">
                              <AvatarImage src={contributor?.avatarUrl || undefined} alt={contributor?.name} />
                              <AvatarFallback>{getInitials(contributor?.name)}</AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="font-medium">
                                {contributor?.name || contribution.contributorId.substring(0,6)} contributed
                              </p>
                              <p className="text-sm text-muted-foreground">
                                On {format(parseISO(contribution.date), "MMM d, yyyy")}
                                {contribution.description && ` - ${contribution.description}`}
                              </p>
                            </div>
                          </div>
                          <div className="text-right ml-2">
                            <p className="text-lg font-semibold text-green-600 dark:text-green-400">
                              +{getCurrencySymbol()}{contribution.amount.toFixed(2)}
                            </p>
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                ) : (
                  <p className="text-muted-foreground text-center py-4">No contributions recorded yet for this group.</p>
                )}
              </CardContent>
               <CardFooter>
                <Button asChild className="ml-auto">
                    <Link href={`/groups/${groupId}/add-contribution`}>
                        <CoinsIcon className="mr-2 h-4 w-4" /> Record Contribution
                    </Link>
                </Button>
              </CardFooter>
            </Card>
          </TabsContent>
          
          <TabsContent value="payments">
            <Card>
              <CardHeader>
                <CardTitle>Payment History</CardTitle>
                <CardDescription>All settlement payments recorded in this group from Firestore.</CardDescription>
              </CardHeader>
              <CardContent>
                {firestorePayments.length > 0 ? (
                  <ul className="space-y-4">
                    {firestorePayments.map(payment => {
                      const payer = memberDetailsMap.get(payment.paidByUserId);
                      const payee = memberDetailsMap.get(payment.paidToUserId);
                      return (
                        <li key={payment.id} className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-3 border rounded-md hover:bg-muted/50">
                          <div className="flex items-center gap-3 mb-2 sm:mb-0 flex-1 min-w-0">
                            <Avatar className="h-10 w-10">
                              <AvatarImage src={payer?.avatarUrl || undefined} alt={payer?.name}/>
                              <AvatarFallback>{getInitials(payer?.name)}</AvatarFallback>
                            </Avatar>
                            <div className="flex-1 min-w-0">
                              <p className="font-medium truncate">
                                {payer?.name || payment.paidByUserId.substring(0,6)} paid {payee?.name || payment.paidToUserId.substring(0,6)}
                              </p>
                              <p className="text-sm text-muted-foreground">
                                On {format(parseISO(payment.date), "MMM d, yyyy")} via {payment.method}
                              </p>
                              {payment.notes && <p className="text-xs text-muted-foreground italic">Note: {payment.notes}</p>}
                            </div>
                          </div>
                          <div className="text-left sm:text-right sm:ml-2">
                            <p className="text-lg font-semibold">{getCurrencySymbol()}{payment.amount.toFixed(2)}</p>
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                ) : (
                  <p className="text-muted-foreground text-center py-4">No payments recorded yet in Firestore for this group.</p>
                )}
              </CardContent>
            </Card>
          </TabsContent>


          <TabsContent value="balances">
            <Card>
              <CardHeader>
                <CardTitle>Balances</CardTitle>
                <CardDescription>Who owes whom in this group, calculated from Firestore transactions (contributions, expenses, payments).</CardDescription>
              </CardHeader>
              <CardContent>
                {balances.length > 0 ? (
                  <ul className="space-y-3">
                    {balances.map(balance => {
                      const user = memberDetailsMap.get(balance.userId);
                      if (!user) return null;

                      const owedToList = Object.entries(balance.owes).map(([owedToId, amount]) => ({
                          user: memberDetailsMap.get(owedToId),
                          amount
                      })).filter(item => item.user && item.amount > 0.005); 
                      
                      const owedByList = Object.entries(balance.owedBy).map(([owedById, amount]) => ({
                          user: memberDetailsMap.get(owedById),
                          amount
                      })).filter(item => item.user && item.amount > 0.005); 

                      return (
                          <li key={balance.userId} className="p-3 border rounded-md">
                              <div className="flex items-center gap-2 mb-2">
                                  <Avatar className="h-8 w-8">
                                      <AvatarImage src={user.avatarUrl || undefined} />
                                      <AvatarFallback>{getInitials(user.name)}</AvatarFallback>
                                  </Avatar>
                                  <span className="font-medium">{user.name || balance.userId.substring(0,6)}'s Net Position:</span>
                                  <span className={`font-semibold ${balance.netBalance > 0.005 ? 'text-green-600 dark:text-green-400' : balance.netBalance < -0.005 ? 'text-red-600 dark:text-red-400' : 'text-muted-foreground'}`}>
                                      {getCurrencySymbol()}{Math.abs(balance.netBalance).toFixed(2)} {balance.netBalance > 0.005 ? "is owed by group fund" : balance.netBalance < -0.005 ? "owes to group fund" : "is settled with group fund"}
                                  </span>
                              </div>
                              {owedToList.length > 0 && (
                                  <div className="pl-4 text-sm space-y-1">
                                      <p className="text-red-600 dark:text-red-400 font-medium">Should Pay (Simplified):</p>
                                      <ul className="list-none ml-2 space-y-1">
                                          {owedToList.map(item => (
                                              <li key={item.user!.id} className="flex justify-between items-center">
                                                  <span>{`${getCurrencySymbol()}${item.amount.toFixed(2)} to ${item.user!.name || item.user!.id.substring(0,6)}`}</span>
                                                  {balance.userId === currentUser.id && isMember && (
                                                    <Button asChild size="xs" variant="outline" className="px-2 py-1 h-auto text-xs">
                                                      <Link href={`/groups/${groupId}/settle-up?payerId=${currentUser.id}&payeeId=${item.user!.id}&amount=${item.amount.toFixed(2)}`}>
                                                        <Send className="mr-1.5 h-3 w-3" /> Settle
                                                      </Link>
                                                    </Button>
                                                  )}
                                              </li>
                                          ))}
                                      </ul>
                                  </div>
                              )}
                              {/* OwedBy list might be redundant if we are showing net position and simplified payments */}
                               {!owedToList.length && !owedByList.length && Math.abs(balance.netBalance) < 0.01 && ( 
                                   <p className="pl-4 text-sm text-muted-foreground">All settled up!</p>
                               )}
                          </li>
                      );
                    })}
                  </ul>
                ) : (
                   <p className="text-muted-foreground text-center py-4">Balances are being calculated or no transactions yet in Firestore.</p>
                )}
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="reports">
            <Card>
              <CardHeader>
                <CardTitle>Reports</CardTitle>
                <CardDescription>Visual insights into group spending.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Total Spending by Payer</CardTitle>
                    <CardDescription>Which member has paid the most for group expenses.</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {spendingByPayerChartData.length > 0 ? (
                      <ChartContainer config={chartConfigSpendingByPayer} className="h-[300px] w-full">
                        <BarChart 
                          accessibilityLayer 
                          data={spendingByPayerChartData} 
                          layout="vertical"
                          margin={{left: 10, right: 10}}
                        >
                          <CartesianGrid vertical={false} />
                          <XAxis type="number" dataKey="totalPaid" tickFormatter={(value) => `${getCurrencySymbol()}${value}`} />
                          <YAxis dataKey="name" type="category" tickLine={false} axisLine={false} hide={spendingByPayerChartData.length > 10}/>
                          <ChartTooltip
                            cursor={false}
                            content={<ChartTooltipContent hideLabel />}
                          />
                           <ChartLegend content={<ChartLegendContent />} />
                          <Bar dataKey="totalPaid" radius={4}>
                          </Bar>
                        </BarChart>
                      </ChartContainer>
                    ) : (
                      <p className="text-muted-foreground text-center py-4">No spending data to display for the chart.</p>
                    )}
                  </CardContent>
                </Card>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="members">
            <Card>
              <CardHeader className="flex flex-row justify-between items-center">
                  <div>
                      <CardTitle>Members ({group.members.length})</CardTitle>
                      <CardDescription>People participating in this group (from Firestore).</CardDescription>
                  </div>
                   {isOwner && (
                      <Dialog open={isAddMemberDialogOpen} onOpenChange={handleAddMemberDialogOpenChange}>
                          <DialogTrigger asChild>
                              <Button variant="outline" size="sm">
                                  <UserPlus className="mr-2 h-4 w-4"/>Add Member
                              </Button>
                          </DialogTrigger>
                          <DialogContent className="sm:max-w-[480px]">
                              <DialogHeader>
                                  <DialogTitle>Add Members to "{group.name}"</DialogTitle>
                                  <DialogDescription>
                                      Select contacts to add to this group. Only contacts not already in the group are shown.
                                  </DialogDescription>
                              </DialogHeader>
                              <div className="py-4">
                                  {isLoadingPotentialMembers ? (
                                      <div className="space-y-2">
                                          {[1,2,3].map(i => <Skeleton key={i} className="h-10 w-full rounded-md" />)}
                                      </div>
                                  ) : potentialNewMembers.length > 0 ? (
                                     <ScrollArea className="h-[250px] pr-3">
                                          <div className="space-y-2">
                                              {potentialNewMembers.map(contact => (
                                                  <label
                                                      key={contact.id}
                                                      htmlFor={`contact-${contact.id}`}
                                                      className="flex items-center p-2 space-x-3 rounded-md border hover:bg-accent hover:text-accent-foreground has-[:checked]:border-primary has-[:checked]:bg-primary/10 transition-colors cursor-pointer"
                                                  >
                                                      <Checkbox
                                                          id={`contact-${contact.id}`}
                                                          checked={selectedContactsToAdd.includes(contact.id)}
                                                          onCheckedChange={() => handleToggleContactSelection(contact.id)}
                                                      />
                                                      <Avatar className="h-8 w-8">
                                                          <AvatarImage src={contact.avatarUrl || undefined} alt={contact.name || 'Contact'} />
                                                          <AvatarFallback>{getInitials(contact.name)}</AvatarFallback>
                                                      </Avatar>
                                                      <span className="text-sm font-medium">{contact.name || 'Unknown Contact'}</span>
                                                  </label>
                                              ))}
                                          </div>
                                      </ScrollArea>
                                  ) : (
                                      <p className="text-sm text-muted-foreground text-center py-4">
                                          No new contacts available to add, or all your contacts are already in this group.
                                      </p>
                                  )}
                              </div>
                              <DialogFooter>
                                  <Button variant="outline" onClick={() => setIsAddMemberDialogOpen(false)} disabled={isAddingMembers}>
                                      Cancel
                                  </Button>
                                  <Button 
                                      onClick={handleAddSelectedMembers} 
                                      disabled={isAddingMembers || selectedContactsToAdd.length === 0 || isLoadingPotentialMembers}
                                  >
                                      {isAddingMembers ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Check className="mr-2 h-4 w-4" />}
                                      {isAddingMembers ? "Adding..." : `Add ${selectedContactsToAdd.length} Member(s)`}
                                  </Button>
                              </DialogFooter>
                          </DialogContent>
                      </Dialog>
                   )}
              </CardHeader>
              <CardContent>
                <ul className="space-y-3">
                  {group.members.map(member => ( 
                    <li key={member.id} className="flex items-center justify-between p-2 border rounded-md">
                      <div className="flex items-center gap-3">
                          <Avatar>
                              <AvatarImage src={member.avatarUrl || undefined} />
                              <AvatarFallback>{getInitials(member.name)}</AvatarFallback>
                          </Avatar>
                          <div>
                              <p className="font-medium">{member.name || member.id.substring(0,10)}</p>
                              <p className="text-xs text-muted-foreground">{member.email || 'No email'}</p>
                          </div>
                      </div>
                      <div>
                          {member.id === group.ownerId && <Badge variant="outline" className="text-primary">Admin</Badge>}
                      </div>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="activity">
            <Card>
              <CardHeader>
                <CardTitle>Activity Log</CardTitle>
                <CardDescription>Recent actions within this group from Firestore.</CardDescription>
              </CardHeader>
              <CardContent>
                {firestoreActivityLogs.length > 0 ? (
                  <ul className="space-y-4">
                    {firestoreActivityLogs.map(log => {
                      const actor = memberDetailsMap.get(log.userId) || group.members.find(m=>m.id === log.userId); 
                      return (
                      <li key={log.id} className="flex items-start gap-3 text-sm p-2 border rounded-md">
                          <Avatar className="h-8 w-8 mt-1">
                              <AvatarImage src={actor?.avatarUrl || undefined} />
                              <AvatarFallback>{getInitials(actor?.name)}</AvatarFallback>
                          </Avatar>
                          <div>
                               <p>
                                  <span className="font-medium">{actor?.name || log.userId.substring(0,6)}</span>
                                  {log.description.includes(actor?.name || 'User') 
                                      ? log.description.substring((actor?.name || 'User').length).trim() 
                                      : ` ${log.description}`} 
                              </p>
                              <p className="text-xs text-muted-foreground">{format(parseISO(log.timestamp), "MMM d, yyyy 'at' h:mm a")}</p>
                          </div>
                      </li>
                    )})}
                  </ul>
                ) : (
                   <p className="text-muted-foreground text-center py-4">No activity recorded yet in Firestore for this group.</p>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </TooltipProvider>
    </div>
  );
}

    