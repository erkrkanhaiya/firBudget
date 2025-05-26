import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import type { Expense } from "@/types";
import { mockUsers } from "@/lib/mock-data";
import { formatDistanceToNow } from 'date-fns';

interface ActivityFeedProps {
  expenses: Expense[];
}

const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase();
}

export function ActivityFeed({ expenses }: ActivityFeedProps) {
  const sortedExpenses = [...expenses].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  return (
    <Card className="shadow-md">
      <CardHeader>
        <CardTitle>Recent Activity</CardTitle>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[300px]">
          {sortedExpenses.length === 0 && <p className="text-muted-foreground">No recent activity.</p>}
          <div className="space-y-4">
            {sortedExpenses.map((expense) => {
              const payer = mockUsers.find(u => u.id === expense.paidByUserId);
              return (
                <div key={expense.id} className="flex items-center gap-3 p-2 rounded-md hover:bg-muted/50 transition-colors">
                  <Avatar className="h-9 w-9">
                     <AvatarImage src={payer?.avatarUrl} alt={payer?.name} data-ai-hint="person finance" />
                    <AvatarFallback>{payer ? getInitials(payer.name) : '?'}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <p className="text-sm font-medium leading-none">
                      {payer?.name || 'Unknown'} paid for {expense.title}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      ${expense.totalAmount.toFixed(2)} - {formatDistanceToNow(new Date(expense.date), { addSuffix: true })}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
