
import type { User, Group, Expense, Payment, ActivityLog, Balance } from '@/types';

export const mockUser: User = {
  id: 'user1',
  name: 'Alex Johnson',
  email: 'alex.johnson@example.com',
  avatarUrl: 'https://placehold.co/100x100.png',
};

export const mockUsers: User[] = [
  mockUser,
  { id: 'user2', name: 'Maria Garcia', email: 'maria.garcia@example.com', avatarUrl: 'https://placehold.co/100x100.png' },
  { id: 'user3', name: 'Ken Adams', email: 'ken.adams@example.com', avatarUrl: 'https://placehold.co/100x100.png' },
  { id: 'user4', name: 'Sarah Miller', email: 'sarah.miller@example.com' },
];

export const mockGroups: Group[] = [
  {
    id: 'group1',
    name: 'Europe Trip Summer 2024',
    description: 'Planning and expenses for our awesome trip across Europe!',
    photoUrl: 'https://placehold.co/600x400.png',
    dataAiHint: 'europe travel',
    ownerId: 'user1',
    members: [mockUsers[0], mockUsers[1], mockUsers[2]],
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 7).toISOString(), // 7 days ago
    visibility: 'public',
  },
  {
    id: 'group2',
    name: 'Roommates - Apt 4B',
    description: 'Shared expenses for the apartment.',
    photoUrl: 'https://placehold.co/600x400.png',
    dataAiHint: 'apartment living',
    ownerId: 'user2',
    members: [mockUsers[0], mockUsers[1], mockUsers[3]],
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 30).toISOString(), // 30 days ago
    visibility: 'private',
  },
  {
    id: 'group3',
    name: 'Weekend Getaway',
    description: 'Quick trip to the mountains.',
    ownerId: 'user1',
    members: [mockUsers[0], mockUsers[3]],
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 2).toISOString(), // 2 days ago
    visibility: 'private',
  },
];

export const mockExpenses: Expense[] = [
  {
    id: 'expense1',
    groupId: 'group1',
    description: 'Train tickets Berlin to Prague',
    amount: 120,
    paidByUserId: 'user1',
    date: new Date(Date.now() - 1000 * 60 * 60 * 24 * 5).toISOString(),
    participants: [
      { userId: 'user1', amountOwed: 40 },
      { userId: 'user2', amountOwed: 40 },
      { userId: 'user3', amountOwed: 40 },
    ],
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 5).toISOString(),
  },
  {
    id: 'expense2',
    groupId: 'group1',
    description: 'Dinner in Prague',
    amount: 75,
    paidByUserId: 'user2',
    date: new Date(Date.now() - 1000 * 60 * 60 * 24 * 4).toISOString(),
    participants: [
      { userId: 'user1', amountOwed: 25 },
      { userId: 'user2', amountOwed: 25 },
      { userId: 'user3', amountOwed: 25 },
    ],
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 4).toISOString(),
  },
  {
    id: 'expense3',
    groupId: 'group2',
    description: 'Monthly Rent',
    amount: 1500,
    paidByUserId: 'user2',
    date: new Date(Date.now() - 1000 * 60 * 60 * 24 * 1).toISOString(),
    participants: [
      { userId: 'user1', amountOwed: 500 },
      { userId: 'user2', amountOwed: 500 },
      { userId: 'user4', amountOwed: 500 },
    ],
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 1).toISOString(),
  },
  {
    id: 'expense4',
    groupId: 'group2',
    description: 'Groceries',
    amount: 90,
    paidByUserId: 'user1',
    date: new Date(Date.now() - 1000 * 60 * 60 * 20).toISOString(), // 20 hours ago
    participants: [
      { userId: 'user1', amountOwed: 30 },
      { userId: 'user2', amountOwed: 30 },
      { userId: 'user4', amountOwed: 30 },
    ],
     createdAt: new Date(Date.now() - 1000 * 60 * 60 * 20).toISOString(),
  },
];

export const mockPayments: Payment[] = [
  {
    id: 'payment1',
    groupId: 'group1',
    paidByUserId: 'user3',
    paidToUserId: 'user1',
    amount: 40,
    date: new Date(Date.now() - 1000 * 60 * 60 * 24 * 3).toISOString(),
    method: 'cash',
    notes: 'Settled for train tickets share',
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 3).toISOString(),
  },
];

export const mockActivityLog: ActivityLog[] = [
  {
    id: 'activity1',
    groupId: 'group1',
    userId: 'user1',
    actionType: 'expense_added',
    timestamp: mockExpenses[0].date,
    description: `${mockUsers[0].name} added expense: ${mockExpenses[0].description}`,
    relatedExpenseId: 'expense1',
  },
  {
    id: 'activity2',
    groupId: 'group1',
    userId: 'user2',
    actionType: 'expense_added',
    timestamp: mockExpenses[1].date,
    description: `${mockUsers[1].name} added expense: ${mockExpenses[1].description}`,
    relatedExpenseId: 'expense2',
  },
  {
    id: 'activity3',
    groupId: 'group1',
    userId: 'user3',
    actionType: 'payment_recorded',
    timestamp: mockPayments[0].date,
    description: `${mockUsers[2].name} recorded a payment of $${mockPayments[0].amount} to ${mockUsers[0].name}`,
    relatedPaymentId: 'payment1',
  },
   {
    id: 'activity4',
    groupId: 'group2',
    userId: 'user2',
    actionType: 'group_created',
    timestamp: mockGroups[1].createdAt,
    description: `${mockUsers[1].name} created group: ${mockGroups[1].name}`,
  },
  {
    id: 'activity5',
    groupId: 'group2',
    userId: 'user2',
    actionType: 'expense_added',
    timestamp: mockExpenses[2].date,
    description: `${mockUsers[1].name} added expense: ${mockExpenses[2].description}`,
    relatedExpenseId: 'expense3',
  },
];

// Simplified balance calculation for mock purposes
export const mockBalancesGroup1: Balance[] = [
  { // Alex (user1)
    userId: 'user1',
    owes: {}, // Owes Maria $25 for dinner
    owedBy: {'user2': 25, 'user3': 15}, // Maria owes $25 (net after dinner), Ken owes $15 (net after payment)
    netBalance: 40,
  },
  { // Maria (user2)
    userId: 'user2',
    owes: {'user1': 25}, // Owes Alex $25 from her dinner payment for Alex
    owedBy: {},
    netBalance: -25,
  },
  { // Ken (user3)
    userId: 'user3',
    owes: {'user1': 15, 'user2': 25}, // Owes Alex $15 (train - payment), Owes Maria $25 (dinner)
    owedBy: {},
    netBalance: -40,
  }
];
