
"use client";

import { useEffect, useState, useMemo, useCallback } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useParams, useRouter, useSearchParams, usePathname } from 'next/navigation';
import { Button, buttonVariants } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ArrowLeft, Users, CreditCard, ListChecks, Activity as ActivityIcon, PlusCircle, Edit, Trash2, UserPlus, DollarSign as DollarSignIcon, Download, Lock, Eye, AlertTriangle, Share2, Link as LinkIconProp, MessageCircle, Facebook, Twitter, Mail, Loader2, Plane, Home as HomeIconLucide, Heart, PartyPopper, Shapes, Check, Paperclip, HandCoins, Coins as CoinsIcon, TrendingUp, FileText, Edit2, MessageSquare as MessageSquareIcon, BarChartHorizontal, Save } from 'lucide-react';
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
import { GroupReportsTab } from '@/components/groups/GroupReportsTab';
import { cn } from '@/lib/utils';
import {
  acceptGroupInviteIfNeeded,
  addGroupMembersToGroup,
  canViewGroup,
  computeMemberRemovalImpact,
  isMemberInvitePending,
  isMemberSplitsOnly,
  canReinviteMemberToApp,
  isValidEmail,
  mapFirestoreGroup,
  normalizeEmail,
  removeGroupMemberFromGroup,
  repairGroupInvitedEmailsIfNeeded,
  resendGroupInvite,
  revokeGroupInvite,
} from '@/lib/group-access';


interface jsPDFWithAutoTable extends jsPDF {
  autoTable: (options: Record<string, unknown>) => jsPDFWithAutoTable;
  lastAutoTable: { finalY: number };
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

const CategoryIconDisplay = ({ category }: { category?: GroupCategory }) => {
  const IconComponent = category ? groupCategoryIcons[category] : groupCategoryIcons['OTHER'];
  return <IconComponent className="h-24 w-24 text-muted-foreground/50" />;
};


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
  const { getCurrencySymbol, formatCurrency } = useCurrency();
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
  const [newQuickMemberName, setNewQuickMemberName] = useState('');
  const [newQuickMemberEmail, setNewQuickMemberEmail] = useState('');
  const [isAddingQuickMember, setIsAddingQuickMember] = useState(false);
  const [revokingInviteEmail, setRevokingInviteEmail] = useState<string | null>(null);
  const [invitingEmail, setInvitingEmail] = useState<string | null>(null);
  const [memberToRemove, setMemberToRemove] = useState<UserType | null>(null);
  const [isRemovingMember, setIsRemovingMember] = useState(false);

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

  const memberRemovalImpact = useMemo(() => {
    if (!memberToRemove) return null;
    return computeMemberRemovalImpact(
      memberToRemove.id,
      firestoreExpenses,
      firestorePayments,
      firestoreContributions
    );
  }, [memberToRemove, firestoreExpenses, firestorePayments, firestoreContributions]);

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
    if (showLoadingSpinner) setIsLoadingPageData(true);
    setGroup(null);
    setAccessDenied(false);
    setGroupNotFound(false);


    if (!currentUser || !groupId) {
      if(showLoadingSpinner) setIsLoadingPageData(false);
      return;
    }


    try {
      const groupDocRef = doc(db, 'groups', groupId);
      const groupDocSnap = await getDoc(groupDocRef);

      if (groupDocSnap.exists()) {
        const groupData = groupDocSnap.data() as Omit<Group, 'id' | 'createdAt'> & { createdAt: Timestamp };
        let fetchedGroup: Group = mapFirestoreGroup(groupDocSnap.id, {
          ...groupData,
          createdAt: groupData.createdAt,
        });

        const { group: groupAfterAccept } = await acceptGroupInviteIfNeeded(groupId, currentUser);
        if (groupAfterAccept) {
          fetchedGroup = groupAfterAccept;
        }

        if (fetchedGroup.ownerId === currentUser.id) {
          fetchedGroup = await repairGroupInvitedEmailsIfNeeded(fetchedGroup);
        }

        if (!canViewGroup(fetchedGroup, currentUser)) {
          toast({ title: "Access Denied", description: "This is a private group and you are not a member.", variant: "destructive" });
          setAccessDenied(true);
          setGroup(null);
          if(showLoadingSpinner) setIsLoadingPageData(false);
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
    if (isLoadingAuth) return;

    if (!currentUser) {
        router.push('/login');
        setIsLoadingPageData(false);
        return;
    }
    if (!groupId) {
        setGroupNotFound(true);
        setIsLoadingPageData(false);
        return;
    }
    fetchGroupData();
  }, [isLoadingAuth, currentUser, groupId, searchParams, fetchGroupData, router]);


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

    if (isLoadingPageData || accessDenied || groupNotFound || !group ) {
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
                if (!searchParams.has('refresh')) {
                    newSearchParams.delete('refresh');
                }

                router.replace(`${pathname}?${newSearchParams.toString()}`, { scroll: false });


                const { dismiss: dismissToast } = toast({
                    title: `${itemDetails.itemType.charAt(0).toUpperCase() + itemDetails.itemType.slice(1)} Added!`,
                    description: `"${itemDetails.description}" ${itemDetails.amount ? `(${formatCurrency(itemDetails.amount)})` : ''} was recorded.`,
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
  }, [searchParams, group, isLoadingPageData, accessDenied, groupNotFound, pathname, router, toast, formatCurrency, addNotification, groupId, isUndoing, undoTimeoutId, fetchGroupData]);


  useEffect(() => {
    if (typeof navigator !== "undefined" && 'share' in navigator) {
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
    doc.text(`BillBuddy - Group Report: ${group.name}`, 14, yPos);
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
        ["Total Contributions:", formatCurrency(totalContributions)],
        ["Total Expenses:", formatCurrency(totalExpenses)],
        ["Remaining Group Funds:", formatCurrency(totalContributions - totalExpenses)],
    ];
    if (group.budgetAmount && group.budgetAmount > 0) {
        summaryData.push(["Group Budget:", formatCurrency(group.budgetAmount)]);
        summaryData.push(["Remaining Budget:", formatCurrency(group.budgetAmount - totalExpenses)]);
    }
    doc.autoTable({
        body: summaryData,
        startY: yPos,
        theme: 'plain',
        styles: { fontSize: 10, cellPadding: 1.5 },
        columnStyles: { 0: { fontStyle: 'bold' } }
    });
    yPos = doc.lastAutoTable.finalY + 8;


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
          formatCurrency(c.amount)
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
      yPos = doc.lastAutoTable.finalY + 8;
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
          formatCurrency(exp.amount)
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
      yPos = doc.lastAutoTable.finalY + 8;
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
          formatCurrency(p.amount),
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
      yPos = doc.lastAutoTable.finalY + 8;
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
          balanceText = `Is Owed by Group Fund: ${formatCurrency(balance.netBalance)}`;
        } else if (balance.netBalance < -0.005) {
          balanceText = `Owes to Group Fund: ${formatCurrency(Math.abs(balance.netBalance))}`;
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
      yPos = doc.lastAutoTable.finalY + 8;

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
                 detailedOwesText += `  - ${formatCurrency(item.amount)} to ${item.user!.name || item.user!.id.substring(0,6)}\n`;
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
    doc.save(`BillBuddy_Group_${group.name.replace(/\s+/g, '_')}_Summary.pdf`);
    toast({ title: "PDF Generated", description: "Your group summary PDF has been downloaded." });
  };

  const groupUrl = typeof window !== 'undefined' ? `${window.location.origin}/groups/${groupId}` : '';
  const shareMessageDefault = `Check out this group on BillBuddy: "${group?.name || 'a group'}"`;
  const shareTitle = group?.name || 'BillBuddy Group';

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
  const handleShareEmail = () => { if (!group) return; const subject = `Check out this BillBuddy group: ${group.name}`; const body = `${shareMessageDefault}\n${groupUrl}`; const mailtoUrl = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`; window.location.href = mailtoUrl; };

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
            const snapshot = await getDocs(query(colRef));
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
        .map((docSnap) => {
          const data = docSnap.data();
          return {
            id: docSnap.id,
            name: data.name as string,
            email: (data.email as string | null | undefined) ?? null,
            avatarUrl: undefined,
          } as UserType;
        })
        .filter(contact => !group.memberIds.includes(contact.id));
      setPotentialNewMembers(contactsList);
    } catch (error) {
      console.error("Error fetching potential new members:", error);
      toast({ title: "Error", description: "Could not load your contacts.", variant: "destructive" });
    } finally {
      setIsLoadingPotentialMembers(false);
    }
  };

  const handleAddMemberDialogOpenChange = (open: boolean) => {
    setIsAddMemberDialogOpen(open);
    if (open) {
      fetchPotentialNewMembers();
      setSelectedContactsToAdd([]);
    } else {
      setNewQuickMemberName('');
      setNewQuickMemberEmail('');
    }
  };
  const handleToggleContactSelection = (contactId: string) => { setSelectedContactsToAdd(prev => prev.includes(contactId) ? prev.filter(id => id !== contactId) : [...prev, contactId]); };

  const handleQuickAddMember = async () => {
    if (!newQuickMemberName.trim() || !currentUser) {
      toast({ title: "Name required", description: "Please enter a name.", variant: "destructive" });
      return;
    }
    const trimmedEmail = newQuickMemberEmail.trim();
    if (trimmedEmail && !isValidEmail(normalizeEmail(trimmedEmail))) {
      toast({ title: "Invalid email", description: "Enter a valid email or leave it blank.", variant: "destructive" });
      return;
    }

    setIsAddingQuickMember(true);
    const memberName = newQuickMemberName.trim();
    const memberEmail = trimmedEmail ? normalizeEmail(trimmedEmail) : null;

    try {
      const docRef = await addDoc(collection(db, 'appMemberContacts'), {
        name: memberName,
        ...(memberEmail ? { email: memberEmail } : {}),
        addedByUid: currentUser.id,
        createdAt: serverTimestamp(),
      });

      const newContact: UserType = {
        id: docRef.id,
        name: memberName,
        email: memberEmail,
        avatarUrl: undefined,
      };

      setPotentialNewMembers((prev) =>
        [newContact, ...prev].sort((a, b) => (a.name || '').localeCompare(b.name || ''))
      );
      setSelectedContactsToAdd((prev) =>
        prev.includes(newContact.id) ? prev : [...prev, newContact.id]
      );

      toast({
        title: "Member added to list",
        description: memberEmail
          ? `"${memberName}" will be invited to the app when you add them to the group.`
          : `"${memberName}" will be added for expense splits only.`,
      });
      setNewQuickMemberName('');
      setNewQuickMemberEmail('');
    } catch (error) {
      console.error("Error quick adding member:", error);
      toast({ title: "Error", description: "Could not save the member.", variant: "destructive" });
    } finally {
      setIsAddingQuickMember(false);
    }
  };

  const handleAddSelectedMembers = async () => {
    if (!currentUser || !group || selectedContactsToAdd.length === 0) {
      toast({ title: "No members selected", variant: "destructive" }); return;
    }
    setIsAddingMembers(true);
    try {
      const membersToAdd = selectedContactsToAdd
        .map((contactId) => potentialNewMembers.find((p) => p.id === contactId))
        .filter(Boolean)
        .map((contact) => ({
          id: contact!.id,
          name: contact!.name,
          email: contact!.email,
          avatarUrl: contact!.avatarUrl || '',
        }));

      const { addedCount, invitedCount } = await addGroupMembersToGroup(
        group,
        currentUser,
        membersToAdd
      );

      if (addedCount === 0) {
        toast({ title: "Nothing to add", description: "Selected members are already in the group.", variant: "destructive" });
        return;
      }

      toast({
        title: "Members added!",
        description:
          invitedCount > 0
            ? `${addedCount} member(s) added. ${invitedCount} can sign in with their email to access the group.`
            : `${addedCount} member(s) added for expense splits.`,
      });
      setIsAddMemberDialogOpen(false);
      fetchGroupData(false);
    } catch (error) {
      console.error("Error adding members to group:", error);
      if (group) { toast({ title: "Error", description: "Could not add members to the group.", variant: "destructive" }); addNotification({ title: "Failed to Add Members", message: `Could not add members to "${group.name}".`, type: "destructive", }); }
    } finally { setIsAddingMembers(false); }
  };

  const handleRevokeInvite = async (email: string) => {
    if (!currentUser || !group || group.ownerId !== currentUser.id) return;

    setRevokingInviteEmail(email);
    try {
      await revokeGroupInvite(group, currentUser, email);
      toast({
        title: "Invite removed",
        description: `${email} stays in the group for splits only. Use Invite again to restore app access.`,
      });
      fetchGroupData(false);
    } catch (error) {
      console.error("Error revoking invite:", error);
      toast({ title: "Error", description: "Could not remove the invite.", variant: "destructive" });
    } finally {
      setRevokingInviteEmail(null);
    }
  };

  const handleInviteAgain = async (email: string) => {
    if (!currentUser || !group || group.ownerId !== currentUser.id) return;

    setInvitingEmail(email);
    try {
      await resendGroupInvite(group, currentUser, email);
      toast({
        title: "Invite sent",
        description: `${email} can sign in to access this group in the app.`,
      });
      fetchGroupData(false);
    } catch (error) {
      console.error("Error inviting member:", error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Could not send the invite.",
        variant: "destructive",
      });
    } finally {
      setInvitingEmail(null);
    }
  };

  const handleRemoveMember = async () => {
    if (!currentUser || !group || !memberToRemove) return;
    if (group.ownerId !== currentUser.id) {
      toast({ title: "Permission denied", description: "Only the group admin can remove members.", variant: "destructive" });
      return;
    }

    setIsRemovingMember(true);
    const removedName = memberToRemove.name || "Member";
    try {
      const impact = await removeGroupMemberFromGroup(group, currentUser, memberToRemove.id);
      setMemberToRemove(null);
      toast({
        title: "Member removed",
        description: `${removedName} was removed. ${impact.expensesRevised} expense(s) revised, ${impact.paymentsRemoved} payment(s) and ${impact.contributionsRemoved} contribution(s) cleared.`,
      });
      addNotification({
        title: "Member Removed",
        message: `${removedName} was removed from "${group.name}". Balances were recalculated.`,
        type: "alert",
        href: `/groups/${groupId}?tab=balances`,
      });
      fetchGroupData(false);
    } catch (error) {
      console.error("Error removing member:", error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Could not remove member from the group.",
        variant: "destructive",
      });
    } finally {
      setIsRemovingMember(false);
    }
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

      if (editingNote) {
        actionType = 'note_edited';
        activityDescription = `${currentUser.name || 'User'} edited note: "${noteData.title}"`;
        const noteRef = doc(db, 'groups', groupId, 'notes', editingNote.id);
        batch.update(noteRef, noteData);
      } else {
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
    const contactName = noteToDelete.title; // Using note title here
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
        description: `${currentUser.name || 'User'} deleted note: "${contactName}"`, // Using contactName which is note title
        relatedNoteId: noteToDelete.id,
      };
      batch.set(doc(activityLogColRef), { ...activityLog, timestamp: serverTimestamp() });

      const prevLogsQuery = query(activityLogColRef, where('relatedNoteId', '==', noteToDelete.id));
      const prevLogsSnap = await getDocs(prevLogsQuery);
      prevLogsSnap.forEach(logDoc => batch.delete(logDoc.ref));


      await batch.commit();
      toast({ title: "Note Deleted", description: `Note "${contactName}" has been deleted.` }); // Using contactName (note title)
      addNotification({ title: "Note Deleted", message: `Note "${contactName}" deleted from group "${group.name}".`, type: "info" }); // Using contactName
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
  if (!currentUser) {
    return ( <div className="flex flex-col items-center justify-center min-h-[calc(100vh-15rem)] text-center p-4"> <AlertTriangle className="w-16 h-16 text-destructive mb-4" /> <h1 className="text-3xl font-bold mb-2">Authentication Required</h1> <p className="text-lg text-muted-foreground mb-6">Please log in to view this page.</p> <Button asChild><Link href="/login">Go to Login</Link></Button> </div> );
  }
  if (accessDenied) {
    return ( <div className="flex flex-col items-center justify-center min-h-[calc(100vh-15rem)] text-center p-4"> <AlertTriangle className="w-16 h-16 text-destructive mb-4" /> <h1 className="text-3xl font-bold mb-2">Access Denied</h1> <p className="text-lg text-muted-foreground mb-6"> You do not have permission to view this group. </p> <Button asChild><Link href="/groups">Back to Groups</Link></Button> </div> );
  }
  if (groupNotFound || !group) {
    return ( <div className="flex flex-col items-center justify-center min-h-[calc(100vh-10rem)] text-center p-4"> <AlertTriangle className="w-16 h-16 text-muted-foreground mb-4" /> <h1 className="text-3xl font-bold mb-2">Group Not Found</h1> <p className="text-lg text-muted-foreground mb-6"> The group you are looking for does not exist or could not be loaded. It might have been deleted. </p> <Button asChild><Link href="/groups">Back to Groups</Link></Button> </div> );
  }

  const isMember = group.memberIds.includes(currentUser.id);
  const isOwner = group.ownerId === currentUser.id;
  const GroupCategoryIconRender = groupCategoryIcons[group.category || 'OTHER'] || Shapes;
  const currencySymbol = getCurrencySymbol();
  const remainingFunds = totalContributions - totalExpenses;
  const budgetAmount = group.budgetAmount || 0;
  const budgetProgress = budgetAmount > 0 ? Math.min((totalExpenses / budgetAmount) * 100, 100) : 0;
  const remainingBudget = budgetAmount > 0 ? budgetAmount - totalExpenses : 0;

  return (
    <div className="space-y-6 pb-8">
      <div className="flex items-center justify-between">
        <Button variant="outline" size="sm" asChild>
          <Link href="/groups">
            <span className='flex items-center'>
              <ArrowLeft className="mr-2 h-4 w-4 " /> Back to Groups
            </span>
          </Link>
        </Button>
      </div>

      <Card className="overflow-hidden">
        <CardHeader className="p-4 md:p-6">
            <div className="flex flex-col sm:flex-row gap-4 sm:gap-6 items-start">
                {group.photoUrl ? (
                <div className="aspect-square w-24 h-24 sm:w-32 sm:h-32 relative rounded-lg overflow-hidden shrink-0">
                    <Image src={group.photoUrl} alt={group.name} layout="fill" objectFit="cover" data-ai-hint={group.dataAiHint || "group image"} priority/>
                </div>
                ) : (
                <div className="aspect-square w-24 h-24 sm:w-32 sm:h-32 relative bg-muted rounded-lg flex items-center justify-center shrink-0">
                    <CategoryIconDisplay category={group.category} />
                </div>
                )}
                <div className="flex-1">
                    <CardTitle className="text-2xl md:text-3xl font-bold mb-1">{group.name}</CardTitle>
                    {group.description && <CardDescription className="mb-3 text-base">{group.description}</CardDescription>}
                    
                    <div className="mb-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                        {group.visibility === 'public' ? ( <Badge variant="outline" className="py-0.5 px-1.5"><Eye className="h-3 w-3 mr-1"/>Public</Badge> ) : ( <Badge variant="secondary" className="py-0.5 px-1.5"><Lock className="h-3 w-3 mr-1"/>Private</Badge> )}
                        <span className="flex items-center"><GroupCategoryIconRender className="h-3.5 w-3.5 mr-1" />{group.category ? group.category.charAt(0).toUpperCase() + group.category.slice(1).toLowerCase() : 'Other'}</span>
                        <span>&bull;</span>
                        <span>Created: {format(parseISO(group.createdAt), "MMM d, yyyy")}</span>
                        <span>&bull;</span>
                        <span>{group.memberIds.length} Member{group.memberIds.length === 1 ? '' : 's'}</span>
                        {isMember && isOwner && <Badge variant="default" className="py-0.5 px-1.5 text-xs">Admin</Badge>}
                    </div>
                     <div className="flex flex-wrap gap-2">
                        {isMember && (
                            <Button onClick={() => handleOpenNoteDialog()} size="sm" variant="outline" className="justify-start">
                                <PlusCircle className="mr-2 h-4 w-4" /> Add Note
                            </Button>
                        )}
                        {isOwner && (
                        <>
                            <Button variant="outline" size="sm" asChild className="justify-start">
                              <Link href={`/groups/${groupId}/edit`}>
                                  <span className='flex items-center'><Edit className="mr-1.5 h-3.5 w-3.5" /> Edit Group</span>
                              </Link>
                            </Button>
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button variant="destructive" size="sm">
                                  <span className='flex items-center'><Trash2 className="mr-2 h-4 w-4" /> Delete Group</span>
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent> <AlertDialogHeader> <AlertDialogTitle>Are you sure?</AlertDialogTitle> <AlertDialogDescription> This action cannot be undone. This will permanently delete the group "{group.name}" and all its associated data (expenses, activity logs, payments, contributions, notes) from Firestore. </AlertDialogDescription> </AlertDialogHeader> <AlertDialogFooter> <AlertDialogCancel>Cancel</AlertDialogCancel> <AlertDialogAction onClick={handleDeleteGroup} className="bg-destructive hover:bg-destructive/90"> Delete </AlertDialogAction> </AlertDialogFooter> </AlertDialogContent>
                            </AlertDialog>
                        </>
                        )}
                    </div>
                </div>
            </div>
        </CardHeader>
      </Card>
      
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-sm mb-6 mt-5">
        <Card className="p-3 surface-positive"> <CardHeader className="p-0 pb-1"> <CardDescription className="text-success/90">Total Contributions</CardDescription> </CardHeader> <CardContent className="p-0"> <p className="text-xl font-semibold stat-positive">{formatCurrency(totalContributions)}</p> </CardContent> </Card>
        <Card className="p-3 surface-negative"> <CardHeader className="p-0 pb-1"> <CardDescription className="text-destructive/90">Total Expenses</CardDescription> </CardHeader> <CardContent className="p-0"> <p className="text-xl font-semibold stat-negative">{formatCurrency(totalExpenses)}</p> </CardContent> </Card>
        <Card className={`p-3 ${remainingFunds >= 0 ? 'surface-info' : 'surface-warning border-warning/20 bg-warning/10'}`}> <CardHeader className="p-0 pb-1"> <CardDescription className={remainingFunds >= 0 ? 'text-info/90' : 'text-warning/90'}>Remaining Funds</CardDescription> </CardHeader> <CardContent className="p-0"> <p className={`text-xl font-semibold ${remainingFunds >= 0 ? 'stat-info' : 'stat-warning'}`}> {formatCurrency(remainingFunds)} </p> </CardContent> </Card>
          {group.budgetAmount && group.budgetAmount > 0 && ( <Card className="p-3 border-primary/20 bg-primary/5"> <CardHeader className="p-0 pb-1"> <div className="flex justify-between items-baseline"> <CardDescription className="text-primary/90">Budget vs Spent</CardDescription> <span className="text-xs text-primary/80">{formatCurrency(budgetAmount)} total</span></div> </CardHeader> <CardContent className="p-0"> <Progress value={budgetProgress} className="h-2 my-1" /> <p className={`text-xs text-right ${remainingBudget >= 0 ? 'text-primary/90' : 'stat-warning font-medium'}`}> {remainingBudget >= 0 ? `${formatCurrency(remainingBudget)} remaining` : `${formatCurrency(Math.abs(remainingBudget))} over`} </p> </CardContent> </Card> )}
      </div>

      <div className="flex flex-col sm:flex-row sm:flex-wrap gap-3 my-6">
        {isMember && ( <>
          <Button asChild className="w-full sm:w-auto justify-start">
            <Link href={`/groups/${groupId}/add-expense`}>
              <span className='flex items-center'><PlusCircle className="mr-2 h-4 w-4" /> Add Expense</span>
            </Link>
          </Button>
          <Button variant="secondary" asChild className="w-full sm:w-auto justify-start">
            <Link href={`/groups/${groupId}/add-contribution`}>
              <span className='flex items-center'><CoinsIcon className="mr-2 h-4 w-4" /> Add Funds</span>
            </Link>
          </Button>
          <Button variant="outline" asChild className="w-full sm:w-auto justify-start">
            <Link href={`/groups/${groupId}/settle-up`}>
              <span className='flex items-center'><DollarSignIcon className="mr-2 h-4 w-4" /> Settle Up</span>
            </Link>
          </Button>
        </> )}
        <Button variant="outline" onClick={handleDownloadPdf} className="w-full sm:w-auto justify-start">
          <Download className="mr-2 h-4 w-4" /> Download PDF
        </Button>
        {(group.visibility === 'public' || isMember) && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className={cn(buttonVariants({variant: 'outline'}), "w-full sm:w-auto justify-start")}>
                  <Share2 className="mr-2 h-4 w-4" /> Share Group
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56 "> <DropdownMenuLabel>Share "{group.name}"</DropdownMenuLabel> <DropdownMenuSeparator /> {isWebShareSupported && ( <DropdownMenuItem onClick={handleNativeShare} className="cursor-pointer"> <Share2 className="mr-2 h-4 w-4" /> Share via System </DropdownMenuItem> )} <DropdownMenuItem onClick={handleCopyLink} className="cursor-pointer"> <LinkIconProp className="mr-2 h-4 w-4" /> Copy Link </DropdownMenuItem> <DropdownMenuItem onClick={handleShareWhatsApp} className="cursor-pointer"> <MessageSquareIcon className="mr-2 h-4 w-4" /> Share on WhatsApp </DropdownMenuItem> <DropdownMenuItem onClick={handleShareFacebook} className="cursor-pointer"> <Facebook className="mr-2 h-4 w-4" /> Share on Facebook </DropdownMenuItem> <DropdownMenuItem onClick={handleShareTwitter} className="cursor-pointer"> <Twitter className="mr-2 h-4 w-4" /> Share on Twitter </DropdownMenuItem> <DropdownMenuItem onClick={handleShareEmail} className="cursor-pointer"> <Mail className="mr-2 h-4 w-4" /> Share via Email </DropdownMenuItem> </DropdownMenuContent> </DropdownMenu> )}
      </div>
      
      <Tabs defaultValue="balances" className="w-full" value={searchParams.get('tab') || 'balances'} onValueChange={(value) => router.replace(`/groups/${groupId}?tab=${value}`, { scroll: false })}>
          <div className="mt-6 flex flex-col md:flex-row gap-x-6 gap-y-4">
            <TabsList className="flex-col md:w-48 shrink-0 h-auto md:h-fit p-1.5 md:p-2 self-start md:sticky md:top-20 overflow-x-auto md:overflow-x-visible">
              <TabsTrigger value="balances" className="w-full justify-start px-3 py-2 md:mb-1"><ListChecks className="mr-2 h-4 w-4" />Balances</TabsTrigger>
              <TabsTrigger value="expenses" className="w-full justify-start px-3 py-2 md:mb-1"><CreditCard className="mr-2 h-4 w-4" />Expenses</TabsTrigger>
              <TabsTrigger value="contributions" className="w-full justify-start px-3 py-2 md:mb-1"><CoinsIcon className="mr-2 h-4 w-4" />Contributions</TabsTrigger>
              <TabsTrigger value="payments" className="w-full justify-start px-3 py-2 md:mb-1"><HandCoins className="mr-2 h-4 w-4" />Payments</TabsTrigger>
              <TabsTrigger value="members" className="w-full justify-start px-3 py-2 md:mb-1"><Users className="mr-2 h-4 w-4" />Members</TabsTrigger>
              <TabsTrigger value="reports" className="w-full justify-start px-3 py-2 md:mb-1"><BarChartHorizontal className="mr-2 h-4 w-4" />Reports</TabsTrigger>
              <TabsTrigger value="notes" className="w-full justify-start px-3 py-2 md:mb-1"><FileText className="mr-2 h-4 w-4" />Notes</TabsTrigger>
              <TabsTrigger value="activity" className="w-full justify-start px-3 py-2"><ActivityIcon className="mr-2 h-4 w-4" />Activity</TabsTrigger>
            </TabsList>

            <div className="flex-1 min-w-0"> 
              <TabsContent value="balances">
                <Card>
                  <CardHeader> <CardTitle>Balances</CardTitle> <CardDescription>Who owes whom in this group, calculated from Firestore transactions (contributions, expenses, payments).</CardDescription> </CardHeader>
                  <CardContent> {balances.length > 0 ? ( <ul className="space-y-3"> {balances.map(balance => { const user = memberDetailsMap.get(balance.userId); if (!user) return null; const owedToList = Object.entries(balance.owes).map(([owedToId, amount]) => ({ user: memberDetailsMap.get(owedToId), amount })).filter(item => item.user && item.amount > 0.005); const owedByList = Object.entries(balance.owedBy).map(([owedById, amount]) => ({ user: memberDetailsMap.get(owedById), amount })).filter(item => item.user && item.amount > 0.005); return ( <li key={balance.userId} className="p-3.5 border rounded-lg"> <div className="flex items-center gap-2 mb-2"> <Avatar className="h-9 w-9"> <AvatarImage src={user.avatarUrl || undefined} /> <AvatarFallback>{getInitials(user.name)}</AvatarFallback> </Avatar> <div> <span className="font-medium">{user.name || balance.userId.substring(0,6)}'s Net Position:</span> <span className={`font-semibold ${balance.netBalance > 0.005 ? 'text-green-600 dark:text-green-400' : balance.netBalance < -0.005 ? 'text-red-600 dark:text-red-400' : 'text-muted-foreground'}`}> {formatCurrency(Math.abs(balance.netBalance))} {balance.netBalance > 0.005 ? "is owed by group fund" : balance.netBalance < -0.005 ? "owes to group fund" : "is settled with group fund"} </span> </div> </div> {owedToList.length > 0 && ( <div className="pl-3 text-sm space-y-1"> <p className="text-red-600 dark:text-red-400 font-medium">Should Pay (Simplified):</p> <ul className="list-none ml-1.5 space-y-1"> {owedToList.map(item => ( <li key={item.user!.id} className="flex justify-between items-center"> <span>{`${formatCurrency(item.amount)} to ${item.user!.name || item.user!.id.substring(0,6)}`}</span> {balance.userId === currentUser.id && isMember && ( <Link href={`/groups/${groupId}/settle-up?payerId=${currentUser.id}&payeeId=${item.user!.id}&amount=${item.amount.toFixed(2)}`} className={cn(buttonVariants({ variant: "outline", size: "sm" }), "px-2 py-0.5 h-auto text-xs inline-flex items-center")}><DollarSignIcon className="mr-1 h-2.5 w-2.5" />Settle</Link> )} </li> ))} </ul> </div> )} {!owedToList.length && !owedByList.length && Math.abs(balance.netBalance) < 0.01 && ( <p className="pl-3 text-sm text-muted-foreground">All settled up!</p> )} </li> ); })} </ul> ) : ( <p className="text-muted-foreground text-center py-6">Balances are being calculated or no transactions yet in Firestore.</p> )} </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="notes">
                <Card>
                  <CardHeader className="flex flex-row items-start justify-between gap-4 space-y-0">
                    <div>
                      <CardTitle>Group Notes</CardTitle>
                      <CardDescription>Shared notes and information for this group.</CardDescription>
                    </div>
                    {isMember && (
                      <Button onClick={() => handleOpenNoteDialog()} size="sm" variant="outline" className="shrink-0">
                        <PlusCircle className="mr-2 h-4 w-4" /> Add Note
                      </Button>
                    )}
                  </CardHeader>
                  <CardContent>
                    {firestoreGroupNotes.length > 0 ? (
                      <ul className="space-y-4">
                        {firestoreGroupNotes.map(note => {
                          const canEditOrDelete = isOwner || (currentUser && note.createdByUserId === currentUser.id);
                          return (
                            <li key={note.id} className="p-3.5 border rounded-lg hover:bg-muted/20 transition-colors">
                              <div className="flex justify-between items-start mb-1.5">
                                <h4 className="font-semibold text-lg">{note.title}</h4>
                                {canEditOrDelete && (
                                  <div className="flex gap-1">
                                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleOpenNoteDialog(note)}>
                                      <Edit2 className="h-4 w-4" />
                                    </Button>
                                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setNoteToDelete(note)}>
                                      <Trash2 className="h-4 w-4 text-destructive" />
                                    </Button>
                                  </div>
                                )}
                              </div>
                              <p className="text-xs text-muted-foreground">
                                By {note.createdByName} on {format(parseISO(note.createdAt), "MMM d, yyyy")}
                                {note.createdAt !== note.updatedAt && ` (edited ${format(parseISO(note.updatedAt), "MMM d, yyyy")})`}
                              </p>
                              <p className="text-sm mt-2 whitespace-pre-wrap">{note.content || <span className="italic text-muted-foreground">No content</span>}</p>
                            </li>
                          );
                        })}
                      </ul>
                    ) : (
                      <div className="text-center py-6 space-y-3">
                        <p className="text-muted-foreground">No notes added yet for this group.</p>
                        {isMember && (
                          <Button onClick={() => handleOpenNoteDialog()} size="sm" variant="outline">
                            <PlusCircle className="mr-2 h-4 w-4" /> Add Note
                          </Button>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="expenses">
                <Card>
                  <CardHeader> <CardTitle>Expenses</CardTitle> <CardDescription>All expenses recorded in this group from Firestore.</CardDescription> </CardHeader>
                  <CardContent>
                    {firestoreExpenses.length > 0 ? (
                      <ul className="space-y-3">
                        {firestoreExpenses.map(expense => {
                          const payer = memberDetailsMap.get(expense.paidByUserId);
                          const currentUserShare = expense.participants.find(p => p.userId === currentUser.id);
                          return (
                          <li key={expense.id} className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-3.5 border rounded-lg hover:bg-muted/20 transition-colors">
                            <div className="flex items-center gap-3 flex-1 min-w-0 mb-2 sm:mb-0">
                              <Avatar className="h-10 w-10 shrink-0"> <AvatarImage src={payer?.avatarUrl || undefined} /> <AvatarFallback>{getInitials(payer?.name)}</AvatarFallback> </Avatar>
                              <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-1.5"> <p className="font-medium truncate" title={expense.description}>{expense.description}</p>
                                    {expense.receiptFileName && ( <Tooltip> <TooltipTrigger asChild>{expense.receiptUrl ? ( <Link href={expense.receiptUrl} target="_blank" rel="noopener noreferrer" aria-label={`View receipt for ${expense.description}`} className={cn(buttonVariants({ variant: "ghost", size: "icon" }), "h-6 w-6 text-muted-foreground hover:text-primary shrink-0")}><Paperclip className="h-4 w-4" /></Link> ) : ( <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground/50 hover:text-primary shrink-0 cursor-not-allowed" disabled><Paperclip className="h-4 w-4" /></Button> )}</TooltipTrigger> <TooltipContent> <p> {expense.receiptUrl ? "View Receipt: " : "Receipt: "} {expense.receiptFileName} </p> {!expense.receiptUrl && <p className="text-xs">(Offline, not uploaded)</p>} </TooltipContent> </Tooltip> )}
                                  </div> <p className="text-sm text-muted-foreground"> Paid by {payer?.name || expense.paidByUserId.substring(0,6)} on {format(parseISO(expense.date), "MMM d, yyyy")} </p>
                              </div>
                            </div>
                            <div className="text-left sm:text-right sm:ml-2 shrink-0 flex flex-col items-end gap-1.5">
                              <p className="text-md font-semibold">{formatCurrency(expense.amount)}</p>
                              {isMember && currentUserShare && (
                                <p className="text-xs text-blue-600 dark:text-blue-400">Your share: {formatCurrency(currentUserShare.amountOwed)}</p>
                              )}
                              {isMember && (
                                <Link href={`/groups/${groupId}/edit-expense/${expense.id}`} className={cn(buttonVariants({ variant: "outline", size: "sm" }), "h-7 px-2 text-xs inline-flex items-center")}>
                                  <Edit className="mr-1 h-3 w-3" />Edit
                                </Link>
                              )}
                            </div>
                          </li> )})}
                      </ul>
                    ) : ( <p className="text-muted-foreground text-center py-6">No expenses recorded yet in Firestore for this group.</p> )}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="contributions">
                <Card>
                  <CardHeader> <CardTitle>Fund Contributions</CardTitle> <CardDescription>All funds contributed by members to this group's pool.</CardDescription> </CardHeader>
                  <CardContent> {firestoreContributions.length > 0 ? ( <ul className="space-y-3"> {firestoreContributions.map(contribution => { const contributor = memberDetailsMap.get(contribution.contributorId); return ( <li key={contribution.id} className="flex items-center justify-between p-3.5 border rounded-lg hover:bg-muted/20 transition-colors"> <div className="flex items-center gap-3"> <Avatar className="h-10 w-10 shrink-0"> <AvatarImage src={contributor?.avatarUrl || undefined} alt={contributor?.name ?? undefined} /> <AvatarFallback>{getInitials(contributor?.name)}</AvatarFallback> </Avatar> <div> <p className="font-medium"> {contributor?.name || contribution.contributorId.substring(0,6)} contributed </p> <p className="text-sm text-muted-foreground"> On {format(parseISO(contribution.date), "MMM d, yyyy")} {contribution.description && <span className="italic">- "{contribution.description}"</span>} </p> </div> </div> <div className="text-right ml-2 shrink-0"> <p className="text-md font-semibold text-green-600 dark:text-green-400"> +{formatCurrency(contribution.amount)} </p> </div> </li> ); })} </ul> ) : ( <p className="text-muted-foreground text-center py-6">No contributions recorded yet for this group.</p> )} </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="payments">
                <Card>
                  <CardHeader> <CardTitle>Payment History</CardTitle> <CardDescription>All settlement payments recorded in this group from Firestore.</CardDescription> </CardHeader>
                  <CardContent> {firestorePayments.length > 0 ? ( <ul className="space-y-3"> {firestorePayments.map(payment => { const payer = memberDetailsMap.get(payment.paidByUserId); const payee = memberDetailsMap.get(payment.paidToUserId); return ( <li key={payment.id} className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-3.5 border rounded-lg hover:bg-muted/20 transition-colors"> <div className="flex items-center gap-3 mb-1.5 sm:mb-0 flex-1 min-w-0"> <Avatar className="h-10 w-10 shrink-0"> <AvatarImage src={payer?.avatarUrl || undefined} alt={payer?.name ?? undefined}/> <AvatarFallback>{getInitials(payer?.name)}</AvatarFallback> </Avatar> <div className="flex-1 min-w-0"> <p className="font-medium truncate"> {payer?.name || payment.paidByUserId.substring(0,6)} paid {payee?.name || payment.paidToUserId.substring(0,6)} </p> <p className="text-sm text-muted-foreground"> On {format(parseISO(payment.date), "MMM d, yyyy")} via {payment.method.replace("_", " ")} </p> {payment.notes && <p className="text-xs text-muted-foreground italic mt-0.5">Note: {payment.notes}</p>} </div> </div> <div className="text-left sm:text-right sm:ml-2 shrink-0"> <p className="text-md font-semibold">{formatCurrency(payment.amount)}</p> </div> </li> ); })} </ul> ) : ( <p className="text-muted-foreground text-center py-6">No payments recorded yet in Firestore for this group.</p> )} </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="reports">
                <GroupReportsTab
                  expenses={firestoreExpenses}
                  members={group.members}
                  formatCurrency={formatCurrency}
                />
              </TabsContent>

              <TabsContent value="members">
                <Card>
                  <CardHeader className="flex flex-row justify-between items-start gap-4">
                    <div>
                      <CardTitle>Members ({group.members.length})</CardTitle>
                      <CardDescription>
                        Name only = expense splits. Name + email = splits and app access when they sign in.
                      </CardDescription>
                    </div>
                    {isOwner && (
                      <Dialog open={isAddMemberDialogOpen} onOpenChange={handleAddMemberDialogOpenChange}>
                        <DialogTrigger asChild>
                          <button className={cn(buttonVariants({ variant: 'default', size: 'sm' }))}>
                            <UserPlus className="mr-2 h-4 w-4" />
                            Add Member
                          </button>
                        </DialogTrigger>
                        <DialogContent className="sm:max-w-[520px]">
                          <DialogHeader>
                            <DialogTitle>Add members to &quot;{group.name}&quot;</DialogTitle>
                            <DialogDescription>
                              Add a name to split expenses. Add an email too and they can sign in to see the group — no email is sent automatically.
                            </DialogDescription>
                          </DialogHeader>
                          <div className="space-y-4 py-2">
                            <Card className="border-dashed">
                              <CardContent className="p-3 space-y-2">
                                <Label className="text-sm font-medium">Add new person</Label>
                                <Input
                                  value={newQuickMemberName}
                                  onChange={(e) => setNewQuickMemberName(e.target.value)}
                                  placeholder="Name (e.g. Rahul)"
                                  disabled={isAddingQuickMember || isAddingMembers}
                                />
                                <Input
                                  type="email"
                                  value={newQuickMemberEmail}
                                  onChange={(e) => setNewQuickMemberEmail(e.target.value)}
                                  placeholder="Email (optional — for app access)"
                                  disabled={isAddingQuickMember || isAddingMembers}
                                />
                                <Button
                                  type="button"
                                  size="sm"
                                  variant="secondary"
                                  onClick={handleQuickAddMember}
                                  disabled={isAddingQuickMember || isAddingMembers || !newQuickMemberName.trim()}
                                >
                                  {isAddingQuickMember ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <PlusCircle className="mr-2 h-4 w-4" />}
                                  Add to list
                                </Button>
                              </CardContent>
                            </Card>
                            {isLoadingPotentialMembers ? (
                              <div className="space-y-2">
                                {[1, 2, 3].map((i) => (
                                  <Skeleton key={i} className="h-10 w-full rounded-md" />
                                ))}
                              </div>
                            ) : potentialNewMembers.length > 0 ? (
                              <ScrollArea className="h-[220px] pr-3">
                                <div className="space-y-2">
                                  {potentialNewMembers.map((contact) => (
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
                                        <AvatarFallback>{getInitials(contact.name)}</AvatarFallback>
                                      </Avatar>
                                      <div className="min-w-0">
                                        <p className="text-sm font-medium truncate">{contact.name || 'Unknown'}</p>
                                        <p className="text-xs text-muted-foreground truncate">
                                          {contact.email ? contact.email : 'Splits only — no app access'}
                                        </p>
                                      </div>
                                    </label>
                                  ))}
                                </div>
                              </ScrollArea>
                            ) : (
                              <p className="text-sm text-muted-foreground text-center py-4">
                                No saved contacts yet. Add someone above.
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
                      {group.members.map((member) => {
                        const invitePending = isMemberInvitePending(group, member);
                        const splitsOnly = isMemberSplitsOnly(group, member);
                        const canReinvite = canReinviteMemberToApp(group, member);
                        return (
                          <li key={member.id} className="flex items-center justify-between p-3.5 border rounded-lg">
                            <div className="flex items-center gap-3 min-w-0">
                              <Avatar className="h-10 w-10 shrink-0">
                                <AvatarImage src={member.avatarUrl || undefined} />
                                <AvatarFallback>{getInitials(member.name)}</AvatarFallback>
                              </Avatar>
                              <div className="min-w-0">
                                <p className="font-medium truncate">{member.name || member.id.substring(0, 10)}</p>
                                <p className="text-xs text-muted-foreground truncate">
                                  {member.email || 'No email — splits only'}
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                              {member.id === group.ownerId && (
                                <Badge variant="default" className="text-xs">Admin</Badge>
                              )}
                              {invitePending && (
                                <Badge variant="outline" className="text-xs">Invited</Badge>
                              )}
                              {splitsOnly && (
                                <Badge variant="secondary" className="text-xs">Splits only</Badge>
                              )}
                              {isOwner && invitePending && member.email && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleRevokeInvite(member.email!)}
                                  disabled={revokingInviteEmail === member.email}
                                >
                                  {revokingInviteEmail === member.email ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                  ) : (
                                    "Revoke"
                                  )}
                                </Button>
                              )}
                              {isOwner && canReinvite && member.email && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleInviteAgain(member.email!)}
                                  disabled={invitingEmail === member.email}
                                >
                                  {invitingEmail === member.email ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                  ) : (
                                    "Invite again"
                                  )}
                                </Button>
                              )}
                              {isOwner && member.id !== group.ownerId && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="text-destructive hover:text-destructive"
                                  onClick={() => setMemberToRemove(member)}
                                  disabled={isRemovingMember}
                                >
                                  <Trash2 className="h-4 w-4" />
                                  <span className="sr-only">Remove {member.name}</span>
                                </Button>
                              )}
                            </div>
                          </li>
                        );
                      })}
                    </ul>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="activity">
                <Card>
                  <CardHeader> <CardTitle>Activity Log</CardTitle> <CardDescription>Recent actions within this group from Firestore.</CardDescription> </CardHeader>
                  <CardContent> {firestoreActivityLogs.length > 0 ? ( <ul className="space-y-3"> {firestoreActivityLogs.map(log => { const actor = memberDetailsMap.get(log.userId) || group.members.find(m=>m.id === log.userId); return ( <li key={log.id} className="flex items-start gap-3 text-sm p-3.5 border rounded-lg"> <Avatar className="h-9 w-9 mt-0.5 shrink-0"> <AvatarImage src={actor?.avatarUrl || undefined} /> <AvatarFallback>{getInitials(actor?.name)}</AvatarFallback> </Avatar> <div className="flex-1"> <p> <span className="font-medium">{actor?.name || log.userId.substring(0,6)}</span> {log.description.includes(actor?.name || 'User') ? log.description.substring((actor?.name || 'User').length).trim() : ` ${log.description}`} </p> <p className="text-xs text-muted-foreground">{format(parseISO(log.timestamp), "MMM d, yyyy 'at' h:mm a")}</p> </div> </li> )})} </ul> ) : ( <p className="text-muted-foreground text-center py-6">No activity recorded yet in Firestore for this group.</p> )} </CardContent>
                </Card>
              </TabsContent>
            </div> 
          </div>
      </Tabs>

      <Dialog open={isNoteDialogOpen} onOpenChange={setIsNoteDialogOpen}>
        <DialogContent className="sm:max-w-[520px]">
          <DialogHeader>
            <DialogTitle>{editingNote ? 'Edit Note' : 'Add New Note'}</DialogTitle>
            <DialogDescription>
              {editingNote ? 'Update the details of your note for this group.' : 'Create a new shared note for this group.'}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-1.5">
              <Label htmlFor="note-title">Title*</Label>
              <Input id="note-title" value={noteTitle} onChange={(e) => setNoteTitle(e.target.value)} placeholder="Enter note title" disabled={isSavingNote} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="note-content">Content</Label>
              <Textarea id="note-content" value={noteContent} onChange={(e) => setNoteContent(e.target.value)} className="min-h-[120px]" placeholder="Write your note details here..." disabled={isSavingNote} />
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

      <AlertDialog open={!!memberToRemove} onOpenChange={(open) => !open && !isRemovingMember && setMemberToRemove(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove {memberToRemove?.name || "member"}?</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-3 text-sm text-muted-foreground">
                <p>
                  They will be removed from this group. Their expense shares will be redistributed among remaining members,
                  expenses they paid will be reassigned to you (admin), and their payments and contributions will be cleared.
                </p>
                {memberRemovalImpact && (
                  <ul className="list-disc space-y-1 pl-5 text-foreground">
                    {memberRemovalImpact.expensesRevised > 0 && (
                      <li>{memberRemovalImpact.expensesRevised} expense(s) will be revised</li>
                    )}
                    {memberRemovalImpact.paymentsRemoved > 0 && (
                      <li>{memberRemovalImpact.paymentsRemoved} settlement payment(s) will be removed</li>
                    )}
                    {memberRemovalImpact.contributionsRemoved > 0 && (
                      <li>{memberRemovalImpact.contributionsRemoved} contribution(s) will be removed</li>
                    )}
                    {memberRemovalImpact.expensesRevised === 0 &&
                      memberRemovalImpact.paymentsRemoved === 0 &&
                      memberRemovalImpact.contributionsRemoved === 0 && (
                        <li>No financial records to revise — member will simply be removed.</li>
                      )}
                  </ul>
                )}
                <p className="font-medium text-destructive">This action cannot be undone.</p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isRemovingMember}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                void handleRemoveMember();
              }}
              disabled={isRemovingMember}
              className="bg-destructive hover:bg-destructive/90"
            >
              {isRemovingMember ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              {isRemovingMember ? "Removing..." : "Remove member"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

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
    </div>
  );
}

