
'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { PlusCircle, Users, ArrowRight, BarChart3, AlertTriangle, ShoppingCart, ListChecks, Activity as ActivityIcon, Loader2, Zap } from 'lucide-react';
import { useUser } from '@/contexts/UserContext';
import Image from 'next/image';
import { useLanguage } from '@/contexts/LanguageContext';
import { useCurrency } from '@/contexts/CurrencyContext';
import React, { useState, useEffect, FormEvent } from 'react';
import { db } from '@/lib/firebase';
import { collection, query, where, getDocs, Timestamp, orderBy, limit, addDoc, serverTimestamp, writeBatch, doc } from 'firebase/firestore';
import type { Group as GroupType, ActivityLog, User as UserType, Expense, ExpenseParticipant } from '@/types';
import { Skeleton } from '@/components/ui/skeleton';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { format, parseISO } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import { useNotification } from '@/contexts/NotificationContext';

// Helper function to get initials
const getInitials = (name: string | undefined | null) => {
  if (!name) return "U";
  const names = name.split(' ');
  if (names.length > 1 && names[0] && names[names.length - 1]) {
    return (names[0][0] + names[names.length - 1][0]).toUpperCase();
  }
  if (name.length > 0) return name.substring(0, 2).toUpperCase();
  return "U";
};

// Client-side date formatting component to prevent hydration errors
interface ClientFormattedDateProps {
  timestamp: string;
  formatString?: string;
}

const ClientFormattedDate: React.FC<ClientFormattedDateProps> = ({ timestamp, formatString = "MMMM d, yyyy 'at' h:mm a" }) => {
  const [formattedDate, setFormattedDate] = useState<string | null>(null);

  useEffect(() => {
    try {
      const date = parseISO(timestamp);
      setFormattedDate(format(date, formatString));
    } catch (error) {
      console.error("Error formatting date:", error);
      setFormattedDate("Invalid date");
    }
  }, [timestamp, formatString]);

  if (formattedDate === null) {
    return <span className="text-xs text-muted-foreground">Loading date...</span>;
  }
  return <>{formattedDate}</>;
};

interface EnrichedActivityLog extends ActivityLog {
  groupName?: string;
  actorName?: string;
  actorAvatarUrl?: string | null;
}

const MAX_RECENT_ACTIVITIES = 3;

export default function DashboardPage() {
  const { currentUser } = useUser();
  const { translate } = useLanguage();
  const { getCurrencySymbol } = useCurrency();
  const { toast } = useToast();
  const { addNotification } = useNotification();

  const [userGroupsCount, setUserGroupsCount] = useState<number | null>(null);
  const [isLoadingGroupsCount, setIsLoadingGroupsCount] = useState(true);
  const [recentActivities, setRecentActivities] = useState<EnrichedActivityLog[]>([]);
  const [isLoadingActivities, setIsLoadingActivities] = useState(true);

  const [lastActiveGroup, setLastActiveGroup] = useState<GroupType | null>(null);
  const [quickExpenseDescription, setQuickExpenseDescription] = useState('');
  const [quickExpenseAmount, setQuickExpenseAmount] = useState('');
  const [isSubmittingQuickExpense, setIsSubmittingQuickExpense] = useState(false);


  useEffect(() => {
    const fetchDashboardData = async () => {
      if (!currentUser) {
        setIsLoadingGroupsCount(false);
        setIsLoadingActivities(false);
        setLastActiveGroup(null);
        return;
      }
      setIsLoadingGroupsCount(true);
      setIsLoadingActivities(true);
      setLastActiveGroup(null);

      try {
        // Fetch groups
        const groupsQuery = query(
          collection(db, 'groups'),
          where('memberIds', 'array-contains', currentUser.id)
        );
        const groupsSnapshot = await getDocs(groupsQuery);
        setUserGroupsCount(groupsSnapshot.size);
        setIsLoadingGroupsCount(false);

        const userGroups: GroupType[] = [];
        const groupsDataMap = new Map<string, GroupType>();
        groupsSnapshot.docs.forEach(docSnap => {
             const data = docSnap.data();
             const group = {
                id: docSnap.id,
                name: data.name,
                members: data.members || [],
                memberIds: data.memberIds || [],
                ownerId: data.ownerId,
                visibility: data.visibility,
                createdAt: (data.createdAt as Timestamp)?.toDate().toISOString() || new Date().toISOString(),
             } as GroupType;
             groupsDataMap.set(docSnap.id, group);
             userGroups.push(group);
        });
        
        // Fetch recent activities
        const userGroupIds = Array.from(groupsDataMap.keys());

        if (userGroupIds.length === 0) {
          setRecentActivities([]);
          setIsLoadingActivities(false);
          setLastActiveGroup(null);
          return;
        }

        let fetchedLogs: EnrichedActivityLog[] = [];
        const activityLogPromises = userGroupIds.map(groupId => {
          const logsColRef = collection(db, 'groups', groupId, 'activityLog');
          return getDocs(query(logsColRef, orderBy('timestamp', 'desc'), limit(MAX_RECENT_ACTIVITIES)));
        });

        const groupActivityLogSnapshots = await Promise.all(activityLogPromises);
        
        groupActivityLogSnapshots.forEach((snapshot, index) => {
          const groupId = userGroupIds[index];
          const group = groupsDataMap.get(groupId);

          snapshot.forEach(docSnap => {
            const logData = docSnap.data() as Omit<ActivityLog, 'id' | 'timestamp'> & { timestamp: Timestamp | string };
            const actor = group?.members.find(m => m.id === logData.userId);
            
            fetchedLogs.push({
              id: docSnap.id,
              ...logData,
              timestamp: (logData.timestamp instanceof Timestamp ? logData.timestamp.toDate().toISOString() : logData.timestamp as string),
              groupName: group?.name,
              actorName: actor?.name,
              actorAvatarUrl: actor?.avatarUrl,
              groupId: group?.id // Ensure groupId is on the log for lastActiveGroup determination
            });
          });
        });

        fetchedLogs.sort((a, b) => parseISO(b.timestamp).getTime() - parseISO(a.timestamp).getTime());
        setRecentActivities(fetchedLogs.slice(0, MAX_RECENT_ACTIVITIES));
        setIsLoadingActivities(false);

        // Determine last active group
        if (fetchedLogs.length > 0 && fetchedLogs[0].groupId) {
            const activeGroupId = fetchedLogs[0].groupId;
            const activeGroupDetails = groupsDataMap.get(activeGroupId);
            if (activeGroupDetails) {
                setLastActiveGroup(activeGroupDetails);
            }
        } else if (userGroups.length > 0) {
            // Fallback to most recently created group
            userGroups.sort((a,b) => parseISO(b.createdAt).getTime() - parseISO(a.createdAt).getTime());
            setLastActiveGroup(userGroups[0]);
        }


      } catch (error) {
        console.error("Error fetching dashboard data:", error);
        setUserGroupsCount(0); 
        setRecentActivities([]);
        setLastActiveGroup(null);
      } finally {
        setIsLoadingGroupsCount(false); 
        setIsLoadingActivities(false);
      }
    };
    fetchDashboardData();
  }, [currentUser]);

  const handleQuickAddExpense = async (event: FormEvent) => {
    event.preventDefault();
    if (!currentUser || !lastActiveGroup || !quickExpenseDescription.trim() || !quickExpenseAmount.trim() || parseFloat(quickExpenseAmount) <= 0) {
      toast({ title: "Invalid Input", description: "Please enter a valid description and amount.", variant: "destructive" });
      return;
    }
    setIsSubmittingQuickExpense(true);

    const numericAmount = parseFloat(quickExpenseAmount);
    const participantsCount = lastActiveGroup.members.length;
    if (participantsCount === 0) {
        toast({ title: "Group Error", description: "Last active group has no members to split with.", variant: "destructive"});
        setIsSubmittingQuickExpense(false);
        return;
    }
    const share = parseFloat((numericAmount / participantsCount).toFixed(2));
    const expenseParticipants: ExpenseParticipant[] = lastActiveGroup.members.map(member => ({
        userId: member.id,
        amountOwed: share,
    }));

    // Adjust last participant's share for potential rounding issues to ensure sum matches total
    const sumOfShares = expenseParticipants.reduce((acc, p) => acc + p.amountOwed, 0);
    if (sumOfShares !== numericAmount && expenseParticipants.length > 0) {
        const diff = numericAmount - sumOfShares;
        expenseParticipants[expenseParticipants.length - 1].amountOwed += diff;
        expenseParticipants[expenseParticipants.length - 1].amountOwed = parseFloat(expenseParticipants[expenseParticipants.length - 1].amountOwed.toFixed(2));
    }

    const expenseForFirestore: Omit<Expense, 'id' | 'createdAt'> = {
      groupId: lastActiveGroup.id,
      description: quickExpenseDescription.trim(),
      amount: numericAmount,
      paidByUserId: currentUser.id,
      date: new Date().toISOString(),
      participants: expenseParticipants,
    };

    const activityLogForFirestore: Omit<ActivityLog, 'id' | 'timestamp'> = {
      groupId: lastActiveGroup.id,
      userId: currentUser.id,
      actionType: 'expense_added',
      description: `${currentUser.name || 'User'} added expense: ${quickExpenseDescription.trim()} (quick add)`,
    };
    
    try {
      const batch = writeBatch(db);
      const expenseColRef = collection(db, 'groups', lastActiveGroup.id, 'expenses');
      const newExpenseDocRef = doc(expenseColRef); // Auto-generate ID
      activityLogForFirestore.relatedExpenseId = newExpenseDocRef.id; // Link activity log to expense

      batch.set(newExpenseDocRef, { ...expenseForFirestore, createdAt: serverTimestamp() });
      
      const activityLogColRef = collection(db, 'groups', lastActiveGroup.id, 'activityLog');
      batch.set(doc(activityLogColRef), { ...activityLogForFirestore, timestamp: serverTimestamp() });
      
      await batch.commit();

      toast({
        title: "Expense Added!",
        description: `Quick expense "${quickExpenseDescription.trim()}" added to "${lastActiveGroup.name}".`,
      });
      addNotification({
        title: "Quick Expense Added",
        message: `Added "${quickExpenseDescription.trim()}" to group "${lastActiveGroup.name}".`,
        type: "success",
        href: `/groups/${lastActiveGroup.id}`,
      });
      setQuickExpenseDescription('');
      setQuickExpenseAmount('');
    } catch (error) {
      console.error("Error quick adding expense:", error);
      toast({ title: "Error", description: "Could not add quick expense.", variant: "destructive" });
      addNotification({
        title: "Quick Expense Failed",
        message: `Could not add expense to "${lastActiveGroup.name}".`,
        type: "destructive",
      });
    } finally {
      setIsSubmittingQuickExpense(false);
    }
  };

  if (!currentUser && !isLoadingGroupsCount && !isLoadingActivities) {
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
            {isLoadingGroupsCount || !currentUser ? <Skeleton className="h-9 w-64" /> : translate({
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
            {isLoadingGroupsCount ? <Skeleton className="h-8 w-12 mb-1" /> : <div className="text-2xl font-bold">{userGroupsCount ?? 0}</div>}
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

      {currentUser && lastActiveGroup && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Zap className="h-5 w-5 text-primary" />
              Quick Add Expense to "{lastActiveGroup.name}"
            </CardTitle>
            <CardDescription>
              Payer: You | Date: Today | Splits equally with all {lastActiveGroup.members.length} members.
            </CardDescription>
          </CardHeader>
          <form onSubmit={handleQuickAddExpense}>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="quickExpenseDescription">Description*</Label>
                <Input
                  id="quickExpenseDescription"
                  value={quickExpenseDescription}
                  onChange={(e) => setQuickExpenseDescription(e.target.value)}
                  placeholder="e.g., Coffee, Lunch"
                  required
                  disabled={isSubmittingQuickExpense}
                />
              </div>
              <div>
                <Label htmlFor="quickExpenseAmount">Amount*</Label>
                <div className="relative">
                  <span className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground">{getCurrencySymbol()}</span>
                  <Input
                    id="quickExpenseAmount"
                    type="number"
                    value={quickExpenseAmount}
                    onChange={(e) => setQuickExpenseAmount(e.target.value)}
                    placeholder="0.00"
                    className="pl-8"
                    required
                    step="0.01"
                    min="0.01"
                    disabled={isSubmittingQuickExpense}
                  />
                </div>
              </div>
            </CardContent>
            <CardFooter>
              <Button type="submit" className="ml-auto" disabled={isSubmittingQuickExpense || !quickExpenseDescription || !quickExpenseAmount}>
                {isSubmittingQuickExpense ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <PlusCircle className="mr-2 h-4 w-4" />
                )}
                {isSubmittingQuickExpense ? "Adding..." : "Quick Add"}
              </Button>
            </CardFooter>
          </form>
        </Card>
      )}

      <div>
        <h2 className="text-2xl font-semibold mb-4">
          {translate({ en: "Recent Activity Highlights", hi: "हाल की गतिविधि की मुख्य बातें" })}
        </h2>
        <div className="grid gap-4">
          {isLoadingActivities ? (
            [1,2,3].map(i => (
              <Card key={i}>
                <CardContent className="p-4 flex items-center space-x-4">
                  <Skeleton className="h-10 w-10 rounded-full border" />
                  <div className="flex-1 space-y-1.5">
                    <Skeleton className="h-4 w-4/5" />
                    <Skeleton className="h-3 w-1/4" />
                  </div>
                  <Skeleton className="h-5 w-16" />
                </CardContent>
              </Card>
            ))
          ) : recentActivities.length > 0 ? (
            recentActivities.map(log => (
              <Card key={log.id}>
                <CardContent className="p-4 flex items-start space-x-4">
                  <Avatar className="h-10 w-10 border mt-1">
                    <AvatarImage src={log.actorAvatarUrl || undefined} alt={log.actorName} />
                    <AvatarFallback>{getInitials(log.actorName)}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <p className="text-sm">
                      <span className="font-medium">{log.actorName || 'Unknown User'}</span>
                      {log.description.startsWith(log.actorName || 'Unknown User') 
                        ? log.description.substring((log.actorName || 'Unknown User').length).trim() 
                        : ` ${log.description}`}
                      {log.groupName && log.groupId && (
                        <>
                          {' in group '}
                          <Link href={`/groups/${log.groupId}`} className="text-primary hover:underline font-medium">
                            {log.groupName}
                          </Link>
                        </>
                      )}
                    </p>
                    <p className="text-xs text-muted-foreground">
                       <ClientFormattedDate timestamp={log.timestamp} />
                    </p>
                  </div>
                </CardContent>
              </Card>
            ))
          ) : (
             <Card>
                <CardContent className="p-6 text-center">
                    <ActivityIcon className="mx-auto h-10 w-10 text-muted-foreground mb-3" />
                    <h3 className="text-lg font-semibold mb-1">No Recent Activity</h3>
                    <p className="text-sm text-muted-foreground">
                    Activities from your groups will appear here.
                    </p>
                </CardContent>
            </Card>
          )}
           <p className="text-sm text-muted-foreground text-center py-4">
            Detailed activity feed available on the <Link href="/activity" className="text-primary hover:underline">Activity Page</Link>.
          </p>
        </div>
      </div>
    </div>
  );
}

