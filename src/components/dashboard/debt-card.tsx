import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { HandCoins } from "lucide-react";
import type { Debt, User } from "@/types";
import { cn } from "@/lib/utils";

interface DebtCardProps {
  debt: Debt;
  type: "owedToUser" | "userOwes";
  onSettle?: (debtId: string) => void;
}

const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase();
}

export function DebtCard({ debt, type, onSettle }: DebtCardProps) {
  const relevantUser = type === "owedToUser" ? debt.fromUser : debt.toUser;
  const titleText = type === "owedToUser" 
    ? `${relevantUser.name} owes you` 
    : `You owe ${relevantUser.name}`;
  
  const amountColor = type === "owedToUser" ? "text-green-600" : "text-red-600";

  return (
    <Card className="shadow-md hover:shadow-lg transition-shadow duration-200">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{titleText}</CardTitle>
        <Avatar className="h-8 w-8">
          <AvatarImage src={relevantUser.avatarUrl} alt={relevantUser.name} data-ai-hint="person portrait" />
          <AvatarFallback>{getInitials(relevantUser.name)}</AvatarFallback>
        </Avatar>
      </CardHeader>
      <CardContent>
        <div className={cn("text-2xl font-bold", amountColor)}>
          ${debt.amount.toFixed(2)}
        </div>
        {debt.groupName && (
          <p className="text-xs text-muted-foreground pt-1">
            Via: {debt.groupName}
          </p>
        )}
        {type === "userOwes" && onSettle && (
          <Button 
            size="sm" 
            variant="outline" 
            className="mt-4 w-full" 
            onClick={() => onSettle(debt.id)}
          >
            <HandCoins className="mr-2 h-4 w-4" />
            Settle Up
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
