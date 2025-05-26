"use client";

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ArrowLeft, Users, CreditCard, ListChecks, Activity, PlusCircle, Edit, Trash2, UserPlus, DollarSign } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { mockGroups, mockExpenses, mockUsers, mockActivityLog, mockBalancesGroup1, mockUser } from '@/data/mock'; // Using mock data
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

export default function GroupDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { currentUser } = useUser();
  const { toast } = useToast();
  const groupId = params.groupId as string;

  const [group, setGroup] = useState<Group | null>(null);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>([]);
  const [balances, setBalances] = useState<Balance[]>([]);


  useEffect(() => {
    // Simulate fetching data
    const foundGroup = mockGroups.find(g => g.id === groupId);
    if (foundGroup) {
      if (!currentUser || !foundGroup.members.find(m => m.id === currentUser.id)) {
        toast({ title: "Access Denied", description: "You are not a member of this group.", variant: "destructive" });
        router.push('/groups');
        return;
      }
      setGroup(foundGroup);
      setExpenses(mockExpenses.filter(e => e.groupId === groupId));
      setActivityLogs(mockActivityLog.filter(a => a.groupId === groupId).sort((a,b) => parseISO(b.timestamp).getTime() - parseISO(a.timestamp).getTime()));
      // For simplicity, using pre-calculated balances for group1, otherwise this needs real calculation
      if (groupId === 'group1') {
        setBalances(mockBalancesGroup1);
      }
    } else {
      toast({ title: "Group not found", variant: "destructive" });
      router.push('/groups');
    }
  }, [groupId, router, currentUser, toast]);

  if (!currentUser) {
    // Should be handled by layout or higher order component
    return <p>Loading user...</p>;
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

  const isOwner = group.ownerId === currentUser.id;

  const handleDeleteGroup = () => {
    // Placeholder for delete logic
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
              <CardTitle className="text-3xl mb-1">{group.name}</CardTitle>
              <CardDescription className="text-base">{group.description}</CardDescription>
              <p className="text-xs text-muted-foreground mt-2">Created on: {format(parseISO(group.createdAt), "MMMM d, yyyy")}</p>
            </div>
          </div>
          {isOwner && (
            <div className="flex gap-2 mt-4 md:mt-0">
              <Button variant="outline" size="sm" disabled> {/* TODO: Implement Edit Group */}
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
           <div className="flex gap-2 w-full sm:w-auto">
            <Button asChild className="flex-1 sm:flex-none">
              <Link href={`/groups/${groupId}/add-expense`}>
                <PlusCircle className="mr-2 h-4 w-4" /> Add Expense
              </Link>
            </Button>
            <Button variant="outline" asChild className="flex-1 sm:flex-none">
              <Link href={`/groups/${groupId}/settle-up`}>
                <DollarSign className="mr-2 h-4 w-4" /> Settle Up
              </Link>
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
                        <p className="text-lg font-semibold">${expense.amount.toFixed(2)}</p>
                        {/* Add logic to show user's share if applicable */}
                        {expense.participants.find(p => p.userId === currentUser.id) && (
                           <p className="text-xs text-blue-600">Your share: ${expense.participants.find(p=>p.userId === currentUser.id)?.amountOwed.toFixed(2)}</p>
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
                    })).filter(item => item.user);
                    
                    const owedByList = Object.entries(balance.owedBy).map(([owedById, amount]) => ({
                        user: mockUsers.find(u => u.id === owedById),
                        amount
                    })).filter(item => item.user);

                    return (
                        <li key={balance.userId} className="p-3 border rounded-md">
                            <div className="flex items-center gap-2 mb-2">
                                <Avatar className="h-8 w-8">
                                    <AvatarImage src={user.avatarUrl} />
                                    <AvatarFallback>{getInitials(user.name)}</AvatarFallback>
                                </Avatar>
                                <span className="font-medium">{user.name}'s Balance:</span>
                                <span className={`font-semibold ${balance.netBalance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                    ${Math.abs(balance.netBalance).toFixed(2)} {balance.netBalance > 0 ? "is owed" : balance.netBalance < 0 ? "owes" : "is settled"}
                                </span>
                            </div>
                            {owedToList.length > 0 && (
                                <div className="pl-4 text-sm">
                                    <p className="text-red-600">Owes:</p>
                                    <ul className="list-disc list-inside ml-2">
                                        {owedToList.map(item => (
                                            <li key={item.user!.id}>{`$${item.amount.toFixed(2)} to ${item.user!.name}`}</li>
                                        ))}
                                    </ul>
                                </div>
                            )}
                            {owedByList.length > 0 && (
                                 <div className="pl-4 text-sm mt-1">
                                    <p className="text-green-600">Is owed by:</p>
                                    <ul className="list-disc list-inside ml-2">
                                        {owedByList.map(item => (
                                            <li key={item.user!.id}>{`$${item.amount.toFixed(2)} from ${item.user!.name}`}</li>
                                        ))}
                                    </ul>
                                </div>
                            )}
                             {!owedToList.length && !owedByList.length && balance.netBalance === 0 && (
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
                    <CardTitle>Members</CardTitle>
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
                    {member.id === group.ownerId && <span className="text-xs font-semibold text-primary">Admin</span>}
                     {isOwner && member.id !== currentUser.id && (
                        <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive" disabled> {/* TODO: Implement Remove Member */}
                            <Trash2 className="h-4 w-4"/>
                        </Button>
                    )}
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
