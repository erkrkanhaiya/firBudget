
"use client";

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertTriangle, BarChart3, Construction } from 'lucide-react';
import { useUser } from '@/contexts/UserContext';

export default function BalancesPage() {
  const { currentUser } = useUser();

  if (!currentUser) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-10rem)] text-center p-4">
        <AlertTriangle className="w-16 h-16 text-destructive mb-4" />
        <h1 className="text-3xl font-bold mb-2">Access Denied</h1>
        <p className="text-lg text-muted-foreground mb-6">Please log in to view balances.</p>
        <Button asChild>
          <Link href="/login">Go to Login</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Overall Balances</h1>
        <p className="text-muted-foreground">View your consolidated balances across all groups.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <BarChart3 className="mr-2 h-6 w-6 text-primary" />
            Balance Summary
          </CardTitle>
          <CardDescription>
            A detailed breakdown of what you owe and what others owe you globally.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-10 text-center">
          <Construction className="mx-auto h-16 w-16 text-muted-foreground mb-6" />
          <h2 className="text-2xl font-semibold mb-3">Feature Coming Soon!</h2>
          <p className="text-muted-foreground max-w-md mx-auto">
            We're working hard to bring you a comprehensive view of your overall balances. 
            This page will soon provide a clear summary of all your debts and credits across your groups.
          </p>
          <Button asChild className="mt-6">
            <Link href="/dashboard">Back to Dashboard</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
