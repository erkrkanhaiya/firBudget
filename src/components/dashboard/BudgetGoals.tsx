import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Utensils, Home, Car, ShoppingBag, Target } from 'lucide-react';
import type { Category } from '@/types'; // Reuse Category type if defined elsewhere
import { cn } from '@/lib/utils'; // Import the cn utility

// Placeholder Data - Replace with actual budget and spending data
interface BudgetProgress extends Category {
  budget: number;
  spent: number;
}

const budgetData: BudgetProgress[] = [
  { id: 'cat1', name: 'Food & Dining', icon: Utensils, budget: 500, spent: 380.50 },
  { id: 'cat2', name: 'Housing', icon: Home, budget: 1200, spent: 1150.00 },
  { id: 'cat3', name: 'Transportation', icon: Car, budget: 150, spent: 165.20 }, // Over budget example
  { id: 'cat4', name: 'Shopping', icon: ShoppingBag, budget: 300, spent: 120.75 },
];


export default function BudgetGoals() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Target className="h-5 w-5" /> Budget Goals (This Month)
        </CardTitle>
        <CardDescription>Track your progress towards category budgets.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {budgetData.map((item) => {
          const progress = Math.min(100, (item.spent / item.budget) * 100);
          const isOverBudget = item.spent > item.budget;
          const remaining = item.budget - item.spent;

          return (
            <div key={item.id} className="space-y-1">
              <div className="flex justify-between items-center text-sm">
                <div className="flex items-center gap-2 font-medium">
                  <item.icon className="h-4 w-4 text-muted-foreground" />
                  <span>{item.name}</span>
                </div>
                <div className={cn("font-mono text-xs", isOverBudget ? "text-destructive" : "text-muted-foreground")}>
                  ${item.spent.toFixed(2)} / ${item.budget.toFixed(2)}
                </div>
              </div>
              <Progress
                value={progress}
                aria-label={`${item.name} budget progress`}
                className={cn(isOverBudget && "[&>div]:bg-destructive")} // Custom class for over-budget progress bar
              />
               <div className="text-xs text-muted-foreground text-right">
                {isOverBudget
                  ? `Over by $${Math.abs(remaining).toFixed(2)}`
                  : `$${remaining.toFixed(2)} remaining`}
              </div>
            </div>
          );
        })}
        {/* Add a button or link to manage budgets */}
        {/* <Button variant="outline" size="sm" className="mt-4 w-full">Manage Budgets</Button> */}
      </CardContent>
    </Card>
  );
}
