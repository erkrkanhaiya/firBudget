"use client";

import { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PlusCircle, ArrowRightLeft } from "lucide-react";
import Link from "next/link";
import { DebtCard } from "@/components/dashboard/debt-card";
import { ActivityFeed } from "@/components/dashboard/activity-feed";
import { mockExpenses, currentUser, calculateCurrentUserDebts } from "@/lib/mock-data";
import type { Debt } from "@/types";

export default function DashboardPage() {
  const [userDebts, setUserDebts] = useState<{ owedToUser: Debt[], userOwes: Debt[] }>({ owedToUser: [], userOwes: [] });
  const [totalOwedToUser, setTotalOwedToUser] = useState(0);
  const [totalUserOwes, setTotalUserOwes] = useState(0);

  useEffect(() => {
    const debts = calculateCurrentUserDebts(currentUser.id);
    setUserDebts(debts);
    setTotalOwedToUser(debts.owedToUser.reduce((sum, debt) => sum + debt.amount, 0));
    setTotalUserOwes(debts.userOwes.reduce((sum, debt) => sum + debt.amount, 0));
  }, []);

  const handleSettleDebt = (debtId: string) => {
    // In a real app, this would trigger a settlement process
    // For now, we can log it or update mock data if persistent state is managed
    console.log(`Attempting to settle debt ID: ${debtId}`);
    // Potentially redirect to /settle-up page with pre-filled data
    // router.push(`/settle-up?debtId=${debtId}`);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground">Welcome back, {currentUser.name}!</p>
        </div>
        <div className="flex gap-2">
          <Button asChild>
            <Link href="/add-expense">
              <PlusCircle className="mr-2 h-4 w-4" /> Add Expense
            </Link>
          </Button>
          <Button variant="outline" asChild>
            <Link href="/settle-up">
              <ArrowRightLeft className="mr-2 h-4 w-4" /> Settle Up
            </Link>
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="shadow-md bg-green-50 border-green-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-green-700">You are Owed</CardTitle>
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" className="h-4 w-4 text-green-600"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-700">${totalOwedToUser.toFixed(2)}</div>
            <p className="text-xs text-green-500">
              Across {userDebts.owedToUser.length} person(s)/item(s)
            </p>
          </CardContent>
        </Card>
        <Card className="shadow-md bg-red-50 border-red-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-red-700">You Owe</CardTitle>
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" className="h-4 w-4 text-red-600"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-700">${totalUserOwes.toFixed(2)}</div>
            <p className="text-xs text-red-500">
              Across {userDebts.userOwes.length} person(s)/item(s)
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <div>
          <h2 className="text-xl font-semibold mb-3">Who Owes You</h2>
          {userDebts.owedToUser.length > 0 ? (
            <div className="space-y-4">
              {userDebts.owedToUser.map(debt => (
                <DebtCard key={debt.id} debt={debt} type="owedToUser" />
              ))}
            </div>
          ) : (
            <p className="text-muted-foreground">No one owes you anything right now. Lucky you!</p>
          )}
        </div>
        <div>
          <h2 className="text-xl font-semibold mb-3">Who You Owe</h2>
           {userDebts.userOwes.length > 0 ? (
            <div className="space-y-4">
              {userDebts.userOwes.map(debt => (
                <DebtCard key={debt.id} debt={debt} type="userOwes" onSettle={handleSettleDebt} />
              ))}
            </div>
          ) : (
            <p className="text-muted-foreground">You don't owe anyone anything. Great job!</p>
          )}
        </div>
      </div>
      
      <ActivityFeed expenses={mockExpenses} />
    </div>
  );
}
