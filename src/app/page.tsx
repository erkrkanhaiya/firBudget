import KeyInsights from '@/components/dashboard/KeyInsights';
import SpendingChart from '@/components/dashboard/SpendingChart';
import BudgetGoals from '@/components/dashboard/BudgetGoals';
import TransactionForm from '@/components/dashboard/TransactionForm';

export default function Home() {
  return (
    <div className="container mx-auto p-4 md:p-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <TransactionForm />
      </div>

      <div className="space-y-6">
        {/* Key Insights Section */}
        <KeyInsights />

        {/* Charts and Goals Section */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <SpendingChart />
          </div>
          <div className="lg:col-span-1">
             <BudgetGoals />
          </div>
        </div>

        {/* Recent Transactions List (Placeholder) */}
        {/* <Card>
          <CardHeader>
            <CardTitle>Recent Transactions</CardTitle>
             <CardDescription>Your latest income and expenses.</CardDescription>
          </CardHeader>
          <CardContent>
             <p className="text-muted-foreground">Transaction list will go here.</p>
          </CardContent>
        </Card> */}
      </div>
    </div>
  );
}
