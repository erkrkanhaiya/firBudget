import type { ExpenseParticipant } from '@/types';

/** Distribute total equally, assigning any remainder cents across participants. */
export function distributeEqualShares(
  total: number,
  participantIds: string[]
): ExpenseParticipant[] {
  if (participantIds.length === 0) return [];

  const totalCents = Math.round(total * 100);
  const baseCents = Math.floor(totalCents / participantIds.length);
  let remainderCents = totalCents - baseCents * participantIds.length;

  return participantIds.map((userId) => {
    const extraCent = remainderCents > 0 ? 1 : 0;
    if (extraCent) remainderCents -= 1;
    return {
      userId,
      amountOwed: (baseCents + extraCent) / 100,
    };
  });
}

export function isEqualSplit(participants: ExpenseParticipant[]): boolean {
  if (participants.length <= 1) return true;
  const first = participants[0].amountOwed;
  return participants.every((p) => Math.abs(p.amountOwed - first) < 0.006);
}

export function buildExpenseParticipants(
  numericAmount: number,
  selectedParticipantIds: string[],
  splitEqually: boolean,
  customSplitAmounts: Record<string, string>,
  memberNameLookup: (userId: string) => string | undefined
): { participants: ExpenseParticipant[] } | { error: string } {
  if (selectedParticipantIds.length === 0) {
    return { error: 'At least one participant is required.' };
  }

  if (splitEqually) {
    return { participants: distributeEqualShares(numericAmount, selectedParticipantIds) };
  }

  let currentTotalCustomSplit = 0;
  const expenseParticipants: ExpenseParticipant[] = [];

  for (const userId of selectedParticipantIds) {
    const customAmountStr = customSplitAmounts[userId];
    if (customAmountStr === undefined || customAmountStr.trim() === '') {
      return {
        error: `Please enter an amount for ${memberNameLookup(userId) ?? 'a participant'}.`,
      };
    }
    const customAmount = parseFloat(customAmountStr);
    if (isNaN(customAmount) || customAmount < 0) {
      return {
        error: `Please enter a valid, non-negative amount for ${memberNameLookup(userId) ?? 'a participant'}.`,
      };
    }
    expenseParticipants.push({
      userId,
      amountOwed: parseFloat(customAmount.toFixed(2)),
    });
    currentTotalCustomSplit += customAmount;
  }

  currentTotalCustomSplit = parseFloat(currentTotalCustomSplit.toFixed(2));
  const totalExpenseAmount = parseFloat(numericAmount.toFixed(2));

  if (Math.abs(currentTotalCustomSplit - totalExpenseAmount) > 0.005) {
    return {
      error: `Custom shares (${currentTotalCustomSplit.toFixed(2)}) must equal the total (${totalExpenseAmount.toFixed(2)}). Remaining: ${(totalExpenseAmount - currentTotalCustomSplit).toFixed(2)}`,
    };
  }

  return { participants: expenseParticipants };
}

export function summarizeExpenseChanges(
  before: {
    description: string;
    amount: number;
    paidByUserId: string;
    date: string;
    participantIds: string[];
  },
  after: {
    description: string;
    amount: number;
    paidByUserId: string;
    date: string;
    participantIds: string[];
  },
  memberNameLookup: (userId: string) => string | undefined
): string {
  const changes: string[] = [];

  if (before.description !== after.description) {
    changes.push(`description "${before.description}" → "${after.description}"`);
  }
  if (Math.abs(before.amount - after.amount) > 0.005) {
    changes.push(`amount ${before.amount.toFixed(2)} → ${after.amount.toFixed(2)}`);
  }
  if (before.paidByUserId !== after.paidByUserId) {
    changes.push(
      `payer ${memberNameLookup(before.paidByUserId) ?? 'Unknown'} → ${memberNameLookup(after.paidByUserId) ?? 'Unknown'}`
    );
  }
  if (before.date.slice(0, 10) !== after.date.slice(0, 10)) {
    changes.push(`date updated`);
  }

  const beforeParticipants = [...before.participantIds].sort().join(',');
  const afterParticipants = [...after.participantIds].sort().join(',');
  if (beforeParticipants !== afterParticipants) {
    changes.push('participants updated');
  }

  return changes.length > 0 ? changes.join('; ') : 'details updated';
}
