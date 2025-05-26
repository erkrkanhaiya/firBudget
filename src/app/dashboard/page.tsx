'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { PlusCircle, Users, ArrowRight, BarChart3, AlertTriangle } from 'lucide-react';
import { useUser } from '@/contexts/UserContext';
import { mockGroups, mockExpenses } from '@/data/mock'; // Using mock data for now
import Image from 'next/image';

export default function DashboardPage() {
  const { currentUser } = useUser();

  if (!currentUser) {
    // This should ideally be handled by a route guard or redirect in a real app
    return (
        <div className="flex flex-col items-center justify-center min-h-[calc(100vh-10rem)] text-center p-4">
            <AlertTriangle className="w-16 h-16 text-destructive mb-4" />
            <h1 className="text-3xl font-bold mb-2">Access Denied</h1>
            <p className="text-lg text-muted-foreground mb-6">Please log in to view the dashboard.</p>
            <Button asChild>
                <Link href="/login">Go to Login</Link>
            </Button>
        </div>
    );
  }

  const userGroups = mockGroups.filter(group => group.members.some(member => member.id === currentUser.id));
  const totalExpenses = mockExpenses.length; // Simplified: total expenses in system, not specific to user

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Welcome back, {currentUser.name}!</h1>
          <p className="text-muted-foreground">Here's what's happening with your shared expenses.</p>
        </div>
        <Button asChild size="lg">
          <Link href="/groups/create">
            <PlusCircle className="mr-2 h-5 w-5" /> Create New Group
          </Link>
        </Button>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Your Groups</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{userGroups.length}</div>
            <p className="text-xs text-muted-foreground">
              Actively participating groups
            </p>
          </CardContent>
          <CardFooter>
            <Button asChild variant="outline" size="sm" className="w-full">
              <Link href="/groups">
                View All Groups <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </CardFooter>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Overall Owed (Demo)</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">$25.50</div>
            <p className="text-xs text-muted-foreground">
              Net amount others owe you across all groups
            </p>
          </CardContent>
           <CardFooter>
            <Button asChild variant="outline" size="sm" className="w-full">
              <Link href="/balances">
                View Balances <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </CardFooter>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Debts (Demo)</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">$10.00</div>
            <p className="text-xs text-muted-foreground">
              Net amount you owe others across all groups
            </p>
          </CardContent>
          <CardFooter>
            <Button asChild variant="destructive" size="sm" className="w-full">
              <Link href="/settle-up">
                Settle Up <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </CardFooter>
        </Card>
      </div>

      <div>
        <h2 className="text-2xl font-semibold mb-4">Recent Activity (Placeholder)</h2>
        <div className="grid gap-4">
          {[1,2,3].map(i => (
            <Card key={i}>
              <CardContent className="p-4 flex items-center space-x-4">
                <Image data-ai-hint="profile avatar" src="https://placehold.co/40x40.png" alt="User avatar" width={40} height={40} className="rounded-full" />
                <div>
                  <p className="text-sm font-medium">Maria added "Dinner" to Europe Trip</p>
                  <p className="text-xs text-muted-foreground">2 hours ago</p>
                </div>
                <span className="ml-auto text-sm font-semibold">$25.00</span>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
