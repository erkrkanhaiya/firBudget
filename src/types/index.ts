export interface User {
  id: string;
  name: string;
  avatarUrl?: string;
}

export interface ExpenseParticipant {
  userId: string;
  amountOwed: number; 
  isSettled?: boolean;
}

export interface Expense {
  id: string;
  title: string;
  totalAmount: number;
  paidByUserId: string;
  participants: ExpenseParticipant[];
  date: string; // ISO string
  groupId?: string;
  splitType: 'equal' | 'unequal';
}

export interface Group {
  id: string;
  name: string;
  members: User[];
  avatarUrl?: string;
}

export interface Debt {
  id: string;
  fromUser: User;
  toUser: User;
  amount: number;
  groupId?: string;
  groupName?: string;
}

export type NavItem = {
  title: string;
  href: string;
  icon: React.ElementType;
  active?: boolean;
};
