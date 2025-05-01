export type TransactionType = 'income' | 'expense';

export interface Category {
  id: string;
  name: string;
  icon: React.ComponentType<{ className?: string }>; // Lucide icon component
}

export interface Transaction {
  id: string;
  date: Date;
  amount: number;
  type: TransactionType;
  description: string;
  categoryId: string;
}

export interface Budget {
  id: string;
  categoryId: string;
  amount: number;
  month: number; // e.g., 0 for January, 11 for December
  year: number;
}
