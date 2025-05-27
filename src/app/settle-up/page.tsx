
"use client";

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertTriangle, BarChart3, Users, DollarSign as DollarSignIcon, ArrowUpCircle, ArrowDownCircle, Loader2, HandCoins, Info } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useUser } from '@/contexts/UserContext';
import type { User as UserType, Group as GroupType, Expense } from '@/types';
import { useCurrency } from '@/contexts/CurrencyContext';
import { Skeleton } from '@/components/ui/skeleton';
import React, { useState, useEffect } from 'react';
import { db } from '@/lib/firebase';
import { collection, query, where, getDocs, Timestamp } from 'firebase/firestore';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

// Helper to get initials
const getInitials = (name: string | undefined | null) => {
  if (!name) return "U";
  const names = name.split(' ');
  if (names.length > 1 && names[0] && names[names.length - 1]) {
    return (names[0][0] + names[names.length - 1][0]).toUpperCase();
  }
  if (name.length > 0) return name.substring(0, 2).toUpperCase();
  return "U";
};

interface DetailedBalanceItem {
  userId: string;
  userName?: string;
  userAvatarUrl?: string | null;
  amount: number; // Positive if this person owes current user, negative if current user owes this person.
}

interface OverallBalancesData {
  totalOwedToUser: number;
  totalUserOwes: number;
  netOverallBalance: number;
  debtors: DetailedBalanceItem[]; // People who owe the current user
  creditors: DetailedBalanceItem[]; // People the current user owes
}

export default function GlobalSettleUpPage() {
  const { currentUser } = useUser();
  const { getCurrencySymbol } = useCurrency();
  const [isLoading, setIsLoading] = useState(true);
  const [balancesData, setBalancesData] = useState<OverallBalancesData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchOverallBalances = async () => {
      if (!currentUser) {
        setIsLoading(false);
        return;
      }
      setIsLoading(true);
      setError(null);

      try {
        const userGroupsQuery = query(
          collection(db, 'groups'),
          where('memberIds', 'array-contains', currentUser.id)
        );
        const userGroupsSnapshot = await getDocs(userGroupsQuery);
        
        const groupsMap = new Map<string, GroupType>();
        const allMemberDetailsMap = new Map<string, UserType>();

        userGroupsSnapshot.docs.forEach(docSnap => {
          const data = docSnap.data();
          const group: GroupType = {
            id: docSnap.id,
            name: data.name,
            members: data.members || [],
            memberIds: data.memberIds || [],
            ownerId: data.ownerId,
            visibility: data.visibility,
            createdAt: (data.createdAt as Timestamp)?.toDate().toISOString() || new Date().toISOString(),
          };
          groupsMap.set(docSnap.id, group);
          group.members.forEach(member => {
            if (!allMemberDetailsMap.has(member.id)) {
              allMemberDetailsMap.set(member.id, member);
            }
          });
        });
        
        if (!allMemberDetailsMap.has(currentUser.id)) {
            allMemberDetailsMap.set(currentUser.id, {
                id: currentUser.id,
                name: currentUser.name,
                email: currentUser.email,
                avatarUrl: currentUser.avatarUrl
            });
        }

        if (userGroupsSnapshot.empty) {
          setBalancesData({ totalOwedToUser: 0, totalUserOwes: 0, netOverallBalance: 0, debtors: [], creditors: [] });
          setIsLoading(false);
          return;
        }

        const groupExpensePromises = Array.from(groupsMap.keys()).map(groupId => {
          const expensesColRef = collection(db, 'groups', groupId, 'expenses');
          return getDocs(query(expensesColRef));
        });
        
        const groupExpenseSnapshots = await Promise.all(groupExpensePromises);
        
        const allExpenses: Expense[] = [];
        groupExpenseSnapshots.forEach(snapshot => {
          snapshot.forEach(docSnap => {
            const expenseData = docSnap.data() as Omit<Expense, 'id' | 'createdAt' | 'date'> & { createdAt: Timestamp, date: Timestamp | string };
            allExpenses.push({
              id: docSnap.id,
              ...expenseData,
              date: (expenseData.date instanceof Timestamp ? expenseData.date.toDate().toISOString() : expenseData.date as string),
              createdAt: (expenseData.createdAt instanceof Timestamp ? expenseData.createdAt.toDate().toISOString() : new Date().toISOString()),
            });
          });
        });

        const userNetBalances: Record<string, number> = {}; 

        allExpenses.forEach(expense => {
          if (expense.paidByUserId === currentUser.id) {
            expense.participants.forEach(p => {
              if (p.userId !== currentUser.id) {
                userNetBalances[p.userId] = (userNetBalances[p.userId] || 0) + p.amountOwed;
              }
            });
          } else {
            const currentUserParticipant = expense.participants.find(p => p.userId === currentUser.id);
            if (currentUserParticipant) {
              userNetBalances[expense.paidByUserId] = (userNetBalances[expense.paidByUserId] || 0) - currentUserParticipant.amountOwed;
            }
          }
        });
        
        let totalOwedToUser = 0;
        let totalUserOwes = 0;
        const debtors: DetailedBalanceItem[] = [];
        const creditors: DetailedBalanceItem[] = [];

        Object.entries(userNetBalances).forEach(([otherUserId, netAmount]) => {
          if (Math.abs(netAmount) < 0.005) return; 

          const otherUserDetails = allMemberDetailsMap.get(otherUserId);
          const item: DetailedBalanceItem = {
            userId: otherUserId,
            userName: otherUserDetails?.name || 'Unknown User',
            userAvatarUrl: otherUserDetails?.avatarUrl,
            amount: netAmount,
          };

          if (netAmount > 0) {
            totalOwedToUser += netAmount;
            debtors.push(item);
          } else {
            totalUserOwes += Math.abs(netAmount);
            creditors.push(item); 
          }
        });

        setBalancesData({
          totalOwedToUser: parseFloat(totalOwedToUser.toFixed(2)),
          totalUserOwes: parseFloat(totalUserOwes.toFixed(2)),
          netOverallBalance: parseFloat((totalOwedToUser - totalUserOwes).toFixed(2)),
          debtors: debtors.sort((a,b) => b.amount - a.amount),
          creditors: creditors.sort((a,b) => a.amount - b.amount)
        });

      } catch (err) {
        console.error("Error fetching overall balances for settle up:", err);
        setError("Could not load settlement details. Please try again.");
      } finally {
        setIsLoading(false);
      }
    };

    fetchOverallBalances();
  }, [currentUser]);

  if (!currentUser && !isLoading && !error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-10rem)] text-center p-4">
        <AlertTriangle className="w-16 h-16 text-destructive mb-4" />
        <h1 className="text-3xl font-bold mb-2">Access Denied</h1>
        <p className="text-lg text-muted-foreground mb-6">Please log in to settle up debts.</p>
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
  
  const currencySymbol = getCurrencySymbol();

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Settle All Debts</h1>
        <p className="text-muted-foreground">
          Guidance for settling your overall debts across all groups.
        </p>
      </div>

      {isLoading ? (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <Skeleton className="h-7 w-52" />
              <Skeleton className="h-4 w-72 mt-1" />
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-3">
              <Skeleton className="h-24 w-full" />
              <Skeleton className="h-24 w-full" />
              <Skeleton className="h-24 w-full" />
            </CardContent>
          </Card>
          <Card>
            <CardHeader><Skeleton className="h-6 w-40" /></CardHeader>
            <CardContent><Skeleton className="h-16 w-full" /></CardContent>
          </Card>
          <Card>
            <CardHeader><Skeleton className="h-6 w-40" /></CardHeader>
            <CardContent><Skeleton className="h-16 w-full" /></CardContent>
          </Card>
        </div>
      ) : balancesData ? (
        <>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <HandCoins className="mr-2 h-6 w-6 text-primary" />
                Settlement Summary
              </CardTitle>
              <CardDescription>
                Your overall financial position to help with settlements.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-6 md:grid-cols-3">
              <Card className="bg-green-50 dark:bg-green-900/30 border-green-200 dark:border-green-700">
                <CardHeader className="pb-2">
                  <CardDescription className="text-green-700 dark:text-green-400">Total Owed To You</CardDescription>
                  <CardTitle className="text-3xl text-green-600 dark:text-green-300">
                    {currencySymbol}{balancesData.totalOwedToUser.toFixed(2)}
                  </CardTitle>
                </CardHeader>
              </Card>
              <Card className="bg-red-50 dark:bg-red-900/30 border-red-200 dark:border-red-700">
                <CardHeader className="pb-2">
                  <CardDescription className="text-red-700 dark:text-red-400">Total You Owe Others</CardDescription>
                  <CardTitle className="text-3xl text-red-600 dark:text-red-300">
                    {currencySymbol}{balancesData.totalUserOwes.toFixed(2)}
                  </CardTitle>
                </CardHeader>
              </Card>
              <Card className={`${balancesData.netOverallBalance >= 0 ? 'bg-blue-50 dark:bg-blue-900/30 border-blue-200 dark:border-blue-700' : 'bg-orange-50 dark:bg-orange-900/30 border-orange-200 dark:border-orange-700'}`}>
                <CardHeader className="pb-2">
                  <CardDescription className={`${balancesData.netOverallBalance >=0 ? 'text-blue-700 dark:text-blue-400' : 'text-orange-700 dark:text-orange-400'}`}>Your Net Position</CardDescription>
                  <CardTitle className={`text-3xl ${balancesData.netOverallBalance >=0 ? 'text-blue-600 dark:text-blue-300' : 'text-orange-600 dark:text-orange-300'}`}>
                    {currencySymbol}{balancesData.netOverallBalance.toFixed(2)}
                    <span className="text-sm ml-1">{balancesData.netOverallBalance >= 0 ? "(You are net owed)" : "(You net owe)"}</span>
                  </CardTitle>
                </CardHeader>
              </Card>
            </CardContent>
          </Card>
          
          <Alert>
            <Info className="h-4 w-4" />
            <AlertTitle>How to Settle Up</AlertTitle>
            <AlertDescription>
              This page summarizes who owes whom across all your groups. To actually record a payment (e.g., if you pay someone back, or someone pays you), please go to the specific group where the expenses originated and use the &quot;Settle Up&quot; feature available on that group&apos;s detail page. This ensures payments are correctly attributed.
            </AlertDescription>
          </Alert>

          {balancesData.creditors.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center text-red-600 dark:text-red-400">
                  <ArrowUpCircle className="mr-2 h-6 w-6" />
                  Who You Owe (Overall)
                </CardTitle>
                <CardDescription>Individuals you owe money to across all groups.</CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-3">
                  {balancesData.creditors.map((creditor) => (
                    <li key={creditor.userId} className="flex flex-col items-start sm:flex-row sm:items-center sm:justify-between p-3 border rounded-md hover:bg-muted/20">
                      <div className="flex items-center gap-3 mb-2 sm:mb-0">
                        <Avatar>
                          <AvatarImage src={creditor.userAvatarUrl || undefined} alt={creditor.userName} />
                          <AvatarFallback>{getInitials(creditor.userName)}</AvatarFallback>
                        </Avatar>
                        <span className="font-medium">{creditor.userName}</span>
                      </div>
                      <div className="w-full sm:w-auto text-left sm:text-right">
                        <span className="font-semibold text-red-600 dark:text-red-400">
                          You owe: {currencySymbol}{Math.abs(creditor.amount).toFixed(2)}
                        </span>
                        <p className="text-xs text-muted-foreground mt-0.5">To settle, record payment in a shared group.</p>
                      </div>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}

          {balancesData.debtors.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center text-green-600 dark:text-green-400">
                  <ArrowDownCircle className="mr-2 h-6 w-6" />
                  Who Owes You (Overall)
                </CardTitle>
                <CardDescription>Individuals who owe you money across all groups.</CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-3">
                  {balancesData.debtors.map((debtor) => (
                    <li key={debtor.userId} className="flex flex-col items-start sm:flex-row sm:items-center sm:justify-between p-3 border rounded-md hover:bg-muted/20">
                      <div className="flex items-center gap-3 mb-2 sm:mb-0">
                        <Avatar>
                          <AvatarImage src={debtor.userAvatarUrl || undefined} alt={debtor.userName} />
                          <AvatarFallback>{getInitials(debtor.userName)}</AvatarFallback>
                        </Avatar>
                        <span className="font-medium">{debtor.userName}</span>
                      </div>
                       <div className="w-full sm:w-auto text-left sm:text-right">
                        <span className="font-semibold text-green-600 dark:text-green-400">
                          Owes you: {currencySymbol}{debtor.amount.toFixed(2)}
                        </span>
                         <p className="text-xs text-muted-foreground mt-0.5">They can record payment in a shared group.</p>
                      </div>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}

          {balancesData.debtors.length === 0 && balancesData.creditors.length === 0 && (
             <Card>
                <CardContent className="p-10 text-center">
                    <DollarSignIcon className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                    <h3 className="text-xl font-semibold mb-2">All Clear!</h3>
                    <p className="text-muted-foreground">
                    You have no outstanding debts or credits across any of your groups.
                    </p>
                </CardContent>
            </Card>
          )}
        </>
      ) : (
         <Card>
            <CardContent className="p-10 text-center">
                <BarChart3 className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-xl font-semibold mb-2">No Balances Found</h3>
                <p className="text-muted-foreground">
                  Could not load or calculate balance information. This might be because you're not part of any groups or there are no expenses recorded yet.
                </p>
            </CardContent>
        </Card>
      )}
       <div className="text-center mt-6">
            <Button asChild variant="outline">
                <Link href="/dashboard">Back to Dashboard</Link>
            </Button>
        </div>
    </div>
  );
}


    