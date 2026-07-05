import { parseISO } from 'date-fns';
import { db } from '@/lib/firebase';
import type { ActivityLog, Expense, ExpenseParticipant } from '@/types';
import {
  collection,
  doc,
  serverTimestamp,
  writeBatch,
  type DocumentData,
} from 'firebase/firestore';

export interface PendingExpense {
  groupId: string;
  description: string;
  amount: number;
  paidByUserId: string;
  date: string;
  participants: ExpenseParticipant[];
  tempId: string;
  actorNameForLog: string | null;
  receiptUrl?: string;
  receiptFileName?: string;
  savedAt?: string;
}

export type DisplayExpense = Expense & { isPending?: boolean };

const STORAGE_KEY = 'pendingExpenses';

function safeDateToTime(value: string | undefined | null, fallback = 0): number {
  if (!value || typeof value !== 'string') return fallback;
  const parsed = parseISO(value);
  const time = parsed.getTime();
  return Number.isNaN(time) ? fallback : time;
}

function normalizePendingExpense(expense: PendingExpense): PendingExpense {
  return {
    ...expense,
    participants: Array.isArray(expense.participants) ? expense.participants : [],
    savedAt: expense.savedAt || expense.date || new Date().toISOString(),
  };
}

export function getPendingExpenses(): PendingExpense[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as PendingExpense[];
    return parsed.map(normalizePendingExpense);
  } catch {
    return [];
  }
}

export function getPendingExpensesForGroup(groupId: string): PendingExpense[] {
  return getPendingExpenses().filter((exp) => exp.groupId === groupId);
}

export function savePendingExpense(expense: PendingExpense): void {
  const pending = getPendingExpenses();
  pending.push(expense);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(pending));
}

export function removePendingExpensesForGroup(groupId: string): void {
  const remaining = getPendingExpenses().filter((exp) => exp.groupId !== groupId);
  if (remaining.length > 0) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(remaining));
  } else {
    localStorage.removeItem(STORAGE_KEY);
  }
}

export function removePendingExpenseById(tempId: string): void {
  const remaining = getPendingExpenses().filter((exp) => exp.tempId !== tempId);
  if (remaining.length > 0) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(remaining));
  } else {
    localStorage.removeItem(STORAGE_KEY);
  }
}

export function pendingExpenseToDisplayExpense(pending: PendingExpense): DisplayExpense {
  const normalized = normalizePendingExpense(pending);
  return {
    id: normalized.tempId,
    groupId: normalized.groupId,
    description: normalized.description,
    amount: normalized.amount,
    paidByUserId: normalized.paidByUserId,
    date: normalized.date,
    participants: normalized.participants,
    createdAt: normalized.savedAt!,
    receiptUrl: normalized.receiptUrl,
    receiptFileName: normalized.receiptFileName,
    isPending: true,
  };
}

export function mergeExpensesForDisplay(
  firestoreExpenses: Expense[],
  pendingExpenses: PendingExpense[]
): DisplayExpense[] {
  const pendingIds = new Set(pendingExpenses.map((p) => p.tempId));
  const synced = firestoreExpenses.filter((exp) => !pendingIds.has(exp.id));
  const pending = pendingExpenses.map(pendingExpenseToDisplayExpense);
  return [...pending, ...synced].sort(
    (a, b) => safeDateToTime(b.createdAt, safeDateToTime(b.date)) - safeDateToTime(a.createdAt, safeDateToTime(a.date))
  );
}

export async function syncPendingExpensesForGroup(
  groupId: string,
  actorNameForLog?: string
): Promise<number> {
  const pendingForGroup = getPendingExpensesForGroup(groupId);
  if (pendingForGroup.length === 0) return 0;

  const batch = writeBatch(db);
  for (const storedExp of pendingForGroup) {
    const expenseColRef = collection(db, 'groups', storedExp.groupId, 'expenses');
    const newExpenseDocRef = doc(expenseColRef);

    const expenseDataForFirestore: DocumentData = {
      groupId: storedExp.groupId,
      description: storedExp.description,
      amount: storedExp.amount,
      paidByUserId: storedExp.paidByUserId,
      date: storedExp.date,
      participants: storedExp.participants,
      createdAt: serverTimestamp(),
    };

    if (storedExp.receiptFileName) {
      expenseDataForFirestore.receiptFileName = storedExp.receiptFileName;
    }
    if (storedExp.receiptUrl) {
      expenseDataForFirestore.receiptUrl = storedExp.receiptUrl;
    }

    batch.set(newExpenseDocRef, expenseDataForFirestore);

    const activityLogColRef = collection(db, 'groups', storedExp.groupId, 'activityLog');
    const activityLogForFirestore: Omit<ActivityLog, 'id' | 'timestamp'> = {
      groupId: storedExp.groupId,
      userId: storedExp.paidByUserId,
      actionType: 'expense_added',
      description: `${storedExp.actorNameForLog || actorNameForLog || 'User'} added expense: ${storedExp.description} (synced from offline)`,
      relatedExpenseId: newExpenseDocRef.id,
    };
    batch.set(doc(activityLogColRef), { ...activityLogForFirestore, timestamp: serverTimestamp() });
  }

  await batch.commit();
  removePendingExpensesForGroup(groupId);
  return pendingForGroup.length;
}
