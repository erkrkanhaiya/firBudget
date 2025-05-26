
"use client";

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ArrowLeft, Users, CreditCard, ListChecks, Activity, PlusCircle, Edit, Trash2, UserPlus, DollarSign as DollarSignIcon, Download, Lock, Eye, AlertTriangle } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { mockGroups, mockExpenses, mockUsers, mockActivityLog, mockBalancesGroup1 } from '@/data/mock'; // Using mock data
import type { Group, Expense, User as UserType, ActivityLog, Balance } from '@/types';
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
import { useToast } from '@/hooks/use-toast';
import { useCurrency } from '@/contexts/CurrencyContext';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { Badge } from '@/components/ui/badge';

interface jsPDFWithAutoTable extends jsPDF {
  autoTable: (options: any) => jsPDFWithAutoTable;
}

export default function GroupDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { currentUser } = useUser();
  const { toast } = useToast();
  const groupId = params.groupId as string;
  const { getCurrencySymbol } = useCurrency();

  const [group, setGroup] = useState<Group | null>(null);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>([]);
  const [balances, setBalances] = useState<Balance[]>([]);
  const [accessDenied, setAccessDenied] = useState(false);


  useEffect(() => {
    const foundGroup = mockGroups.find(g => g.id === groupId);
    if (foundGroup) {
      if (!currentUser) { // Should be caught by outer layout, but good to double check
        router.push('/login');
        return;
      }

      const isMember = foundGroup.members.some(m => m.id === currentUser.id);

      if (foundGroup.visibility === 'private' && !isMember) {
        toast({ title: "Access Denied", description: "This is a private group and you are not a member.", variant: "destructive" });
        setAccessDenied(true);
        // router.push('/groups'); // Optionally redirect immediately
        return;
      }
      
      setGroup(foundGroup);
      setExpenses(mockExpenses.filter(e => e.groupId === groupId).sort((a,b) => parseISO(b.date).getTime() - parseISO(a.date).getTime()));
      setActivityLogs(mockActivityLog.filter(a => a.groupId === groupId).sort((a,b) => parseISO(b.timestamp).getTime() - parseISO(a.timestamp).getTime()));
      
      if (groupId === 'group1') { 
        setBalances(mockBalancesGroup1);
      } else {
        const calculatedBalances = calculateGroupBalances(foundGroup, mockExpenses.filter(e => e.groupId === groupId), mockUsers);
        setBalances(calculatedBalances);
      }

    } else {
      toast({ title: "Group not found", variant: "destructive" });
      setAccessDenied(true); // Treat as access denied if group not found
      // router.push('/groups'); // Optionally redirect
    }
  }, [groupId, router, currentUser, toast]);

  const calculateGroupBalances = (currentGroup: Group, groupExpenses: Expense[], allUsers: UserType[]): Balance[] => {
    if (!currentGroup) return [];
    const memberBalances: Record<string, { owes: Record<string, number>, owedBy: Record<string, number>, netBalance: number }> = {};
    currentGroup.members.forEach(member => {
        memberBalances[member.id] = { owes: {}, owedBy: {}, netBalance: 0 };
    });
    groupExpenses.forEach(expense => {
        const payerId = expense.paidByUserId;
        const participants = expense.participants;
        if (participants.length === 0) return;
        participants.forEach(participant => {
            const debtorId = participant.userId;
            const amountOwedByDebtor = participant.amountOwed;
            if (debtorId === payerId) return; 
            memberBalances[debtorId].owes[payerId] = (memberBalances[debtorId].owes[payerId] || 0) + amountOwedByDebtor;
            memberBalances[debtorId].netBalance -= amountOwedByDebtor;
            memberBalances[payerId].owedBy[debtorId] = (memberBalances[payerId].owedBy[debtorId] || 0) + amountOwedByDebtor;
            memberBalances[payerId].netBalance += amountOwedByDebtor;
        });
    });
    return Object.entries(memberBalances).map(([userId, balanceData]) => ({
        userId,
        ...balanceData
    }));
  };

  const handleDownloadPdf = () => {
    if (!group || !currentUser) return;
    // Access check for PDF download (already implicitly handled by page access for private, public allows all logged-in)
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
      doc.text(`- ${member.name} (${member.email})${member.id === group.ownerId ? ' (Admin)' : ''}`, 16, yPos);
      yPos += 6;
    });
    yPos += 4; 

    if (expenses.length > 0) {
      doc.setFontSize(14);
      doc.text("Expenses", 14, yPos);
      yPos += 2; 
      const expenseData = expenses.map(exp => {
        const payer = mockUsers.find(u => u.id === exp.paidByUserId);
        return [
          format(parseISO(exp.date), "MMM d, yyyy"),
          exp.description,
          payer?.name || 'Unknown',
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

    if (balances.length > 0) {
      doc.setFontSize(14);
      doc.text("Net Balances", 14, yPos);
      yPos += 8;
      doc.setFontSize(11);
      const balanceSummary: string[][] = [];
      balances.forEach(balance => {
        const user = mockUsers.find(u => u.id === balance.userId);
        if (!user) return;
        let balanceText = "";
        if (balance.netBalance > 0) {
          balanceText = `Is Owed: ${currencySymbol}${balance.netBalance.toFixed(2)}`;
        } else if (balance.netBalance < 0) {
          balanceText = `Owes: ${currencySymbol}${Math.abs(balance.netBalance).toFixed(2)}`;
        } else {
          balanceText = "Settled Up";
        }
        balanceSummary.push([user.name, balanceText]);
      });
       doc.autoTable({
        startY: yPos,
        head: [['Member', 'Net Balance Status']],
        body: balanceSummary,
        theme: 'grid',
        headStyles: { fillColor: [52, 73, 94] },
        margin: { top: yPos }
      });
      yPos = doc.autoTable.previous.finalY + 10;

      let detailedOwesText = "";
      balances.forEach(balance => {
        const user = mockUsers.find(u => u.id === balance.userId);
        if (!user) return;
        const owedToList = Object.entries(balance.owes).map(([owedToId, amount]) => ({
            user: mockUsers.find(u => u.id === owedToId),
            amount
        })).filter(item => item.user && item.amount > 0);
        if (owedToList.length > 0) {
            detailedOwesText += `${user.name} owes:\n`;
            owedToList.forEach(item => {
                 detailedOwesText += `  - ${currencySymbol}${item.amount.toFixed(2)} to ${item.user!.name}\n`;
            });
            detailedOwesText += "\n";
        }
      });
      
      if (detailedOwesText) {
        doc.addPage(); 
        yPos = 20;
        doc.setFontSize(14);
        doc.text("Settlement Suggestions (Who Owes Whom)", 14, yPos);
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
    doc.save(`BalanceBeam_Group_${group.name.replace(/\s+/g, '_')}_Summary.pdf`);
    toast({ title: "PDF Generated", description: "Your group summary PDF has been downloaded." });
  };

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
    return <p>Loading user...</p>; // Should be handled by layout or earlier checks
  }
  
  if (!group) {
    return <p>Loading group details...</p>; 
  }
  
  const getInitials = (name: string | undefined) => {
    if (!name) return "U";
    const names = name.split(' ');
    if (names.length > 1) {
      return names[0][0] + names[names.length - 1][0];
    }
    return name.substring(0, 2).toUpperCase();
  };

  const isMember = group.members.some(m => m.id === currentUser.id);
  const isOwner = group.ownerId === currentUser.id; // Owner must be a member

  const handleDeleteGroup = () => {
    console.log("Deleting group:", group.id);
    toast({ title: "Group Deleted", description: `Group "${group.name}" has been deleted.`});
    router.push('/groups');
  };

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
            {group.photoUrl && (
              <Image 
                src={group.photoUrl} 
                alt={group.name} 
                width={100} 
                height={100} 
                className="rounded-lg object-cover h-24 w-24 md:h-28 md:w-28"
                data-ai-hint={group.dataAiHint || "group image"}
              />
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
          {isOwner && ( // Only owner can edit/delete
            <div className="flex gap-2 mt-4 md:mt-0">
              <Button variant="outline" size="sm" disabled> 
                <Edit className="mr-2 h-4 w-4" /> Edit Group
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
                      "{group.name}" and all its associated data.
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

      <Tabs defaultValue="expenses" className="w-full">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 gap-4">
          <TabsList>
            <TabsTrigger value="expenses"><CreditCard className="mr-2 h-4 w-4 sm:hidden md:inline-block" />Expenses</TabsTrigger>
            <TabsTrigger value="balances"><ListChecks className="mr-2 h-4 w-4 sm:hidden md:inline-block" />Balances</TabsTrigger>
            <TabsTrigger value="members"><Users className="mr-2 h-4 w-4 sm:hidden md:inline-block" />Members</TabsTrigger>
            <TabsTrigger value="activity"><Activity className="mr-2 h-4 w-4 sm:hidden md:inline-block" />Activity</TabsTrigger>
          </TabsList>
           <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
            {isMember && ( // Only members can add expenses or settle up
              <>
                <Button asChild className="flex-1 sm:flex-none">
                  <Link href={`/groups/${groupId}/add-expense`}>
                    <PlusCircle className="mr-2 h-4 w-4" /> Add Expense
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
          </div>
        </div>

        <TabsContent value="expenses">
          <Card>
            <CardHeader>
              <CardTitle>Expenses</CardTitle>
              <CardDescription>All expenses recorded in this group.</CardDescription>
            </CardHeader>
            <CardContent>
              {expenses.length > 0 ? (
                <ul className="space-y-4">
                  {expenses.map(expense => {
                    const payer = mockUsers.find(u => u.id === expense.paidByUserId);
                    const currentUserShare = expense.participants.find(p => p.userId === currentUser.id);
                    return (
                    <li key={expense.id} className="flex items-center justify-between p-3 border rounded-md hover:bg-muted/50">
                      <div className="flex items-center gap-3">
                        <Avatar className="h-10 w-10">
                            <AvatarImage src={payer?.avatarUrl} />
                            <AvatarFallback>{getInitials(payer?.name)}</AvatarFallback>
                        </Avatar>
                        <div>
                            <p className="font-medium">{expense.description}</p>
                            <p className="text-sm text-muted-foreground">
                                Paid by {payer?.name || 'Unknown'} on {format(parseISO(expense.date), "MMM d, yyyy")}
                            </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-lg font-semibold">{getCurrencySymbol()}{expense.amount.toFixed(2)}</p>
                        {isMember && currentUserShare && (
                           <p className="text-xs text-blue-600">Your share: {getCurrencySymbol()}{currentUserShare.amountOwed.toFixed(2)}</p>
                        )}
                      </div>
                    </li>
                  )})}
                </ul>
              ) : (
                <p className="text-muted-foreground text-center py-4">No expenses recorded yet.</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="balances">
          <Card>
            <CardHeader>
              <CardTitle>Balances</CardTitle>
              <CardDescription>Who owes whom in this group.</CardDescription>
            </CardHeader>
            <CardContent>
              {balances.length > 0 ? (
                <ul className="space-y-3">
                  {balances.map(balance => {
                    const user = mockUsers.find(u => u.id === balance.userId);
                    if (!user) return null;

                    const owedToList = Object.entries(balance.owes).map(([owedToId, amount]) => ({
                        user: mockUsers.find(u => u.id === owedToId),
                        amount
                    })).filter(item => item.user && item.amount > 0.005); // Filter small amounts to avoid floating point noise
                    
                    const owedByList = Object.entries(balance.owedBy).map(([owedById, amount]) => ({
                        user: mockUsers.find(u => u.id === owedById),
                        amount
                    })).filter(item => item.user && item.amount > 0.005); // Filter small amounts

                    return (
                        <li key={balance.userId} className="p-3 border rounded-md">
                            <div className="flex items-center gap-2 mb-2">
                                <Avatar className="h-8 w-8">
                                    <AvatarImage src={user.avatarUrl} />
                                    <AvatarFallback>{getInitials(user.name)}</AvatarFallback>
                                </Avatar>
                                <span className="font-medium">{user.name}'s Balance:</span>
                                <span className={`font-semibold ${balance.netBalance > 0.005 ? 'text-green-600' : balance.netBalance < -0.005 ? 'text-red-600' : 'text-muted-foreground'}`}>
                                    {getCurrencySymbol()}{Math.abs(balance.netBalance).toFixed(2)} {balance.netBalance > 0.005 ? "is owed" : balance.netBalance < -0.005 ? "owes" : "is settled"}
                                </span>
                            </div>
                            {owedToList.length > 0 && (
                                <div className="pl-4 text-sm">
                                    <p className="text-red-600">Owes:</p>
                                    <ul className="list-disc list-inside ml-2">
                                        {owedToList.map(item => (
                                            <li key={item.user!.id}>{`${getCurrencySymbol()}${item.amount.toFixed(2)} to ${item.user!.name}`}</li>
                                        ))}
                                    </ul>
                                </div>
                            )}
                            {owedByList.length > 0 && (
                                 <div className="pl-4 text-sm mt-1">
                                    <p className="text-green-600">Is owed by:</p>
                                    <ul className="list-disc list-inside ml-2">
                                        {owedByList.map(item => (
                                            <li key={item.user!.id}>{`${getCurrencySymbol()}${item.amount.toFixed(2)} from ${item.user!.name}`}</li>
                                        ))}
                                    </ul>
                                </div>
                            )}
                             {!owedToList.length && !owedByList.length && Math.abs(balance.netBalance) < 0.01 && ( // Check if settled
                                 <p className="pl-4 text-sm text-muted-foreground">All settled up!</p>
                             )}
                        </li>
                    );
                  })}
                </ul>
              ) : (
                 <p className="text-muted-foreground text-center py-4">Balances are being calculated or no expenses yet.</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="members">
          <Card>
            <CardHeader className="flex flex-row justify-between items-center">
                <div>
                    <CardTitle>Members ({group.members.length})</CardTitle>
                    <CardDescription>People participating in this group.</CardDescription>
                </div>
                {isOwner && <Button variant="outline" size="sm" disabled><UserPlus className="mr-2 h-4 w-4"/>Add Member</Button>}
            </CardHeader>
            <CardContent>
              <ul className="space-y-3">
                {group.members.map(member => (
                  <li key={member.id} className="flex items-center justify-between p-2 border rounded-md">
                    <div className="flex items-center gap-3">
                        <Avatar>
                            <AvatarImage src={member.avatarUrl} />
                            <AvatarFallback>{getInitials(member.name)}</AvatarFallback>
                        </Avatar>
                        <div>
                            <p className="font-medium">{member.name}</p>
                            <p className="text-xs text-muted-foreground">{member.email}</p>
                        </div>
                    </div>
                    <div>
                        {member.id === group.ownerId && <Badge variant="outline" className="text-primary">Admin</Badge>}
                        {isOwner && member.id !== currentUser.id && (
                            <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive ml-2" disabled> 
                                <Trash2 className="h-4 w-4"/>
                            </Button>
                        )}
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
              <CardDescription>Recent actions within this group.</CardDescription>
            </CardHeader>
            <CardContent>
              {activityLogs.length > 0 ? (
                <ul className="space-y-4">
                  {activityLogs.map(log => {
                    const actor = mockUsers.find(u => u.id === log.userId);
                    return (
                    <li key={log.id} className="flex items-start gap-3 text-sm p-2 border rounded-md">
                        <Avatar className="h-8 w-8 mt-1">
                            <AvatarImage src={actor?.avatarUrl} />
                            <AvatarFallback>{getInitials(actor?.name)}</AvatarFallback>
                        </Avatar>
                        <div>
                            <p><span className="font-medium">{actor?.name || 'Unknown User'}</span> {log.description.replace(actor?.name || 'Unknown User', '').trim()}</p>
                            <p className="text-xs text-muted-foreground">{format(parseISO(log.timestamp), "MMM d, yyyy 'at' h:mm a")}</p>
                        </div>
                    </li>
                  )})}
                </ul>
              ) : (
                 <p className="text-muted-foreground text-center py-4">No activity recorded yet.</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
