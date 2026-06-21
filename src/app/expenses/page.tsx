
"use client";

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertTriangle, CreditCard, Users, CalendarDays, DollarSign as DollarSignIcon, ArrowRight, Loader2, Paperclip } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useUser } from '@/contexts/UserContext';
import type { Expense, User as UserType, Group as GroupType } from '@/types';
import { format, parseISO } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { useCurrency } from '@/contexts/CurrencyContext';
import { Skeleton } from '@/components/ui/skeleton';
import React, { useState, useEffect, useMemo } from 'react';
import { db } from '@/lib/firebase';
import { collection, collectionGroup, query, where, getDocs, Timestamp, doc, getDoc } from 'firebase/firestore';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';


const getInitials = (name: string | undefined | null) => {
  if (!name) return "U";
  const names = name.split(' ');
  if (names.length > 1 && names[0] && names[names.length - 1]) {
    return (names[0][0] + names[names.length - 1][0]).toUpperCase();
  }
  if (name.length > 0) return name.substring(0, 2).toUpperCase();
  return "U";
};

interface EnrichedExpense extends Expense {
  groupName?: string;
  payerName?: string;
  payerAvatarUrl?: string | null;
}

export default function MyExpensesPage() {
  const { currentUser } = useUser();
  const { formatCurrency } = useCurrency();
  const [isLoading, setIsLoading] = useState(true);
  const [userInvolvedExpenses, setUserInvolvedExpenses] = useState<EnrichedExpense[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchUserExpenses = async () => {
      if (!currentUser) {
        setIsLoading(false);
        return;
      }
      setIsLoading(true);
      setError(null);

      try {
        // 1. Get all groups the user is a member of
        const userGroupsQuery = query(
          collection(db, 'groups'),
          where('memberIds', 'array-contains', currentUser.id)
        );
        const userGroupsSnapshot = await getDocs(userGroupsQuery);
        const userGroupIds = userGroupsSnapshot.docs.map(doc => doc.id);
        
        const groupsDataMap = new Map<string, GroupType>();
        userGroupsSnapshot.docs.forEach(docSnap => {
             const data = docSnap.data();
             groupsDataMap.set(docSnap.id, {
                id: docSnap.id,
                name: data.name,
                members: data.members || [], // Ensure members array exists
                memberIds: data.memberIds || [],
                ownerId: data.ownerId,
                visibility: data.visibility,
                createdAt: (data.createdAt as Timestamp)?.toDate().toISOString() || new Date().toISOString(),
                description: data.description,
                photoUrl: data.photoUrl,
             } as GroupType);
        });


        if (userGroupIds.length === 0) {
          setUserInvolvedExpenses([]);
          setIsLoading(false);
          return;
        }

        // 2. For each group, fetch its expenses and filter if current user is involved
        const expenseQueries = userGroupIds.map(groupId => {
          const expensesColRef = collection(db, 'groups', groupId, 'expenses');
          return getDocs(query(expensesColRef));
        });
        
        const groupExpenseSnapshots = await Promise.all(expenseQueries);
        
        const fetchedExpenses: EnrichedExpense[] = [];
        groupExpenseSnapshots.forEach((snapshot, index) => {
          const groupId = userGroupIds[index];
          const group = groupsDataMap.get(groupId);

          snapshot.forEach(docSnap => {
            const expenseData = docSnap.data() as Omit<Expense, 'id' | 'createdAt' | 'date'> & { createdAt: Timestamp, date: Timestamp | string };
            const isPayer = expenseData.paidByUserId === currentUser.id;
            const isParticipant = expenseData.participants.some(p => p.userId === currentUser.id);

            if (isPayer || isParticipant) {
              const payer = group?.members.find(m => m.id === expenseData.paidByUserId);
              fetchedExpenses.push({
                id: docSnap.id,
                ...expenseData,
                date: (expenseData.date instanceof Timestamp ? expenseData.date.toDate().toISOString() : expenseData.date as string),
                createdAt: (expenseData.createdAt instanceof Timestamp ? expenseData.createdAt.toDate().toISOString() : new Date().toISOString()),
                groupName: group?.name,
                payerName: payer?.name ?? undefined,
                payerAvatarUrl: payer?.avatarUrl ?? undefined,
                receiptUrl: expenseData.receiptUrl,
                receiptFileName: expenseData.receiptFileName,
              });
            }
          });
        });

        fetchedExpenses.sort((a, b) => parseISO(b.date).getTime() - parseISO(a.date).getTime());
        setUserInvolvedExpenses(fetchedExpenses);

      } catch (err) {
        console.error("Error fetching user expenses:", err);
        setError("Could not load your expenses. Please try again.");
      } finally {
        setIsLoading(false);
      }
    };

    fetchUserExpenses();
  }, [currentUser]);

  if (!currentUser && !isLoading && !error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-10rem)] text-center p-4">
        <AlertTriangle className="w-16 h-16 text-destructive mb-4" />
        <h1 className="text-3xl font-bold mb-2">Access Denied</h1>
        <p className="text-lg text-muted-foreground mb-6">Please log in to view your expenses.</p>
        <Button asChild>
          <Link href="/login">Go to Login</Link>
        </Button>
      </div>
    );
  }

  if (error) {
     return (
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-10rem)] text-center p-4">
        <AlertTriangle className="w-16 h-16 text-destructive mb-4" />
        <h1 className="text-3xl font-bold mb-2">Error</h1>
        <p className="text-lg text-muted-foreground mb-6">{error}</p>
        <Button onClick={() => window.location.reload()}>Try Again</Button>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">My Expenses</h1>
        <p className="text-muted-foreground">A summary of all expenses you're involved in from Firestore.</p>
      </div>

      {isLoading ? (
        <div className="space-y-6">
          {Array.from({ length: 3 }).map((_, index) => (
            <Card key={index} className="overflow-hidden">
              <CardHeader className="flex flex-row items-start bg-muted/50 gap-4 p-4">
                <Skeleton className="h-12 w-12 rounded-full border" />
                <div className="grid gap-1 flex-1">
                  <Skeleton className="h-6 w-3/4" />
                  <Skeleton className="h-4 w-1/2" />
                  <Skeleton className="h-4 w-1/3" />
                </div>
                <div className="text-right space-y-1">
                   <Skeleton className="h-7 w-20 ml-auto" />
                   <Skeleton className="h-5 w-24 ml-auto" />
                </div>
              </CardHeader>
            </Card>
          ))}
        </div>
      ) : userInvolvedExpenses.length > 0 ? (
        <div className="space-y-6">
          <TooltipProvider>
            {userInvolvedExpenses.map((expense) => {
              const currentUserParticipantInfo = expense.participants.find(p => p.userId === currentUser!.id);
              return (
                <Card key={expense.id} className="overflow-hidden">
                  <CardHeader className="flex flex-row items-start bg-muted/50 gap-4 p-4">
                    <Avatar className="h-12 w-12 border">
                      <AvatarImage src={expense.payerAvatarUrl || undefined} alt={expense.payerName} />
                      <AvatarFallback>{getInitials(expense.payerName)}</AvatarFallback>
                    </Avatar>
                    <div className="grid gap-0.5 flex-1">
                      <CardTitle className="text-lg group flex items-center gap-2">
                        {expense.description}
                        {expense.receiptFileName && (
                          <Tooltip>
                            <TooltipTrigger asChild>
                               {expense.receiptUrl ? (
                                <Link href={expense.receiptUrl} target="_blank" rel="noopener noreferrer" aria-label={`View receipt for ${expense.description}`}>
                                  <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:text-primary">
                                    <Paperclip className="h-4 w-4" />
                                  </Button>
                                </Link>
                              ) : (
                                <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground/50 hover:text-primary cursor-not-allowed" disabled>
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
                      </CardTitle>
                      <CardDescription className="text-xs">
                        Paid by {expense.paidByUserId === currentUser!.id ? "You" : expense.payerName || 'Unknown User'} on {format(parseISO(expense.date), "MMMM d, yyyy")}
                      </CardDescription>
                       {expense.groupName && expense.groupId && (
                          <p className="text-xs text-muted-foreground">
                              In group: <Link href={`/groups/${expense.groupId}`} className="text-primary hover:underline">{expense.groupName}</Link>
                          </p>
                      )}
                    </div>
                    <div className="text-right">
                       <div className="text-xl font-bold flex items-center">
                          {formatCurrency(expense.amount)}
                      </div>
                      {currentUserParticipantInfo && expense.paidByUserId !== currentUser!.id && (
                          <Badge variant="outline" className="mt-1 text-xs">Your share: {formatCurrency(currentUserParticipantInfo.amountOwed)}</Badge>
                      )}
                      {expense.paidByUserId === currentUser!.id && expense.participants.length > 1 && (
                           <Badge variant="secondary" className="mt-1 text-xs">You paid</Badge>
                      )}
                       {expense.paidByUserId === currentUser!.id && expense.participants.length === 1 && expense.participants[0].userId === currentUser!.id && (
                           <Badge variant="outline" className="mt-1 text-xs">Personal Expense</Badge>
                      )}
                    </div>
                  </CardHeader>
                </Card>
              );
            })}
          </TooltipProvider>
        </div>
      ) : (
        <Card>
          <CardContent className="p-10 text-center">
            <CreditCard className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-xl font-semibold mb-2">No Expenses Yet!</h3>
            <p className="text-muted-foreground">
              You're not currently part of any expenses in Firestore. Expenses from your groups will appear here.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
