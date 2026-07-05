import type { Balance, Contribution, Expense, Payment, User } from "@/types";

const MONEY_EPSILON = 0.005;

export function roundMoney(amount: number): number {
  return parseFloat(amount.toFixed(2));
}

export interface NettedSettlement {
  fromUserId: string;
  toUserId: string;
  netAmount: number;
  /** Gross amount `from` owed `to` before netting (expenses − payments). */
  grossFromTo?: number;
  /** Gross amount `to` owed `from` before netting. */
  grossToFrom?: number;
}

export interface GroupBalanceResult {
  balances: Balance[];
  settlements: NettedSettlement[];
}

function buildGrossPairwiseDebts(
  members: User[],
  expenses: Expense[],
  payments: Payment[]
): Record<string, Record<string, number>> {
  const debts: Record<string, Record<string, number>> = {};

  const ensureUser = (userId: string) => {
    if (!debts[userId]) debts[userId] = {};
  };

  members.forEach((member) => ensureUser(member.id));

  expenses.forEach((expense) => {
    (expense.participants ?? []).forEach((participant) => {
      if (participant.userId === expense.paidByUserId || participant.amountOwed <= MONEY_EPSILON) {
        return;
      }
      ensureUser(participant.userId);
      ensureUser(expense.paidByUserId);
      debts[participant.userId][expense.paidByUserId] =
        (debts[participant.userId][expense.paidByUserId] || 0) + participant.amountOwed;
    });
  });

  payments.forEach((payment) => {
    if (payment.paidByUserId === payment.paidToUserId) return;
    ensureUser(payment.paidByUserId);
    ensureUser(payment.paidToUserId);
    debts[payment.paidByUserId][payment.paidToUserId] =
      (debts[payment.paidByUserId][payment.paidToUserId] || 0) - payment.amount;
  });

  return debts;
}

export function calculateNettedSettlements(
  members: User[],
  expenses: Expense[],
  payments: Payment[]
): NettedSettlement[] {
  const grossDebts = buildGrossPairwiseDebts(members, expenses, payments);
  const memberIds = members.map((member) => member.id);
  const settlements: NettedSettlement[] = [];

  for (let i = 0; i < memberIds.length; i++) {
    for (let j = i + 1; j < memberIds.length; j++) {
      const userA = memberIds[i];
      const userB = memberIds[j];
      const aOwesB = roundMoney(grossDebts[userA]?.[userB] || 0);
      const bOwesA = roundMoney(grossDebts[userB]?.[userA] || 0);
      const net = roundMoney(aOwesB - bOwesA);

      if (Math.abs(net) <= MONEY_EPSILON) continue;

      if (net > 0) {
        settlements.push({
          fromUserId: userA,
          toUserId: userB,
          netAmount: net,
          grossFromTo: aOwesB > MONEY_EPSILON ? aOwesB : undefined,
          grossToFrom: bOwesA > MONEY_EPSILON ? bOwesA : undefined,
        });
      } else {
        settlements.push({
          fromUserId: userB,
          toUserId: userA,
          netAmount: Math.abs(net),
          grossFromTo: bOwesA > MONEY_EPSILON ? bOwesA : undefined,
          grossToFrom: aOwesB > MONEY_EPSILON ? aOwesB : undefined,
        });
      }
    }
  }

  return settlements.sort((a, b) => b.netAmount - a.netAmount);
}

export function calculateMemberNetBalances(
  members: User[],
  expenses: Expense[],
  payments: Payment[],
  contributions: Contribution[]
): Record<string, number> {
  const memberNetBalances: Record<string, number> = {};
  members.forEach((member) => {
    memberNetBalances[member.id] = 0;
  });

  contributions.forEach((contrib) => {
    if (memberNetBalances[contrib.contributorId] !== undefined) {
      memberNetBalances[contrib.contributorId] += contrib.amount;
    }
  });

  expenses.forEach((expense) => {
    if (memberNetBalances[expense.paidByUserId] !== undefined) {
      memberNetBalances[expense.paidByUserId] += expense.amount;
    }
    (expense.participants ?? []).forEach((participant) => {
      if (memberNetBalances[participant.userId] !== undefined) {
        memberNetBalances[participant.userId] -= participant.amountOwed;
      }
    });
  });

  payments.forEach((payment) => {
    if (memberNetBalances[payment.paidByUserId] !== undefined) {
      memberNetBalances[payment.paidByUserId] -= payment.amount;
    }
    if (memberNetBalances[payment.paidToUserId] !== undefined) {
      memberNetBalances[payment.paidToUserId] += payment.amount;
    }
  });

  Object.keys(memberNetBalances).forEach((userId) => {
    memberNetBalances[userId] = roundMoney(memberNetBalances[userId]);
  });

  return memberNetBalances;
}

export function calculateGroupBalances(
  members: User[],
  expenses: Expense[],
  payments: Payment[],
  contributions: Contribution[]
): GroupBalanceResult {
  if (members.length === 0) {
    return { balances: [], settlements: [] };
  }

  const memberNetBalances = calculateMemberNetBalances(members, expenses, payments, contributions);
  const settlements = calculateNettedSettlements(members, expenses, payments);

  const balances: Balance[] = members.map((member) => ({
    userId: member.id,
    owes: {},
    owedBy: {},
    netBalance: memberNetBalances[member.id] || 0,
  }));

  settlements.forEach((settlement) => {
    const debtor = balances.find((balance) => balance.userId === settlement.fromUserId);
    const creditor = balances.find((balance) => balance.userId === settlement.toUserId);
    if (!debtor || !creditor) return;

    debtor.owes[settlement.toUserId] = settlement.netAmount;
    creditor.owedBy[settlement.fromUserId] = settlement.netAmount;
  });

  return { balances, settlements };
}

export function getSettlementBetween(
  settlements: NettedSettlement[],
  fromUserId: string,
  toUserId: string
): NettedSettlement | undefined {
  return settlements.find(
    (settlement) =>
      settlement.fromUserId === fromUserId && settlement.toUserId === toUserId
  );
}
