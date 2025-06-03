
import { z } from 'zod';

export interface User {
  id: string; // Will store Firebase UID
  name: string | null; // Firebase displayName can be null
  email: string | null; // Firebase email can be null
  avatarUrl?: string | null; // Firebase photoURL can be null
}

export type GroupVisibility = 'public' | 'private';
export type GroupCategory = 'TRIP' | 'HOME' | 'COUPLE' | 'PARTY' | 'OTHER';

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
  category?: GroupCategory;
}

export interface ExpenseParticipant {
  userId: string;
  amountOwed: number;
}

export type ExpenseCategory = "Food" | "Travel" | "Utilities" | "Entertainment" | "Shopping" | "Other";

export interface Expense {
  id:string;
  groupId: string;
  description: string;
  amount: number;
  paidByUserId: string;
  date: string; // ISO string format
  participants: ExpenseParticipant[];
  createdAt: string;
  receiptUrl?: string; // URL of the uploaded receipt in Firebase Storage
  receiptFileName?: string; // Original name of the uploaded receipt file
  category?: ExpenseCategory | string; // Allow predefined or custom string
}

export interface Payment {
  id: string;
  groupId: string;
  paidByUserId: string;
  paidToUserId: string;
  amount: number;
  date: string; // ISO string format
  method: 'cash' | 'upi' | 'bank_transfer' | 'other'; // Simplified methods
  notes?: string;
  createdAt: string; // ISO string format for Firestore serverTimestamp
}

export interface ActivityLog {
  id: string;
  groupId: string;
  userId: string; // User who performed the action OR the user central to the action (e.g. paidByUserId for payment)
  actionType: 'expense_added' | 'expense_edited' | 'expense_deleted' | 'payment_recorded' | 'member_added' | 'member_removed' | 'group_created' | 'group_edited';
  timestamp: string; // ISO string format
  description: string;
  relatedExpenseId?: string;
  relatedPaymentId?: string;
  relatedUserId?: string; // e.g., for member_added/removed, the ID of the member affected
  actorName?: string | null; // Name of the user who performed the action
  actorAvatarUrl?: string | null;
  groupName?: string;
  groupId?: string; // Added groupId to EnrichedActivityLog
}

export interface Balance {
  userId: string;
  owes: { [key: string]: number }; // Key is userId of who they owe, value is amount
  owedBy: { [key: string]: number }; // Key is userId of who owes them, value is amount
  netBalance: number; // Positive if owed by others, negative if owes others
}

export type Currency = 'USD' | 'INR';

// New type for App Member Contacts
export interface AppMemberContact {
  id: string;
  name: string;
  addedByUid: string; // Firebase UID of the user who added this contact
  createdAt: string; // ISO string representation of Firestore Timestamp
}

// Notification Item Type
export type NotificationType = 'info' | 'success' | 'alert' | 'destructive';

export interface NotificationItem {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  time: string; // ISO string or formatted time string
  read: boolean;
  href?: string;
}

// For AI Expense Detail Extraction
export const PREDEFINED_EXPENSE_CATEGORIES: ExpenseCategory[] = ["Food", "Travel", "Utilities", "Entertainment", "Shopping", "Other"];

// Zod schemas for AI Expense Detail Extraction Flow
export const ExtractExpenseDetailsInputSchema = z.object({
  receiptDataUri: z
    .string()
    .optional()
    .describe(
      "A photo of a receipt, as a data URI that must include a MIME type and use Base64 encoding. Expected format: 'data:<mimetype>;base64,<encoded_data>'."
    ),
  userDescription: z.string().optional().describe('Optional user-provided description for the expense, used as a hint or for categorization if no image is provided.'),
});
export type ExtractExpenseDetailsInput = z.infer<typeof ExtractExpenseDetailsInputSchema>;

export const ExtractExpenseDetailsOutputSchema = z.object({
  extractedDescription: z.string().optional().describe('The vendor name or main item from the receipt (e.g., "Starbucks", "Train Ticket").'),
  extractedAmount: z.number().optional().describe('The total amount from the receipt. Should be a positive number.'),
  extractedDate: z.string().optional().describe('The date of the transaction from the receipt, ideally in YYYY-MM-DD format.'),
  suggestedCategory: z.string().optional().describe(`Suggested category for the expense. Should be one of: ${PREDEFINED_EXPENSE_CATEGORIES.join(", ")}. If none match well, suggest "Other".`),
});
export type ExtractExpenseDetailsOutput = z.infer<typeof ExtractExpenseDetailsOutputSchema>;
