
'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { PlusCircle, Users, ArrowRight, BarChart3, AlertTriangle } from 'lucide-react';
import { useUser } from '@/contexts/UserContext';
import { mockGroups, mockExpenses } from '@/data/mock'; 
import Image from 'next/image';
import { useLanguage } from '@/contexts/LanguageContext';

export default function DashboardPage() {
  const { currentUser } = useUser();
  const { translate } = useLanguage();

  if (!currentUser) {
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
  // const totalExpenses = mockExpenses.length; 

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            {translate({
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
        <Button asChild size="lg">
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
            <div className="text-2xl font-bold">{userGroups.length}</div>
            <p className="text-xs text-muted-foreground">
              {translate({ en: "Actively participating groups", hi: "सक्रिय रूप से भाग लेने वाले समूह" })}
            </p>
          </CardContent>
          <CardFooter>
            <Button asChild variant="outline" size="sm" className="w-full">
              <Link href="/groups">
                {translate({ en: "View All Groups", hi: "सभी समूह देखें" })} <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </CardFooter>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
                 {translate({ en: "Overall Owed (Demo)", hi: "कुल बकाया (डेमो)" })}
            </CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">$25.50</div>
            <p className="text-xs text-muted-foreground">
              {translate({ en: "Net amount others owe you across all groups", hi: "सभी समूहों में दूसरों द्वारा आपको दिया जाने वाला कुल शुद्ध राशि" })}
            </p>
          </CardContent>
           <CardFooter>
            <Button asChild variant="outline" size="sm" className="w-full">
              <Link href="/balances"> {/* Balances page not yet implemented */}
                {translate({ en: "View Balances", hi: "शेष राशि देखें" })} <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </CardFooter>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {translate({ en: "Pending Debts (Demo)", hi: "लंबित ऋण (डेमो)" })}
            </CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">$10.00</div>
            <p className="text-xs text-muted-foreground">
              {translate({ en: "Net amount you owe others across all groups", hi: "सभी समूहों में आपके द्वारा दूसरों को दिया जाने वाला कुल शुद्ध राशि" })}
            </p>
          </CardContent>
          <CardFooter>
            <Button asChild variant="destructive" size="sm" className="w-full">
              <Link href="/settle-up"> {/* Settle-up page for all groups not yet implemented */}
                 {translate({ en: "Settle Up", hi: "निपटारा करें" })} <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </CardFooter>
        </Card>
      </div>

      <div>
        <h2 className="text-2xl font-semibold mb-4">
          {translate({ en: "Recent Activity (Placeholder)", hi: "हाल की गतिविधि (प्लेसहोल्डर)" })}
        </h2>
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
