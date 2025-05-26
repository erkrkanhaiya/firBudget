
export interface User {
  id: string;
  name: string;
  email: string;
  avatarUrl?: string;
}

export interface Group {
  id: string;
  name: string;
  description?: string;
  photoUrl?: string;
  dataAiHint?: string;
  members: User[]; // Store full user objects or just IDs and fetch details as needed
  ownerId: string;
  createdAt: string;
}

export interface ExpenseParticipant {
  userId: string;
  amountOwed: number; // Can be calculated or stored
}

export interface Expense {
  id:string;
  groupId: string;
  description: string;
  amount: number;
  paidByUserId: string;
  date: string; // ISO string format
  participants: ExpenseParticipant[]; // Users involved and their share
  createdAt: string;
}

export interface Payment {
  id: string;
  groupId: string;
  paidByUserId: string;
  paidToUserId: string;
  amount: number;
  date: string; // ISO string format
  method: 'cash' | 'upi' | 'bank_transfer' | 'paypal' | 'venmo' | 'other'; // Example methods
  notes?: string;
  createdAt: string;
}

export interface ActivityLog {
  id: string;
  groupId: string;
  userId: string; // User who performed the action
  actionType: 'expense_added' | 'expense_edited' | 'expense_deleted' | 'payment_recorded' | 'member_added' | 'member_removed' | 'group_created' | 'group_edited';
  timestamp: string; // ISO string format
  description: string; // e.g., "John Doe added an expense: Lunch"
  relatedExpenseId?: string;
  relatedPaymentId?: string;
  relatedUserId?: string; // e.g. for member_added action
}

export interface Balance {
  userId: string;
  owes: { [key: string]: number }; // Key: userId, Value: amount owed to them
  owedBy: { [key: string]: number }; // Key: userId, Value: amount they owe you
  netBalance: number; // Positive if owed to, negative if owes overall in group
}

export type Currency = 'USD' | 'INR';
