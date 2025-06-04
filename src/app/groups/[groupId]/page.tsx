
"use client";

import { useEffect, useState, useMemo, useCallback } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useParams, useRouter, useSearchParams, usePathname } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ArrowLeft, Users, CreditCard, ListChecks, Activity as ActivityIcon, PlusCircle, Edit, Trash2, UserPlus, DollarSign as DollarSignIcon, Download, Lock, Eye, AlertTriangle, Share2, Link as LinkIconProp, MessageCircle, Facebook, Twitter, Mail, Loader2, Plane, Home as HomeIconLucide, Heart, PartyPopper, Shapes, Check, Paperclip, HandCoins, Send, BarChartHorizontal, Coins as CoinsIcon, TrendingUp, FileText, Edit2, MessageSquare as MessageSquareIcon } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import type { Group, Expense, User as UserType, ActivityLog, Balance, GroupCategory, AppMemberContact, Payment, Contribution, GroupNote } from '@/types';
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
  DialogClose,
} from "@/components/ui/dialog";
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
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
import { ToastAction } from "@/components/ui/toast";
import { useCurrency } from '@/contexts/CurrencyContext';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { Badge } from '@/components/ui/badge';
import { db } from '@/lib/firebase';
import { doc, getDoc, Timestamp, deleteDoc, collection, query, orderBy, getDocs, runTransaction, updateDoc, arrayUnion, writeBatch, serverTimestamp, where, addDoc } from 'firebase/firestore';
import { useNotification } from '@/contexts/NotificationContext';
import React from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { Progress } from '@/components/ui/progress';
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
  fill?: string;
}

const safeParseDate = (dateVal: any, fieldName: string = 'date'): string => {
  if (dateVal instanceof Timestamp) return dateVal.toDate().toISOString();
  if (typeof dateVal === 'string' && dateVal.length > 0) {
    try {
      parseISO(dateVal);
      return dateVal;
    } catch (e) {
      console.warn(`Invalid date string for ${fieldName}:`, dateVal, `- defaulting.`);
      return '1970-01-01T00:00:00.000Z';
    }
  }
  if (typeof dateVal === 'object' && dateVal.seconds && typeof dateVal.seconds === 'number') {
    try {
      return new Date(dateVal.seconds * 1000).toISOString();
    } catch(e) {
       console.warn(`Error converting Firestore-like Timestamp object for ${fieldName}:`, dateVal, `- defaulting.`);
       return '1970-01-01T00:00:00.000Z';
    }
  }
  console.warn(`Unexpected data type or missing value for ${fieldName}:`, dateVal, `- defaulting.`);
  return '1970-01-01T00:00:00.000Z';
};


export default function GroupDetailPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const { currentUser, isLoadingAuth } = useUser();
  const { toast } = useToast();
  const groupId = params.groupId as string;
  const { getCurrencySymbol } = useCurrency();
  const { addNotification } = useNotification();

  const [group, setGroup] = useState<Group | null>(null);
  const [firestoreExpenses, setFirestoreExpenses] = useState<Expense[]>([]);
  const [firestorePayments, setFirestorePayments] = useState<Payment[]>([]);
  const [firestoreContributions, setFirestoreContributions] = useState<Contribution[]>([]);
  const [firestoreActivityLogs, setFirestoreActivityLogs] = useState<ActivityLog[]>([]);
  const [firestoreGroupNotes, setFirestoreGroupNotes] = useState<GroupNote[]>([]);
  const [balances, setBalances] = useState<Balance[]>([]);

  const [isLoadingPageData, setIsLoadingPageData] = useState(true);
  const [accessDenied, setAccessDenied] = useState(false);
  const [groupNotFound, setGroupNotFound] = useState(false);

  const [isWebShareSupported, setIsWebShareSupported] = useState(false);

  const [totalContributions, setTotalContributions] = useState(0);
  const [totalExpenses, setTotalExpenses] = useState(0);

  const [isAddMemberDialogOpen, setIsAddMemberDialogOpen] = useState(false);
  const [potentialNewMembers, setPotentialNewMembers] = useState<UserType[]>([]);
  const [isLoadingPotentialMembers, setIsLoadingPotentialMembers] = useState(false);
  const [selectedContactsToAdd, setSelectedContactsToAdd] = useState<string[]>([]);
  const [isAddingMembers, setIsAddingMembers] = useState(false);

  const [spendingByPayerChartData, setSpendingByPayerChartData] = useState<SpendingByPayerChartData[]>([]);

  const [undoTimeoutId, setUndoTimeoutId] = useState<NodeJS.Timeout | null>(null);
  const [isUndoing, setIsUndoing] = useState(false);

  const [isNoteDialogOpen, setIsNoteDialogOpen] = useState(false);
  const [editingNote, setEditingNote] = useState<GroupNote | null>(null);
  const [noteTitle, setNoteTitle] = useState('');
  const [noteContent, setNoteContent] = useState('');
  const [isSavingNote, setIsSavingNote] = useState(false);
  const [noteToDelete, setNoteToDelete] = useState<GroupNote | null>(null);
  const [isDeletingNote, setIsDeletingNote] = useState(false);


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

    groupContributions.forEach(contrib => {
      if (memberNetBalances[contrib.contributorId] !== undefined) {
        memberNetBalances[contrib.contributorId] += contrib.amount;
      }
    });

    groupExpenses.forEach(expense => {
      if (memberNetBalances[expense.paidByUserId] !== undefined) {
        memberNetBalances[expense.paidByUserId] += expense.amount;
      }
      expense.participants.forEach(p => {
        if (memberNetBalances[p.userId] !== undefined) {
          memberNetBalances[p.userId] -= p.amountOwed;
        }
      });
    });

    groupPayments.forEach(payment => {
      if (memberNetBalances[payment.paidByUserId] !== undefined) {
        memberNetBalances[payment.paidByUserId] -= payment.amount;
      }
      if (memberNetBalances[payment.paidToUserId] !== undefined) {
        memberNetBalances[payment.paidToUserId] += payment.amount;
      }
    });

    const finalBalances: Balance[] = [];
    const creditors: Array<{ id: string, amount: number }> = [];
    const debtors: Array<{ id: string, amount: number }> = [];

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
        const debtorBalanceEntry = finalBalances.find(b => b.userId === debtor.id);
        const creditorBalanceEntry = finalBalances.find(b => b.userId === creditor.id);

        if(debtorBalanceEntry && creditorBalanceEntry) {
            debtorBalanceEntry.owes[creditor.id] = (debtorBalanceEntry.owes[creditor.id] || 0) + amountToSettle;
            creditorBalanceEntry.owedBy[debtor.id] = (creditorBalanceEntry.owedBy[debtor.id] || 0) + amountToSettle;
        }

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
      if(showLoadingSpinner) setIsLoadingPageData(false);
      return;
    }

    if (showLoadingSpinner) setIsLoadingPageData(true);
    setAccessDenied(false);
    setGroupNotFound(false);
    setGroup(null);

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
          createdAt: safeParseDate(groupData.createdAt, 'group.createdAt'),
          category: groupData.category || 'OTHER',
          budgetAmount: groupData.budgetAmount,
        };

        const isMember = fetchedGroup.memberIds.includes(currentUser.id);
        if (fetchedGroup.visibility === 'private' && !isMember) {
          toast({ title: "Access Denied", description: "This is a private group and you are not a member.", variant: "destructive" });
          setAccessDenied(true);
          setGroup(null);
          return;
        }
        setGroup(fetchedGroup);

        const expensesColRef = collection(db, 'groups', groupId, 'expenses');
        const expensesQuery = query(expensesColRef, orderBy('date', 'desc'));
        const expensesSnapshot = await getDocs(expensesQuery);
        const fetchedExpenses = expensesSnapshot.docs.map(docSnap => {
            const data = docSnap.data();
            return {
                id: docSnap.id,
                ...data,
                date: safeParseDate(data.date, `expense[${docSnap.id}].date`),
                createdAt: safeParseDate(data.createdAt, `expense[${docSnap.id}].createdAt`),
                receiptUrl: data.receiptUrl,
                receiptFileName: data.receiptFileName,
            } as Expense;
        });
        setFirestoreExpenses(fetchedExpenses);
        const currentTotalExpenses = fetchedExpenses.reduce((sum, exp) => sum + exp.amount, 0);
        setTotalExpenses(currentTotalExpenses);

        const paymentsColRef = collection(db, 'groups', groupId, 'payments');
        const paymentsQuery = query(paymentsColRef, orderBy('date', 'desc'));
        const paymentsSnapshot = await getDocs(paymentsQuery);
        const fetchedPayments = paymentsSnapshot.docs.map(docSnap => {
            const data = docSnap.data();
            return {
                id: docSnap.id,
                ...data,
                date: safeParseDate(data.date, `payment[${docSnap.id}].date`),
                createdAt: safeParseDate(data.createdAt, `payment[${docSnap.id}].createdAt`),
            } as Payment;
        });
        setFirestorePayments(fetchedPayments);

        const contributionsColRef = collection(db, 'groups', groupId, 'contributions');
        const contributionsQuery = query(contributionsColRef, orderBy('date', 'desc'));
        const contributionsSnapshot = await getDocs(contributionsQuery);
        const fetchedContributions = contributionsSnapshot.docs.map(docSnap => {
            const data = docSnap.data();
            return {
                id: docSnap.id,
                ...data,
                date: safeParseDate(data.date, `contribution[${docSnap.id}].date`),
                createdAt: safeParseDate(data.createdAt, `contribution[${docSnap.id}].createdAt`),
            } as Contribution;
        });
        setFirestoreContributions(fetchedContributions);
        const currentTotalContributions = fetchedContributions.reduce((sum, contrib) => sum + contrib.amount, 0);
        setTotalContributions(currentTotalContributions);

        const groupNotesColRef = collection(db, 'groups', groupId, 'notes');
        const notesQuery = query(groupNotesColRef, orderBy('createdAt', 'desc'));
        const notesSnapshot = await getDocs(notesQuery);
        const fetchedNotes = notesSnapshot.docs.map(docSnap => {
            const data = docSnap.data();
            return {
                id: docSnap.id,
                ...data,
                createdAt: safeParseDate(data.createdAt, `note[${docSnap.id}].createdAt`),
                updatedAt: safeParseDate(data.updatedAt, `note[${docSnap.id}].updatedAt`),
            } as GroupNote;
        });
        setFirestoreGroupNotes(fetchedNotes);

        const activityLogColRef = collection(db, 'groups', groupId, 'activityLog');
        const activityLogQuery = query(activityLogColRef, orderBy('timestamp', 'desc'));
        const activityLogSnapshot = await getDocs(activityLogQuery);
        const fetchedActivityLogs = activityLogSnapshot.docs.map(docSnap => {
            const data = docSnap.data();
            return {
                id: docSnap.id,
                ...data,
                timestamp: safeParseDate(data.timestamp, `activityLog[${docSnap.id}].timestamp`)
            } as ActivityLog;
        });
        setFirestoreActivityLogs(fetchedActivityLogs);

        const calculatedBalances = calculateGroupBalances(fetchedGroup.members, fetchedExpenses, fetchedPayments, fetchedContributions);
        setBalances(calculatedBalances);

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
        setGroupNotFound(true);
        setGroup(null);
      }
    } catch (error) {
      console.error("Error fetching group data:", error);
      toast({ title: "Error fetching group", description: "Could not fetch group details. Please try refreshing.", variant: "destructive" });
      setGroup(null);
    } finally {
      if(showLoadingSpinner) setIsLoadingPageData(false);
    }
  }, [groupId, currentUser, toast, calculateGroupBalances]);

  useEffect(() => {
    if (!isLoadingAuth) {
      if (currentUser && groupId) {
        fetchGroupData();
      } else if (!currentUser) {
        router.push('/login');
        setIsLoadingPageData(false);
      } else if (!groupId) {
        setGroupNotFound(true);
        setIsLoadingPageData(false);
      }
    }
  }, [isLoadingAuth, currentUser, groupId, fetchGroupData, router, searchParams.get('refresh')]);

  const performUndoAddItem = async (
    itemId: string,
    itemType: 'expense' | 'contribution' | 'note',
    itemGroupId: string,
    itemDescription: string,
    actorName: string,
    itemAmount?: number
  ) => {
    if (!group) return;
    setIsUndoing(true);
    try {
        const batch = writeBatch(db);
        const itemCollectionName = itemType === 'expense' ? 'expenses' : itemType === 'contribution' ? 'contributions' : 'notes';
        const itemDocRef = doc(db, 'groups', itemGroupId, itemCollectionName, itemId);
        batch.delete(itemDocRef);

        const activityLogColRef = collection(db, 'groups', itemGroupId, 'activityLog');
        const relatedIdField = itemType === 'expense' ? 'relatedExpenseId' : itemType === 'contribution' ? 'relatedContributionId' : 'relatedNoteId';
        const logsQuery = query(activityLogColRef, where(relatedIdField, '==', itemId));
        const logsSnapshot = await getDocs(logsQuery);
        logsSnapshot.forEach(logDoc => batch.delete(logDoc.ref));

        await batch.commit();

        toast({
            title: "Action Undone",
            description: `${itemType.charAt(0).toUpperCase() + itemType.slice(1)} "${itemDescription}" has been removed.`,
            variant: "default",
        });
        if (group) {
          addNotification({
              title: `${itemType.charAt(0).toUpperCase() + itemType.slice(1)} Undone`,
              message: `The ${itemType} from ${actorName} was removed from group "${group.name}".`,
              type: "info",
          });
        }
        fetchGroupData(false);
    } catch (error) {
        console.error(`Error undoing ${itemType} add:`, error);
        toast({ title: "Undo Failed", description: `Could not undo adding the ${itemType}.`, variant: "destructive" });
    } finally {
        setIsUndoing(false);
    }
  };

  useEffect(() => {
    if (undoTimeoutId) {
        clearTimeout(undoTimeoutId);
        setUndoTimeoutId(null);
    }

    if (isLoadingPageData || accessDenied || groupNotFound || !group) {
        return;
    }

    const undoActionParam = searchParams.get('undoAction') as 'expense' | 'contribution' | 'note' | null;
    const itemId = searchParams.get('itemId');

    if (undoActionParam && itemId) {
        const itemDetailsString = sessionStorage.getItem('undoItemDetails');
        if (itemDetailsString) {
            const itemDetails = JSON.parse(itemDetailsString);
            if (itemDetails.itemId === itemId && itemDetails.groupId === groupId && itemDetails.itemType === undoActionParam) {
                sessionStorage.removeItem('undoItemDetails');

                const newSearchParams = new URLSearchParams(searchParams.toString());
                newSearchParams.delete('undoAction');
                newSearchParams.delete('itemId');
                router.replace(`${pathname}?${newSearchParams.toString()}`, { scroll: false });

                const { dismiss: dismissToast } = toast({
                    title: `${itemDetails.itemType.charAt(0).toUpperCase() + itemDetails.itemType.slice(1)} Added!`,
                    description: `"${itemDetails.description}" ${itemDetails.amount ? `(${getCurrencySymbol()}${itemDetails.amount.toFixed(2)})` : ''} was recorded.`,
                    duration: 7000,
                    action: (
                        <ToastAction
                            altText="Undo"
                            onClick={async () => {
                                if (undoTimeoutId) clearTimeout(undoTimeoutId);
                                setUndoTimeoutId(null);
                                dismissToast();
                                await performUndoAddItem(
                                    itemDetails.itemId,
                                    itemDetails.itemType,
                                    itemDetails.groupId,
                                    itemDetails.description,
                                    itemDetails.actorName,
                                    itemDetails.amount
                                );
                            }}
                            disabled={isUndoing}
                        >
                            {isUndoing ? <Loader2 className="h-4 w-4 animate-spin"/> : "Undo"}
                        </ToastAction>
                    ),
                });

                const newTimeout = setTimeout(() => {
                  setUndoTimeoutId(null);
                }, 7500);
                setUndoTimeoutId(newTimeout);
            } else {
                sessionStorage.removeItem('undoItemDetails');
            }
        }
    }
    return () => {
        if (undoTimeoutId) {
            clearTimeout(undoTimeoutId);
        }
    };
  }, [searchParams, group, groupId, router, toast, addNotification, getCurrencySymbol, isUndoing, isLoadingPageData, accessDenied, groupNotFound, pathname, undoTimeoutId, fetchGroupData]);


  useEffect(() => {
    if (typeof navigator !== "undefined" && navigator.share) {
      setIsWebShareSupported(true);
    }
  }, []);

  const handleDownloadPdf = () => {
    if (!group || !currentUser) return;
    const doc = new jsPDF() as jsPDFWithAutoTable;
    const currencySymbol = getCurrencySymbol();
    let yPos = 15;

    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text(`HisabKaro - Group Report: ${group.name}`, 14, yPos);
    yPos += 8;

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(150);
    doc.text(group.visibility === 'public' ? 'Public Group' : 'Private Group', 14, yPos);
    yPos += 5;
    if (group.description) {
      const splitDescription = doc.splitTextToSize(group.description, 180);
      doc.text(splitDescription, 14, yPos);
      yPos += (splitDescription.length * 4) + 3;
    }
    doc.setTextColor(0);
    doc.text(`Report generated on: ${format(new Date(), "MMMM d, yyyy 'at' h:mm a")}`, 14, yPos);
    yPos += 5;
    doc.text(`Currency: ${currencySymbol === '₹' ? 'INR' : 'USD'} (${currencySymbol})`, 14, yPos);
    yPos += 8;

    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text("Financial Summary", 14, yPos);
    yPos += 6;
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    const summaryData = [
        ["Total Contributions:", `${currencySymbol}${totalContributions.toFixed(2)}`],
        ["Total Expenses:", `${currencySymbol}${totalExpenses.toFixed(2)}`],
        ["Remaining Group Funds:", `${currencySymbol}${(totalContributions - totalExpenses).toFixed(2)}`],
    ];
    if (group.budgetAmount && group.budgetAmount > 0) {
        summaryData.push(["Group Budget:", `${currencySymbol}${group.budgetAmount.toFixed(2)}`]);
        summaryData.push(["Remaining Budget:", `${currencySymbol}${(group.budgetAmount - totalExpenses).toFixed(2)}`]);
    }
    doc.autoTable({
        body: summaryData,
        startY: yPos,
        theme: 'plain',
        styles: { fontSize: 10, cellPadding: 1.5 },
        columnStyles: { 0: { fontStyle: 'bold' } }
    });
    yPos = doc.autoTable.previous.finalY + 8;


    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text("Group Members", 14, yPos);
    yPos += 6;
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    group.members.forEach(member => {
      doc.text(`- ${member.name || 'N/A'} (${member.email || 'N/A'})${member.id === group.ownerId ? ' (Admin)' : ''}`, 16, yPos);
      yPos += 5;
    });
    yPos += 3;

    if (firestoreContributions.length > 0) {
      if (yPos > 250) { doc.addPage(); yPos = 20; }
      doc.setFontSize(12); doc.setFont('helvetica', 'bold');
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
        headStyles: { fillColor: [22, 160, 133], fontSize: 9 },
        styles: { fontSize: 9, cellPadding: 1.5 },
        margin: { top: yPos }
      });
      yPos = doc.autoTable.previous.finalY + 8;
    }

    if (firestoreExpenses.length > 0) {
      if (yPos > 250) { doc.addPage(); yPos = 20; }
      doc.setFontSize(12); doc.setFont('helvetica', 'bold');
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
        headStyles: { fillColor: [52, 73, 94], fontSize: 9 },
        styles: { fontSize: 9, cellPadding: 1.5 },
        margin: { top: yPos }
      });
      yPos = doc.autoTable.previous.finalY + 8;
    } else {
      doc.setFontSize(10);
      doc.text("No expenses recorded for this group.", 14, yPos);
      yPos += 8;
    }

    if (firestorePayments.length > 0) {
      if (yPos > 250) { doc.addPage(); yPos = 20; }
      doc.setFontSize(12); doc.setFont('helvetica', 'bold');
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
        headStyles: { fillColor: [40, 116, 166], fontSize: 9 },
        styles: { fontSize: 9, cellPadding: 1.5 },
        margin: { top: yPos }
      });
      yPos = doc.autoTable.previous.finalY + 8;
    }

    if (balances.length > 0) {
      if (yPos > 250) { doc.addPage(); yPos = 20; }
      doc.setFontSize(12); doc.setFont('helvetica', 'bold');
      doc.text("Net Balances (After All Transactions)", 14, yPos);
      yPos += 6;
      const balanceSummary: string[][] = [];
      balances.forEach(balance => {
        const user = memberDetailsMap.get(balance.userId);
        if (!user) return;
        let balanceText = "";
        if (balance.netBalance > 0.005) {
          balanceText = `Is Owed by Group Fund: ${currencySymbol}${balance.netBalance.toFixed(2)}`;
        } else if (balance.netBalance < -0.005) {
          balanceText = `Owes to Group Fund: ${currencySymbol}${Math.abs(balance.netBalance).toFixed(2)}`;
        } else {
          balanceText = "Settled with Group Fund";
        }
        balanceSummary.push([user.name || balance.userId.substring(0,6), balanceText]);
      });
       doc.autoTable({
        startY: yPos,
        head: [['Member', 'Net Position with Group Fund']],
        body: balanceSummary,
        theme: 'grid',
        headStyles: { fillColor: [52, 73, 94], fontSize: 9 },
        styles: { fontSize: 9, cellPadding: 1.5 },
        margin: { top: yPos }
      });
      yPos = doc.autoTable.previous.finalY + 8;

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
        if (yPos > 240) { doc.addPage(); yPos = 20; }
        doc.setFontSize(12); doc.setFont('helvetica', 'bold');
        doc.text("Simplified Settlement Suggestions", 14, yPos);
        yPos += 6;
        doc.setFontSize(9); doc.setFont('helvetica', 'normal');
        const splitOwesText = doc.splitTextToSize(detailedOwesText, 180);
        doc.text(splitOwesText, 14, yPos);
      }
    } else {
      doc.setFontSize(10);
      doc.text("No balances to display or balances are being calculated.", 14, yPos);
      yPos += 8;
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

  const handleCopyLink = async () => { if (!group) return; try { await navigator.clipboard.writeText(groupUrl); toast({ title: "Link Copied!", description: "Group link copied to clipboard." }); } catch (err) { console.error('Failed to copy: ', err); toast({ title: "Copy Failed", description: "Could not copy link to clipboard.", variant: "destructive" }); } };
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
        const subcollections = ['expenses', 'payments', 'contributions', 'activityLog', 'notes'];
        for (const subcollection of subcollections) {
            const colRef = collection(db, 'groups', groupId, subcollection);
            const snapshot = await getDocs(query(colRef)); // No transaction needed for getDocs
            snapshot.forEach(docSnap => transaction.delete(docSnap.ref));
        }
        transaction.delete(groupDocRef);
      });

      toast({ title: "Group Deleted", description: `Group "${groupName}" and all its data have been deleted from Firestore.`});
      addNotification({ title: "Group Deleted", message: `You deleted the group: "${groupName}"`, type: "destructive", });
      router.push('/groups');
    } catch (error) {
      console.error("Error deleting group and its subcollections:", error);
      toast({ title: "Error", description: "Could not delete group. Subcollections might still exist.", variant: "destructive"});
      addNotification({ title: "Group Deletion Failed", message: `Could not delete group: "${groupName}"`, type: "destructive",});
    }
  };

  const fetchPotentialNewMembers = async () => {
    if (!currentUser || !group) return;
    setIsLoadingPotentialMembers(true);
    try {
      const contactsCollectionRef = collection(db, "appMemberContacts");
      const q = query( contactsCollectionRef, where("addedByUid", "==", currentUser.id), orderBy("name", "asc") );
      const contactsSnapshot = await getDocs(q);
      const contactsList = contactsSnapshot.docs
        .map(docSnap => ({ id: docSnap.id, ...docSnap.data() } as UserType))
        .filter(contact => !group.memberIds.includes(contact.id));
      setPotentialNewMembers(contactsList);
    } catch (error) {
      console.error("Error fetching potential new members:", error);
      toast({ title: "Error", description: "Could not load your contacts.", variant: "destructive" });
    } finally {
      setIsLoadingPotentialMembers(false);
    }
  };

  const handleAddMemberDialogOpenChange = (open: boolean) => { setIsAddMemberDialogOpen(open); if (open) { fetchPotentialNewMembers(); setSelectedContactsToAdd([]); } };
  const handleToggleContactSelection = (contactId: string) => { setSelectedContactsToAdd(prev => prev.includes(contactId) ? prev.filter(id => id !== contactId) : [...prev, contactId]); };

  const handleAddSelectedMembers = async () => {
    if (!currentUser || !group || selectedContactsToAdd.length === 0) {
      toast({ title: "No members selected", variant: "destructive" }); return;
    }
    setIsAddingMembers(true);
    try {
      const groupDocRef = doc(db, 'groups', groupId);
      const batch = writeBatch(db);
      const newMemberObjects: UserType[] = [];
      selectedContactsToAdd.forEach(contactId => {
        const contact = potentialNewMembers.find(p => p.id === contactId);
        if (contact) { newMemberObjects.push({ id: contact.id, name: contact.name, email: null, avatarUrl: contact.avatarUrl || '' }); }
      });
      batch.update(groupDocRef, { memberIds: arrayUnion(...selectedContactsToAdd), members: arrayUnion(...newMemberObjects) });
      const activityLogColRef = collection(db, 'groups', groupId, 'activityLog');
      newMemberObjects.forEach(member => {
        const logEntry: Omit<ActivityLog, 'id' | 'timestamp'> = { groupId: groupId, userId: currentUser.id, actorName: currentUser.name, actionType: 'member_added', description: `${currentUser.name || 'Admin'} added ${member.name || 'a new member'} to the group.`, relatedUserId: member.id, };
        batch.set(doc(activityLogColRef), { ...logEntry, timestamp: serverTimestamp() });
        if (group) { addNotification({ title: "Member Added to Group", message: `You added ${member.name || 'a new member'} to "${group.name}".`, type: "success", href: `/groups/${groupId}`, }); }
      });
      await batch.commit();
      toast({ title: "Members Added!", description: `${newMemberObjects.length} member(s) added to the group.` });
      setIsAddMemberDialogOpen(false); fetchGroupData(false);
    } catch (error) {
      console.error("Error adding members to group:", error);
      if (group) { toast({ title: "Error", description: "Could not add members to the group.", variant: "destructive" }); addNotification({ title: "Failed to Add Members", message: `Could not add members to "${group.name}".`, type: "destructive", }); }
    } finally { setIsAddingMembers(false); }
  };


  const handleOpenNoteDialog = (note: GroupNote | null = null) => {
    if (note) {
      setEditingNote(note);
      setNoteTitle(note.title);
      setNoteContent(note.content);
    } else {
      setEditingNote(null);
      setNoteTitle('');
      setNoteContent('');
    }
    setIsNoteDialogOpen(true);
  };

  const handleSaveNote = async () => {
    if (!currentUser || !group) return;
    if (!noteTitle.trim()) {
      toast({ title: "Note title required", variant: "destructive" });
      return;
    }
    setIsSavingNote(true);
    const noteData = {
      groupId,
      title: noteTitle.trim(),
      content: noteContent.trim(),
      createdByUserId: editingNote ? editingNote.createdByUserId : currentUser.id,
      createdByName: editingNote ? editingNote.createdByName : currentUser.name || "Unknown User",
      updatedAt: serverTimestamp(),
    };

    try {
      const batch = writeBatch(db);
      let noteId = editingNote?.id;
      let actionType: ActivityLog['actionType'] = 'note_added';
      let activityDescription = `${currentUser.name || 'User'} added note: "${noteData.title}"`;

      if (editingNote) { // Editing existing note
        actionType = 'note_edited';
        activityDescription = `${currentUser.name || 'User'} edited note: "${noteData.title}"`;
        const noteRef = doc(db, 'groups', groupId, 'notes', editingNote.id);
        batch.update(noteRef, noteData);
      } else { // Adding new note
        const notesColRef = collection(db, 'groups', groupId, 'notes');
        const newNoteRef = doc(notesColRef);
        noteId = newNoteRef.id;
        batch.set(newNoteRef, { ...noteData, createdAt: serverTimestamp() });
      }

      const activityLogColRef = collection(db, 'groups', groupId, 'activityLog');
      const activityLog: Omit<ActivityLog, 'id' | 'timestamp'> = {
        groupId,
        userId: currentUser.id,
        actorName: currentUser.name,
        actionType,
        description: activityDescription,
        relatedNoteId: noteId,
      };
      batch.set(doc(activityLogColRef), { ...activityLog, timestamp: serverTimestamp() });

      await batch.commit();
      toast({ title: editingNote ? "Note Updated!" : "Note Added!", description: `Note "${noteData.title}" has been saved.` });
      addNotification({ title: editingNote ? "Note Updated" : "Note Added", message: `Note "${noteData.title}" saved in group "${group.name}".`, type: "success", href: `/groups/${groupId}?tab=notes` });
      setIsNoteDialogOpen(false);
      fetchGroupData(false);
    } catch (error) {
      console.error("Error saving note:", error);
      toast({ title: "Error", description: "Could not save note.", variant: "destructive" });
    } finally {
      setIsSavingNote(false);
    }
  };

  const handleDeleteNote = async () => {
    if (!noteToDelete || !currentUser || !group) return;
    if (noteToDelete.createdByUserId !== currentUser.id && group.ownerId !== currentUser.id) {
      toast({ title: "Permission Denied", description: "You can only delete notes you created or if you are the group owner.", variant: "destructive" });
      setNoteToDelete(null);
      return;
    }
    setIsDeletingNote(true);
    try {
      const batch = writeBatch(db);
      const noteRef = doc(db, 'groups', groupId, 'notes', noteToDelete.id);
      batch.delete(noteRef);

      const activityLogColRef = collection(db, 'groups', groupId, 'activityLog');
      const activityLog: Omit<ActivityLog, 'id' | 'timestamp'> = {
        groupId,
        userId: currentUser.id,
        actorName: currentUser.name,
        actionType: 'note_deleted',
        description: `${currentUser.name || 'User'} deleted note: "${noteToDelete.title}"`,
        relatedNoteId: noteToDelete.id,
      };
      batch.set(doc(activityLogColRef), { ...activityLog, timestamp: serverTimestamp() });
      
      // Also delete previous activity logs related to this note if any (like 'note_added', 'note_edited')
      const prevLogsQuery = query(activityLogColRef, where('relatedNoteId', '==', noteToDelete.id));
      const prevLogsSnap = await getDocs(prevLogsQuery);
      prevLogsSnap.forEach(logDoc => batch.delete(logDoc.ref));


      await batch.commit();
      toast({ title: "Note Deleted", description: `Note "${noteToDelete.title}" has been deleted.` });
      addNotification({ title: "Note Deleted", message: `Note "${noteToDelete.title}" deleted from group "${group.name}".`, type: "info" });
      setNoteToDelete(null);
      fetchGroupData(false);
    } catch (error) {
      console.error("Error deleting note:", error);
      toast({ title: "Error", description: "Could not delete note.", variant: "destructive" });
    } finally {
      setIsDeletingNote(false);
    }
  };


  if (isLoadingAuth || isLoadingPageData) {
    return ( <div className="flex items-center justify-center min-h-[calc(100vh-10rem)]"> <Loader2 className="h-12 w-12 animate-spin text-primary" /> </div> );
  }
  if (accessDenied) {
    return ( <div className="flex flex-col items-center justify-center min-h-[calc(100vh-15rem)] text-center p-4"> <AlertTriangle className="w-16 h-16 text-destructive mb-4" /> <h1 className="text-3xl font-bold mb-2">Access Denied</h1> <p className="text-lg text-muted-foreground mb-6"> You do not have permission to view this group. </p> <Button asChild><Link href="/groups">Back to Groups</Link></Button> </div> );
  }
  if (!currentUser) {
    return ( <div className="flex flex-col items-center justify-center min-h-[calc(100vh-15rem)] text-center p-4"> <AlertTriangle className="w-16 h-16 text-destructive mb-4" /> <h1 className="text-3xl font-bold mb-2">Authentication Required</h1> <p className="text-lg text-muted-foreground mb-6">Please log in to view this page.</p> <Button asChild><Link href="/login">Go to Login</Link></Button> </div> );
  }
  if (groupNotFound || !group) {
    return ( <div className="flex flex-col items-center justify-center min-h-[calc(100vh-10rem)] text-center p-4"> <AlertTriangle className="w-16 h-16 text-muted-foreground mb-4" /> <h1 className="text-3xl font-bold mb-2">Group Not Found</h1> <p className="text-lg text-muted-foreground mb-6"> The group you are looking for does not exist or could not be loaded. It might have been deleted. </p> <Button asChild><Link href="/groups">Back to Groups</Link></Button> </div> );
  }

  const isMember = group.memberIds.includes(currentUser.id);
  const isOwner = group.ownerId === currentUser.id;
  const CategoryIcon = groupCategoryIcons[group.category || 'OTHER'] || Shapes;
  const currencySymbol = getCurrencySymbol();
  const remainingFunds = totalContributions - totalExpenses;
  const budgetAmount = group.budgetAmount || 0;
  const budgetProgress = budgetAmount > 0 ? Math.min((totalExpenses / budgetAmount) * 100, 100) : 0;
  const remainingBudget = budgetAmount > 0 ? budgetAmount - totalExpenses : 0;

  const chartConfigSpendingByPayer = { totalPaid: { label: `Total Paid (${currencySymbol})`, }, ...spendingByPayerChartData.reduce((acc, member) => { acc[member.name] = { label: member.name, color: member.fill }; return acc; }, {} as ChartConfig) } satisfies ChartConfig;

  return (
    <div className="space-y-6">
      <Button variant="outline" size="sm" asChild className="mb-4">
        <Link href="/groups"> <ArrowLeft className="mr-2 h-4 w-4" /> Back to Groups </Link>
      </Button>

      <Card>
        <CardHeader className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
          <div className="flex items-start gap-4">
            {group.photoUrl ? ( <Image src={group.photoUrl} alt={group.name} width={100} height={100} className="rounded-lg object-cover h-24 w-24 md:h-28 md:w-28 shadow-md" data-ai-hint={group.dataAiHint || "group image"} priority /> ) : ( <div className="rounded-lg h-24 w-24 md:h-28 md:w-28 flex items-center justify-center bg-muted shadow-md"> <CategoryIcon className="h-12 w-12 md:h-14 md:w-14 text-muted-foreground" /> </div> )}
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1 flex-wrap"> <CardTitle className="text-3xl">{group.name}</CardTitle> {group.visibility === 'public' ? ( <Badge variant="outline" className="text-sm flex items-center gap-1"><Eye className="h-4 w-4"/>Public</Badge> ) : ( <Badge variant="secondary" className="text-sm flex items-center gap-1"><Lock className="h-4 w-4"/>Private</Badge> )} </div>
              <CardDescription className="text-base">{group.description}</CardDescription>
              <p className="text-xs text-muted-foreground mt-2">Created on: {format(parseISO(group.createdAt), "MMMM d, yyyy")}</p>
              {isMember && isOwner && <Badge variant="default" className="mt-2">You are the Admin</Badge>}
              {isMember && !isOwner && <Badge variant="outline" className="mt-2">You are a Member</Badge>}
              {!isMember && group.visibility === 'public' && <Badge variant="outline" className="mt-2">Viewing as Non-Member</Badge>}
            </div>
          </div>
          {isOwner && (
            <div className="flex gap-2 mt-4 md:mt-0 self-start">
              <Button variant="outline" size="sm" asChild> <Link href={`/groups/${groupId}/edit`}> <Edit className="mr-2 h-4 w-4" /> Edit Group </Link> </Button>
              <AlertDialog>
                <AlertDialogTrigger asChild> <Button variant="destructive" size="sm"> <Trash2 className="mr-2 h-4 w-4" /> Delete Group </Button> </AlertDialogTrigger>
                <AlertDialogContent> <AlertDialogHeader> <AlertDialogTitle>Are you sure?</AlertDialogTitle> <AlertDialogDescription> This action cannot be undone. This will permanently delete the group "{group.name}" and all its associated data (expenses, activity logs, payments, contributions, notes) from Firestore. </AlertDialogDescription> </AlertDialogHeader> <AlertDialogFooter> <AlertDialogCancel>Cancel</AlertDialogCancel> <AlertDialogAction onClick={handleDeleteGroup} className="bg-destructive hover:bg-destructive/90"> Delete </AlertDialogAction> </AlertDialogFooter> </AlertDialogContent>
              </AlertDialog>
            </div>
          )}
        </CardHeader>
        <CardContent className="pt-2 pb-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div className="p-3 rounded-md bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-700"> <p className="text-xs text-green-700 dark:text-green-400">Total Contributions</p> <p className="text-lg font-semibold text-green-600 dark:text-green-300">{currencySymbol}{totalContributions.toFixed(2)}</p> </div>
            <div className="p-3 rounded-md bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-700"> <p className="text-xs text-red-700 dark:text-red-400">Total Expenses</p> <p className="text-lg font-semibold text-red-600 dark:text-red-300">{currencySymbol}{totalExpenses.toFixed(2)}</p> </div>
            <div className={`p-3 rounded-md border ${remainingFunds >= 0 ? 'bg-blue-50 dark:bg-blue-900/30 border-blue-200 dark:border-blue-700' : 'bg-orange-50 dark:bg-orange-900/30 border-orange-200 dark:border-orange-700'}`}> <p className={`text-xs ${remainingFunds >= 0 ? 'text-blue-700 dark:text-blue-400' : 'text-orange-700 dark:text-orange-400'}`}>Remaining Funds</p> <p className={`text-lg font-semibold ${remainingFunds >= 0 ? 'text-blue-600 dark:text-blue-300' : 'text-orange-600 dark:text-orange-300'}`}> {currencySymbol}{remainingFunds.toFixed(2)} </p> </div>
             {group.budgetAmount && group.budgetAmount > 0 && ( <div className="p-3 rounded-md bg-purple-50 dark:bg-purple-900/30 border border-purple-200 dark:border-purple-700 col-span-2 md:col-span-1"> <p className="text-xs text-purple-700 dark:text-purple-400">Budget vs Spent</p> <p className="text-lg font-semibold text-purple-600 dark:text-purple-300"> {currencySymbol}{totalExpenses.toFixed(2)} / {currencySymbol}{budgetAmount.toFixed(2)} </p> <Progress value={budgetProgress} className="h-2 mt-1 bg-purple-200 dark:bg-purple-700 [&>div]:bg-purple-500" /> <p className={`text-xs mt-0.5 ${remainingBudget >= 0 ? 'text-purple-600 dark:text-purple-300' : 'text-orange-600 dark:text-orange-400 font-medium'}`}> {remainingBudget >= 0 ? `${currencySymbol}${remainingBudget.toFixed(2)} remaining` : `${currencySymbol}${Math.abs(remainingBudget).toFixed(2)} over budget`} </p> </div> )}
          </div>
        </CardContent>
      </Card>

      <Dialog open={isNoteDialogOpen} onOpenChange={setIsNoteDialogOpen}>
        <DialogContent className="sm:max-w-[480px]">
          <DialogHeader>
            <DialogTitle>{editingNote ? 'Edit Note' : 'Add New Note'}</DialogTitle>
            <DialogDescription>
              {editingNote ? 'Update the details of your note.' : 'Create a new note for this group.'}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="note-title" className="text-right">Title*</Label>
              <Input id="note-title" value={noteTitle} onChange={(e) => setNoteTitle(e.target.value)} className="col-span-3" placeholder="Note title" disabled={isSavingNote} />
            </div>
            <div className="grid grid-cols-4 items-start gap-4">
              <Label htmlFor="note-content" className="text-right pt-2">Content</Label>
              <Textarea id="note-content" value={noteContent} onChange={(e) => setNoteContent(e.target.value)} className="col-span-3 min-h-[100px]" placeholder="Write your note here..." disabled={isSavingNote} />
            </div>
          </div>
          <DialogFooter>
            <DialogClose asChild><Button type="button" variant="outline" disabled={isSavingNote}>Cancel</Button></DialogClose>
            <Button type="button" onClick={handleSaveNote} disabled={isSavingNote || !noteTitle.trim()}>
              {isSavingNote ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : (editingNote ? <Save className="mr-2 h-4 w-4" /> : <PlusCircle className="mr-2 h-4 w-4" />)}
              {isSavingNote ? 'Saving...' : (editingNote ? 'Save Changes' : 'Add Note')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!noteToDelete} onOpenChange={(open) => !open && setNoteToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure you want to delete this note?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. The note "{noteToDelete?.title}" will be permanently deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setNoteToDelete(null)} disabled={isDeletingNote}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteNote} disabled={isDeletingNote} className="bg-destructive hover:bg-destructive/90">
              {isDeletingNote ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>


      <TooltipProvider>
        <Tabs defaultValue="expenses" className="w-full" value={searchParams.get('tab') || 'expenses'} onValueChange={(value) => router.replace(`/groups/${groupId}?tab=${value}`, { scroll: false })}>
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 gap-4">
            <TabsList>
              <TabsTrigger value="expenses"><CreditCard className="mr-2 h-4 w-4 sm:hidden md:inline-block" />Expenses</TabsTrigger>
              <TabsTrigger value="notes"><FileText className="mr-2 h-4 w-4 sm:hidden md:inline-block" />Notes</TabsTrigger>
              <TabsTrigger value="contributions"><CoinsIcon className="mr-2 h-4 w-4 sm:hidden md:inline-block" />Contributions</TabsTrigger>
              <TabsTrigger value="payments"><HandCoins className="mr-2 h-4 w-4 sm:hidden md:inline-block" />Payments</TabsTrigger>
              <TabsTrigger value="balances"><ListChecks className="mr-2 h-4 w-4 sm:hidden md:inline-block" />Balances</TabsTrigger>
              <TabsTrigger value="reports"><BarChartHorizontal className="mr-2 h-4 w-4 sm:hidden md:inline-block" />Reports</TabsTrigger>
              <TabsTrigger value="members"><Users className="mr-2 h-4 w-4 sm:hidden md:inline-block" />Members</TabsTrigger>
              <TabsTrigger value="activity"><ActivityIcon className="mr-2 h-4 w-4 sm:hidden md:inline-block" />Activity</TabsTrigger>
            </TabsList>
             <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
              {isMember && ( <> <Button asChild className="flex-1 sm:flex-none"> <Link href={`/groups/${groupId}/add-expense`}> <PlusCircle className="mr-2 h-4 w-4" /> Add Expense </Link> </Button> <Button variant="secondary" asChild className="flex-1 sm:flex-none"> <Link href={`/groups/${groupId}/add-contribution`}> <CoinsIcon className="mr-2 h-4 w-4" /> Add Funds </Link> </Button> <Button variant="outline" asChild className="flex-1 sm:flex-none"> <Link href={`/groups/${groupId}/settle-up`}> <DollarSignIcon className="mr-2 h-4 w-4" /> Settle Up </Link> </Button> </> )}
               <Button variant="outline" onClick={handleDownloadPdf} className="flex-1 sm:flex-none"> <Download className="mr-2 h-4 w-4" /> Download PDF </Button>
              {(group.visibility === 'public' || isMember) && ( <DropdownMenu> <DropdownMenuTrigger asChild> <Button variant="outline" className="flex-1 sm:flex-none"> <Share2 className="mr-2 h-4 w-4" /> Share Group </Button> </DropdownMenuTrigger> <DropdownMenuContent align="end" className="w-56"> <DropdownMenuLabel>Share "{group.name}"</DropdownMenuLabel> <DropdownMenuSeparator /> {isWebShareSupported && ( <DropdownMenuItem onClick={handleNativeShare} className="cursor-pointer"> <Share2 className="mr-2 h-4 w-4" /> Share via System </DropdownMenuItem> )} <DropdownMenuItem onClick={handleCopyLink} className="cursor-pointer"> <LinkIconProp className="mr-2 h-4 w-4" /> Copy Link </DropdownMenuItem> <DropdownMenuItem onClick={handleShareWhatsApp} className="cursor-pointer"> <MessageSquareIcon className="mr-2 h-4 w-4" /> Share on WhatsApp </DropdownMenuItem> <DropdownMenuItem onClick={handleShareFacebook} className="cursor-pointer"> <Facebook className="mr-2 h-4 w-4" /> Share on Facebook </DropdownMenuItem> <DropdownMenuItem onClick={handleShareTwitter} className="cursor-pointer"> <Twitter className="mr-2 h-4 w-4" /> Share on Twitter </DropdownMenuItem> <DropdownMenuItem onClick={handleShareEmail} className="cursor-pointer"> <Mail className="mr-2 h-4 w-4" /> Share via Email </DropdownMenuItem> </DropdownMenuContent> </DropdownMenu> )}
            </div>
          </div>

          <TabsContent value="expenses">
            <Card>
              <CardHeader> <CardTitle>Expenses</CardTitle> <CardDescription>All expenses recorded in this group from Firestore.</CardDescription> </CardHeader>
              <CardContent>
                {firestoreExpenses.length > 0 ? (
                  <ul className="space-y-4">
                    {firestoreExpenses.map(expense => {
                      const payer = memberDetailsMap.get(expense.paidByUserId);
                      const currentUserShare = expense.participants.find(p => p.userId === currentUser.id);
                      return (
                      <li key={expense.id} className="flex items-center justify-between p-3 border rounded-md hover:bg-muted/50">
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                          <Avatar className="h-10 w-10"> <AvatarImage src={payer?.avatarUrl || undefined} /> <AvatarFallback>{getInitials(payer?.name)}</AvatarFallback> </Avatar>
                          <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-1.5"> <p className="font-medium truncate">{expense.description}</p>
                                {expense.receiptFileName && ( <Tooltip> <TooltipTrigger asChild> {expense.receiptUrl ? ( <Link href={expense.receiptUrl} target="_blank" rel="noopener noreferrer" aria-label={`View receipt for ${expense.description}`}> <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:text-primary shrink-0"> <Paperclip className="h-4 w-4" /> </Button> </Link> ) : ( <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground/50 hover:text-primary shrink-0 cursor-not-allowed" disabled> <Paperclip className="h-4 w-4" /> </Button> )} </TooltipTrigger> <TooltipContent> <p> {expense.receiptUrl ? "View Receipt: " : "Receipt: "} {expense.receiptFileName} </p> {!expense.receiptUrl && <p className="text-xs">(Offline, not uploaded)</p>} </TooltipContent> </Tooltip> )}
                              </div> <p className="text-sm text-muted-foreground"> Paid by {payer?.name || expense.paidByUserId.substring(0,6)} on {format(parseISO(expense.date), "MMM d, yyyy")} </p>
                          </div>
                        </div>
                        <div className="text-right ml-2"> <p className="text-lg font-semibold">{currencySymbol}{expense.amount.toFixed(2)}</p> {isMember && currentUserShare && ( <p className="text-xs text-blue-600 dark:text-blue-400">Your share: {currencySymbol}{currentUserShare.amountOwed.toFixed(2)}</p> )} </div>
                      </li> )})}
                  </ul>
                ) : ( <p className="text-muted-foreground text-center py-4">No expenses recorded yet in Firestore for this group.</p> )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="notes">
            <Card>
              <CardHeader className="flex flex-row justify-between items-center">
                <div>
                  <CardTitle>Group Notes</CardTitle>
                  <CardDescription>Shared notes and information for this group.</CardDescription>
                </div>
                {isMember && (
                  <Button onClick={() => handleOpenNoteDialog()} size="sm">
                    <PlusCircle className="mr-2 h-4 w-4" /> Add Note
                  </Button>
                )}
              </CardHeader>
              <CardContent>
                {firestoreGroupNotes.length > 0 ? (
                  <div className="space-y-4">
                    {firestoreGroupNotes.map(note => {
                      const canEditOrDelete = isOwner || (currentUser && note.createdByUserId === currentUser.id);
                      return (
                        <Card key={note.id} className="shadow-sm">
                          <CardHeader>
                            <div className="flex justify-between items-start">
                              <CardTitle className="text-lg">{note.title}</CardTitle>
                              {canEditOrDelete && (
                                <div className="flex gap-1">
                                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleOpenNoteDialog(note)}>
                                    <Edit2 className="h-4 w-4" />
                                    <span className="sr-only">Edit Note</span>
                                  </Button>
                                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setNoteToDelete(note)}>
                                    <Trash2 className="h-4 w-4 text-destructive" />
                                    <span className="sr-only">Delete Note</span>
                                  </Button>
                                </div>
                              )}
                            </div>
                            <CardDescription className="text-xs">
                              By {note.createdByName} on {format(parseISO(note.createdAt), "MMM d, yyyy")}
                              {note.createdAt !== note.updatedAt && ` (edited ${format(parseISO(note.updatedAt), "MMM d, yyyy")})`}
                            </CardDescription>
                          </CardHeader>
                          <CardContent>
                            <p className="text-sm whitespace-pre-wrap">{note.content}</p>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-muted-foreground text-center py-4">No notes added yet for this group.</p>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="contributions">
            <Card>
              <CardHeader> <CardTitle>Fund Contributions</CardTitle> <CardDescription>All funds contributed by members to this group's pool.</CardDescription> </CardHeader>
              <CardContent> {firestoreContributions.length > 0 ? ( <ul className="space-y-4"> {firestoreContributions.map(contribution => { const contributor = memberDetailsMap.get(contribution.contributorId); return ( <li key={contribution.id} className="flex items-center justify-between p-3 border rounded-md hover:bg-muted/50"> <div className="flex items-center gap-3"> <Avatar className="h-10 w-10"> <AvatarImage src={contributor?.avatarUrl || undefined} alt={contributor?.name} /> <AvatarFallback>{getInitials(contributor?.name)}</AvatarFallback> </Avatar> <div> <p className="font-medium"> {contributor?.name || contribution.contributorId.substring(0,6)} contributed </p> <p className="text-sm text-muted-foreground"> On {format(parseISO(contribution.date), "MMM d, yyyy")} {contribution.description && ` - ${contribution.description}`} </p> </div> </div> <div className="text-right ml-2"> <p className="text-lg font-semibold text-green-600 dark:text-green-400"> +{currencySymbol}{contribution.amount.toFixed(2)} </p> </div> </li> ); })} </ul> ) : ( <p className="text-muted-foreground text-center py-4">No contributions recorded yet for this group.</p> )} </CardContent>
               <CardFooter> <Button asChild className="ml-auto"> <Link href={`/groups/${groupId}/add-contribution`}> <CoinsIcon className="mr-2 h-4 w-4" /> Record Contribution </Link> </Button> </CardFooter>
            </Card>
          </TabsContent>

          <TabsContent value="payments">
            <Card>
              <CardHeader> <CardTitle>Payment History</CardTitle> <CardDescription>All settlement payments recorded in this group from Firestore.</CardDescription> </CardHeader>
              <CardContent> {firestorePayments.length > 0 ? ( <ul className="space-y-4"> {firestorePayments.map(payment => { const payer = memberDetailsMap.get(payment.paidByUserId); const payee = memberDetailsMap.get(payment.paidToUserId); return ( <li key={payment.id} className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-3 border rounded-md hover:bg-muted/50"> <div className="flex items-center gap-3 mb-2 sm:mb-0 flex-1 min-w-0"> <Avatar className="h-10 w-10"> <AvatarImage src={payer?.avatarUrl || undefined} alt={payer?.name}/> <AvatarFallback>{getInitials(payer?.name)}</AvatarFallback> </Avatar> <div className="flex-1 min-w-0"> <p className="font-medium truncate"> {payer?.name || payment.paidByUserId.substring(0,6)} paid {payee?.name || payment.paidToUserId.substring(0,6)} </p> <p className="text-sm text-muted-foreground"> On {format(parseISO(payment.date), "MMM d, yyyy")} via {payment.method} </p> {payment.notes && <p className="text-xs text-muted-foreground italic">Note: {payment.notes}</p>} </div> </div> <div className="text-left sm:text-right sm:ml-2"> <p className="text-lg font-semibold">{currencySymbol}{payment.amount.toFixed(2)}</p> </div> </li> ); })} </ul> ) : ( <p className="text-muted-foreground text-center py-4">No payments recorded yet in Firestore for this group.</p> )} </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="balances">
            <Card>
              <CardHeader> <CardTitle>Balances</CardTitle> <CardDescription>Who owes whom in this group, calculated from Firestore transactions (contributions, expenses, payments).</CardDescription> </CardHeader>
              <CardContent> {balances.length > 0 ? ( <ul className="space-y-3"> {balances.map(balance => { const user = memberDetailsMap.get(balance.userId); if (!user) return null; const owedToList = Object.entries(balance.owes).map(([owedToId, amount]) => ({ user: memberDetailsMap.get(owedToId), amount })).filter(item => item.user && item.amount > 0.005); const owedByList = Object.entries(balance.owedBy).map(([owedById, amount]) => ({ user: memberDetailsMap.get(owedById), amount })).filter(item => item.user && item.amount > 0.005); return ( <li key={balance.userId} className="p-3 border rounded-md"> <div className="flex items-center gap-2 mb-2"> <Avatar className="h-8 w-8"> <AvatarImage src={user.avatarUrl || undefined} /> <AvatarFallback>{getInitials(user.name)}</AvatarFallback> </Avatar> <span className="font-medium">{user.name || balance.userId.substring(0,6)}'s Net Position:</span> <span className={`font-semibold ${balance.netBalance > 0.005 ? 'text-green-600 dark:text-green-400' : balance.netBalance < -0.005 ? 'text-red-600 dark:text-red-400' : 'text-muted-foreground'}`}> {currencySymbol}{Math.abs(balance.netBalance).toFixed(2)} {balance.netBalance > 0.005 ? "is owed by group fund" : balance.netBalance < -0.005 ? "owes to group fund" : "is settled with group fund"} </span> </div> {owedToList.length > 0 && ( <div className="pl-4 text-sm space-y-1"> <p className="text-red-600 dark:text-red-400 font-medium">Should Pay (Simplified):</p> <ul className="list-none ml-2 space-y-1"> {owedToList.map(item => ( <li key={item.user!.id} className="flex justify-between items-center"> <span>{`${currencySymbol}${item.amount.toFixed(2)} to ${item.user!.name || item.user!.id.substring(0,6)}`}</span> {balance.userId === currentUser.id && isMember && ( <Button asChild size="xs" variant="outline" className="px-2 py-1 h-auto text-xs"> <Link href={`/groups/${groupId}/settle-up?payerId=${currentUser.id}&payeeId=${item.user!.id}&amount=${item.amount.toFixed(2)}`}> <Send className="mr-1.5 h-3 w-3" /> Settle </Link> </Button> )} </li> ))} </ul> </div> )} {!owedToList.length && !owedByList.length && Math.abs(balance.netBalance) < 0.01 && ( <p className="pl-4 text-sm text-muted-foreground">All settled up!</p> )} </li> ); })} </ul> ) : ( <p className="text-muted-foreground text-center py-4">Balances are being calculated or no transactions yet in Firestore.</p> )} </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="reports">
            <Card>
              <CardHeader> <CardTitle>Reports</CardTitle> <CardDescription>Visual insights into group spending.</CardDescription> </CardHeader>
              <CardContent className="space-y-6"> <Card> <CardHeader> <CardTitle>Total Spending by Payer</CardTitle> <CardDescription>Which member has paid the most for group expenses.</CardDescription> </CardHeader> <CardContent> {spendingByPayerChartData.length > 0 ? ( <ChartContainer config={chartConfigSpendingByPayer} className="h-[300px] w-full"> <BarChart accessibilityLayer data={spendingByPayerChartData} layout="vertical" margin={{left: 10, right: 10}}> <CartesianGrid vertical={false} /> <XAxis type="number" dataKey="totalPaid" tickFormatter={(value) => `${currencySymbol}${value}`} /> <YAxis dataKey="name" type="category" tickLine={false} axisLine={false} hide={spendingByPayerChartData.length > 10}/> <ChartTooltip cursor={false} content={<ChartTooltipContent hideLabel />} /> <ChartLegend content={<ChartLegendContent />} /> <Bar dataKey="totalPaid" radius={4}> </Bar> </BarChart> </ChartContainer> ) : ( <p className="text-muted-foreground text-center py-4">No spending data to display for the chart.</p> )} </CardContent> </Card> </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="members">
            <Card>
              <CardHeader className="flex flex-row justify-between items-center"> <div> <CardTitle>Members ({group.members.length})</CardTitle> <CardDescription>People participating in this group (from Firestore).</CardDescription> </div> {isOwner && ( <Dialog open={isAddMemberDialogOpen} onOpenChange={handleAddMemberDialogOpenChange}> <DialogTrigger asChild> <Button variant="outline" size="sm"> <UserPlus className="mr-2 h-4 w-4"/>Add Member </Button> </DialogTrigger> <DialogContent className="sm:max-w-[480px]"> <DialogHeader> <DialogTitle>Add Members to "{group.name}"</DialogTitle> <DialogDescription> Select contacts to add to this group. Only contacts not already in the group are shown. </DialogDescription> </DialogHeader> <div className="py-4"> {isLoadingPotentialMembers ? ( <div className="space-y-2"> {[1,2,3].map(i => <Skeleton key={i} className="h-10 w-full rounded-md" />)} </div> ) : potentialNewMembers.length > 0 ? ( <ScrollArea className="h-[250px] pr-3"> <div className="space-y-2"> {potentialNewMembers.map(contact => ( <label key={contact.id} htmlFor={`contact-${contact.id}`} className="flex items-center p-2 space-x-3 rounded-md border hover:bg-accent hover:text-accent-foreground has-[:checked]:border-primary has-[:checked]:bg-primary/10 transition-colors cursor-pointer" > <Checkbox id={`contact-${contact.id}`} checked={selectedContactsToAdd.includes(contact.id)} onCheckedChange={() => handleToggleContactSelection(contact.id)} /> <Avatar className="h-8 w-8"> <AvatarImage src={contact.avatarUrl || undefined} alt={contact.name || 'Contact'} /> <AvatarFallback>{getInitials(contact.name)}</AvatarFallback> </Avatar> <span className="text-sm font-medium">{contact.name || 'Unknown Contact'}</span> </label> ))} </div> </ScrollArea> ) : ( <p className="text-sm text-muted-foreground text-center py-4"> No new contacts available to add, or all your contacts are already in this group. </p> )} </div> <DialogFooter> <Button variant="outline" onClick={() => setIsAddMemberDialogOpen(false)} disabled={isAddingMembers}> Cancel </Button> <Button onClick={handleAddSelectedMembers} disabled={isAddingMembers || selectedContactsToAdd.length === 0 || isLoadingPotentialMembers} > {isAddingMembers ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Check className="mr-2 h-4 w-4" />} {isAddingMembers ? "Adding..." : `Add ${selectedContactsToAdd.length} Member(s)`} </Button> </DialogFooter> </DialogContent> </Dialog> )} </CardHeader>
              <CardContent> <ul className="space-y-3"> {group.members.map(member => ( <li key={member.id} className="flex items-center justify-between p-2 border rounded-md"> <div className="flex items-center gap-3"> <Avatar> <AvatarImage src={member.avatarUrl || undefined} /> <AvatarFallback>{getInitials(member.name)}</AvatarFallback> </Avatar> <div> <p className="font-medium">{member.name || member.id.substring(0,10)}</p> <p className="text-xs text-muted-foreground">{member.email || 'No email'}</p> </div> </div> <div> {member.id === group.ownerId && <Badge variant="outline" className="text-primary">Admin</Badge>} </div> </li> ))} </ul> </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="activity">
            <Card>
              <CardHeader> <CardTitle>Activity Log</CardTitle> <CardDescription>Recent actions within this group from Firestore.</CardDescription> </CardHeader>
              <CardContent> {firestoreActivityLogs.length > 0 ? ( <ul className="space-y-4"> {firestoreActivityLogs.map(log => { const actor = memberDetailsMap.get(log.userId) || group.members.find(m=>m.id === log.userId); return ( <li key={log.id} className="flex items-start gap-3 text-sm p-2 border rounded-md"> <Avatar className="h-8 w-8 mt-1"> <AvatarImage src={actor?.avatarUrl || undefined} /> <AvatarFallback>{getInitials(actor?.name)}</AvatarFallback> </Avatar> <div> <p> <span className="font-medium">{actor?.name || log.userId.substring(0,6)}</span> {log.description.includes(actor?.name || 'User') ? log.description.substring((actor?.name || 'User').length).trim() : ` ${log.description}`} </p> <p className="text-xs text-muted-foreground">{format(parseISO(log.timestamp), "MMM d, yyyy 'at' h:mm a")}</p> </div> </li> )})} </ul> ) : ( <p className="text-muted-foreground text-center py-4">No activity recorded yet in Firestore for this group.</p> )} </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </TooltipProvider>
    </div>
  );
}
