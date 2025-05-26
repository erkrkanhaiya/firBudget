
'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { PlusCircle, Users, ArrowRight, BarChart3, AlertTriangle, ShoppingCart, ListChecks } from 'lucide-react';
import { useUser } from '@/contexts/UserContext';
import Image from 'next/image';
import { useLanguage } from '@/contexts/LanguageContext';
import { useCurrency } from '@/contexts/CurrencyContext';
import React, { useState, useEffect } from 'react';
import { db } from '@/lib/firebase';
import { collection, query, where, getDocs, Timestamp } from 'firebase/firestore';
import type { Group } from '@/types';
import { Skeleton } from '@/components/ui/skeleton';

export default function DashboardPage() {
  const { currentUser } = useUser();
  const { translate } = useLanguage();
  const { getCurrencySymbol } = useCurrency();
  const [userGroupsCount, setUserGroupsCount] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchDashboardData = async () => {
      if (!currentUser) {
        setIsLoading(false);
        return;
      }
      setIsLoading(true);
      try {
        const groupsQuery = query(
          collection(db, 'groups'),
          where('memberIds', 'array-contains', currentUser.id)
        );
        const groupsSnapshot = await getDocs(groupsQuery);
        setUserGroupsCount(groupsSnapshot.size);
      } catch (error) {
        console.error("Error fetching dashboard data:", error);
        setUserGroupsCount(0); // Fallback
      } finally {
        setIsLoading(false);
      }
    };
    fetchDashboardData();
  }, [currentUser]);

  if (!currentUser && !isLoading) {
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

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            {isLoading || !currentUser ? <Skeleton className="h-9 w-64" /> : translate({
              en: `Welcome back, ${currentUser.name}!`,
              hi: `वापस स्वागत है, ${currentUser.name}!`,
            })}
          </h1>
          <p className="text-muted-foreground">
            {translate({
              en: "Here's what's happening with your shared expenses.",
              hi: "आपके साझा खर्चों के साथ क्या हो रहा है, यहाँ देखें।",
            })}
          </p>
        </div>
        <Button asChild size="lg" disabled={!currentUser}>
          <Link href="/groups/create">
            <PlusCircle className="mr-2 h-5 w-5" /> 
            {translate({ en: "Create New Group", hi: "नया समूह बनाएं" })}
          </Link>
        </Button>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {translate({ en: "Your Groups", hi: "आपके समूह" })}
            </CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoading ? <Skeleton className="h-8 w-12 mb-1" /> : <div className="text-2xl font-bold">{userGroupsCount ?? 0}</div>}
            <p className="text-xs text-muted-foreground">
              {translate({ en: "Actively participating groups", hi: "सक्रिय रूप से भाग लेने वाले समूह" })}
            </p>
          </CardContent>
          <CardFooter>
            <Button asChild variant="outline" size="sm" className="w-full" disabled={!currentUser}>
              <Link href="/groups">
                {translate({ en: "View All Groups", hi: "सभी समूह देखें" })} <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </CardFooter>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
                 {translate({ en: "Overall Owed (Summary)", hi: "कुल बकाया (सारांश)" })}
            </CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">--</div>
            <p className="text-xs text-muted-foreground">
              {translate({ en: "Net amount others may owe you. Detailed view coming soon.", hi: "दूसरों द्वारा आपको देय शुद्ध राशि। विस्तृत दृश्य जल्द ही।" })}
            </p>
          </CardContent>
           <CardFooter>
            <Button asChild variant="outline" size="sm" className="w-full" disabled>
              <Link href="/balances"> 
                {translate({ en: "View Balances", hi: "शेष राशि देखें" })} <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </CardFooter>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {translate({ en: "Pending Debts (Summary)", hi: "लंबित ऋण (सारांश)" })}
            </CardTitle>
            <ListChecks className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">--</div>
            <p className="text-xs text-muted-foreground">
              {translate({ en: "Net amount you may owe. Detailed view coming soon.", hi: "आपके द्वारा देय शुद्ध राशि। विस्तृत दृश्य जल्द ही।" })}
            </p>
          </CardContent>
          <CardFooter>
            <Button asChild variant="destructive" size="sm" className="w-full" disabled>
              <Link href="/settle-up"> 
                 {translate({ en: "Settle All", hi: "सभी का निपटान करें" })} <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </CardFooter>
        </Card>
      </div>

      <div>
        <h2 className="text-2xl font-semibold mb-4">
          {translate({ en: "Recent Activity Highlights", hi: "हाल की गतिविधि की मुख्य बातें" })}
        </h2>
        <div className="grid gap-4">
          {[1,2,3].map(i => (
            <Card key={i}>
              <CardContent className="p-4 flex items-center space-x-4">
                <Skeleton className="h-10 w-10 rounded-full" />
                <div className="flex-1 space-y-1.5">
                  <Skeleton className="h-4 w-4/5" />
                  <Skeleton className="h-3 w-1/4" />
                </div>
                <Skeleton className="h-5 w-16" />
              </CardContent>
            </Card>
          ))}
           <p className="text-sm text-muted-foreground text-center py-4">
            Detailed activity feed available on the <Link href="/activity" className="text-primary hover:underline">Activity Page</Link>.
          </p>
        </div>
      </div>
    </div>
  );
}

    