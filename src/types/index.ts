
export interface User {
  id: string; // Will store Firebase UID
  name: string | null; // Firebase displayName can be null
  email: string | null; // Firebase email can be null
  avatarUrl?: string | null; // Firebase photoURL can be null
}

export type GroupVisibility = 'public' | 'private';

export interface Group {
  id: string;
  name: string;
  description?: string;
  photoUrl?: string;
  dataAiHint?: string;
  members: User[]; // Array of User-like objects for display purposes
  memberIds: string[]; // Array of user IDs (Firebase UIDs) for querying
  ownerId: string; // Firebase UID of the owner
  createdAt: string; // ISO string or Firestore Timestamp
  visibility: GroupVisibility;
}

export interface ExpenseParticipant {
  userId: string;
  amountOwed: number;
}

export interface Expense {
  id:string;
  groupId: string;
  description: string;
  amount: number;
  paidByUserId: string;
  date: string; // ISO string format
  participants: ExpenseParticipant[];
  createdAt: string;
}

export interface Payment {
  id: string;
  groupId: string;
  paidByUserId: string;
  paidToUserId: string;
  amount: number;
  date: string; // ISO string format
  method: 'cash' | 'upi' | 'bank_transfer' | 'paypal' | 'venmo' | 'other';
  notes?: string;
  createdAt: string;
}

export interface ActivityLog {
  id: string;
  groupId: string;
  userId: string;
  actionType: 'expense_added' | 'expense_edited' | 'expense_deleted' | 'payment_recorded' | 'member_added' | 'member_removed' | 'group_created' | 'group_edited';
  timestamp: string; // ISO string format
  description: string;
  relatedExpenseId?: string;
  relatedPaymentId?: string;
  relatedUserId?: string;
}

export interface Balance {
  userId: string;
  owes: { [key: string]: number };
  owedBy: { [key: string]: number };
  netBalance: number;
}

export type Currency = 'USD' | 'INR';

// New type for App Member Contacts
export interface AppMemberContact {
  id: string;
  name: string;
  addedByUid: string; // Firebase UID of the user who added this contact
  createdAt: string; // ISO string representation of Firestore Timestamp
}
