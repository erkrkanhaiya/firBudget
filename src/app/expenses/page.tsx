
"use client";

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertTriangle, CreditCard, Users, CalendarDays, DollarSign as DollarSignIcon, ArrowRight } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useUser } from '@/contexts/UserContext';
import { mockExpenses, mockUsers, mockGroups } from '@/data/mock';
import type { Expense, User as UserType, Group } from '@/types';
import { format, parseISO } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { useCurrency } from '@/contexts/CurrencyContext';
import { Skeleton } from '@/components/ui/skeleton';
import React, { useState, useEffect } from 'react';

const getInitials = (name: string | undefined) => {
  if (!name) return "U";
  const names = name.split(' ');
  if (names.length > 1) {
    return names[0][0] + names[names.length - 1][0];
  }
  return name.substring(0, 2).toUpperCase();
};

export default function MyExpensesPage() {
  const { currentUser } = useUser();
  const { getCurrencySymbol } = useCurrency();
  const [isLoading, setIsLoading] = useState(true);
  const [userInvolvedExpenses, setUserInvolvedExpenses] = useState<Expense[]>([]);

  useEffect(() => {
    if (currentUser) {
      // Simulate data fetching
      const timer = setTimeout(() => {
        const filteredExpenses = mockExpenses.filter(expense =>
          expense.paidByUserId === currentUser.id ||
          expense.participants.some(p => p.userId === currentUser.id)
        ).sort((a, b) => parseISO(b.date).getTime() - parseISO(a.date).getTime());
        setUserInvolvedExpenses(filteredExpenses);
        setIsLoading(false);
      }, 750); // 0.75 second delay
      return () => clearTimeout(timer);
    } else {
      setIsLoading(false);
    }
  }, [currentUser]);

  if (!currentUser && !isLoading) {
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

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">My Expenses</h1>
        <p className="text-muted-foreground">A summary of all expenses you're involved in.</p>
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
          {userInvolvedExpenses.map((expense) => {
            const payer = mockUsers.find(u => u.id === expense.paidByUserId);
            const group = mockGroups.find(g => g.id === expense.groupId);
            const currentUserParticipantInfo = expense.participants.find(p => p.userId === currentUser!.id);

            return (
              <Card key={expense.id} className="overflow-hidden">
                <CardHeader className="flex flex-row items-start bg-muted/50 gap-4 p-4">
                  <Avatar className="h-12 w-12 border">
                    <AvatarImage src={payer?.avatarUrl} alt={payer?.name} />
                    <AvatarFallback>{getInitials(payer?.name)}</AvatarFallback>
                  </Avatar>
                  <div className="grid gap-0.5 flex-1">
                    <CardTitle className="text-lg group flex items-center gap-2">
                      {expense.description}
                    </CardTitle>
                    <CardDescription className="text-xs">
                      Paid by {payer?.id === currentUser!.id ? "You" : payer?.name || 'Unknown User'} on {format(parseISO(expense.date), "MMMM d, yyyy")}
                    </CardDescription>
                     {group && (
                        <p className="text-xs text-muted-foreground">
                            In group: <Link href={`/groups/${group.id}`} className="text-primary hover:underline">{group.name}</Link>
                        </p>
                    )}
                  </div>
                  <div className="text-right">
                     <div className="text-xl font-bold flex items-center">
                        <span className="mr-1 text-muted-foreground">{getCurrencySymbol()}</span>
                        {expense.amount.toFixed(2)}
                    </div>
                    {currentUserParticipantInfo && expense.paidByUserId !== currentUser!.id && (
                        <Badge variant="outline" className="mt-1 text-xs">Your share: {getCurrencySymbol()}{currentUserParticipantInfo.amountOwed.toFixed(2)}</Badge>
                    )}
                    {expense.paidByUserId === currentUser!.id && expense.participants.length > 1 && (
                         <Badge variant="secondary" className="mt-1 text-xs">You paid</Badge>
                    )}
                  </div>
                </CardHeader>
              </Card>
            );
          })}
        </div>
      ) : (
        <Card>
          <CardContent className="p-10 text-center">
            <CreditCard className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-xl font-semibold mb-2">No Expenses Yet!</h3>
            <p className="text-muted-foreground">
              You're not currently part of any expenses. Expenses from your groups will appear here.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
