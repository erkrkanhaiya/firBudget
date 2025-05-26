import { ExpenseForm } from "@/components/expenses/expense-form";

export default function AddExpensePage() {
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold tracking-tight">Add New Expense</h1>
      <ExpenseForm />
    </div>
  );
}
