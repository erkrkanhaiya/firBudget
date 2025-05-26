import type { User, Expense, Group, Debt } from '@/types';

// Note: With Firebase auth, the concept of a single 'currentUser' from mock data is less relevant.
// The authenticated user will come from Firebase context.
// This mockUsers array can represent other users in the system for selection in forms, etc.

export const mockUsers: User[] = [
  { id: 'user1_mock_alice', name: 'Alice (Mock)', avatarUrl: 'https://placehold.co/40x40.png?text=A' },
  { id: 'user2_mock_bob', name: 'Bob (Mock)', avatarUrl: 'https://placehold.co/40x40.png?text=B' },
  { id: 'user3_mock_charlie', name: 'Charlie (Mock)', avatarUrl: 'https://placehold.co/40x40.png?text=C' },
  { id: 'user4_mock_diana', name: 'Diana (Mock)', avatarUrl: 'https://placehold.co/40x40.png?text=D' },
];

// `currentUser` is deprecated in favor of the authenticated user from useAuth()
// export const currentUser: User = mockUsers[0]; 

export const mockGroups: Group[] = [
  { 
    id: 'group1', 
    name: 'Trip to Mountains', 
    members: [mockUsers[0], mockUsers[1], mockUsers[2]], // Use IDs from updated mockUsers
    avatarUrl: 'https://placehold.co/60x60.png?text=TM' 
  },
  { 
    id: 'group2', 
    name: 'Apartment Bills', 
    members: [mockUsers[0], mockUsers[3]], // Use IDs from updated mockUsers
    avatarUrl: 'https://placehold.co/60x60.png?text=AB'
  },
  {
    id: 'group3',
    name: 'Weekend Getaway',
    members: [mockUsers[0], mockUsers[1], mockUsers[3]], // Use IDs from updated mockUsers
    avatarUrl: 'https://placehold.co/60x60.png?text=WG'
  }
];

export const mockExpenses: Expense[] = [
  {
    id: 'expense1',
    title: 'Groceries',
    totalAmount: 60,
    paidByUserId: 'user1_mock_alice', 
    participants: [
      { userId: 'user1_mock_alice', amountOwed: 20 },
      { userId: 'user2_mock_bob', amountOwed: 20 },
      { userId: 'user3_mock_charlie', amountOwed: 20 },
    ],
    date: new Date('2024-07-15T10:00:00Z').toISOString(),
    groupId: 'group1',
    splitType: 'equal',
  },
  {
    id: 'expense2',
    title: 'Dinner',
    totalAmount: 100,
    paidByUserId: 'user2_mock_bob', 
    participants: [
      { userId: 'user1_mock_alice', amountOwed: 25 },
      { userId: 'user2_mock_bob', amountOwed: 50 }, 
      { userId: 'user3_mock_charlie', amountOwed: 25 },
    ],
    date: new Date('2024-07-16T19:30:00Z').toISOString(),
    groupId: 'group1',
    splitType: 'unequal',
  },
  {
    id: 'expense3',
    title: 'Electricity Bill',
    totalAmount: 80,
    paidByUserId: 'user4_mock_diana', 
    participants: [
      { userId: 'user1_mock_alice', amountOwed: 40 },
      { userId: 'user4_mock_diana', amountOwed: 40 },
    ],
    date: new Date('2024-07-20T12:00:00Z').toISOString(),
    groupId: 'group2',
    splitType: 'equal',
  },
  {
    id: 'expense4',
    title: 'Movie Tickets',
    totalAmount: 30,
    paidByUserId: 'user1_mock_alice', 
    participants: [ 
      { userId: 'user1_mock_alice', amountOwed: 15 },
      { userId: 'user2_mock_bob', amountOwed: 15 },
    ],
    date: new Date('2024-07-22T18:00:00Z').toISOString(),
    splitType: 'equal',
  }
];


// Function to calculate a user's debts based on mock expenses.
// This will need to be adapted to use the authenticated user's actual ID (e.g., Firebase UID)
// and potentially fetch/calculate real data in a production app.
export const calculateCurrentUserDebts = (currentUserIdToFilterBy: string): { owedToUser: Debt[], userOwes: Debt[] } => {
  const owedToUser: Debt[] = [];
  const userOwes: Debt[] = [];

  const simplifiedDebts: Map<string, { from: User, to: User, amount: number, groups: Set<string> }> = new Map();

  mockExpenses.forEach(expense => {
    const payer = mockUsers.find(u => u.id === expense.paidByUserId);
    if (!payer) return;

    expense.participants.forEach(participant => {
      if (participant.userId === expense.paidByUserId) return; 

      const debtor = mockUsers.find(u => u.id === participant.userId);
      if (!debtor) return;
      
      const key = `${debtor.id}_owes_${payer.id}`;
      const reverseKey = `${payer.id}_owes_${debtor.id}`;

      if (simplifiedDebts.has(reverseKey)) {
        const existingDebt = simplifiedDebts.get(reverseKey)!;
        existingDebt.amount -= participant.amountOwed;
        if(expense.groupId) existingDebt.groups.add(mockGroups.find(g=>g.id === expense.groupId)?.name || 'Direct');
        else if (!expense.groupId) existingDebt.groups.add('Direct Expense');


        if (existingDebt.amount < 0) { 
          simplifiedDebts.delete(reverseKey);
          const newKey = `${payer.id}_owes_${debtor.id}`;
          simplifiedDebts.set(newKey, { from: payer, to: debtor, amount: -existingDebt.amount, groups: existingDebt.groups });
        } else if (existingDebt.amount === 0) {
          simplifiedDebts.delete(reverseKey);
        } else {
          simplifiedDebts.set(reverseKey, existingDebt);
        }
      } else {
        const existingDebt = simplifiedDebts.get(key);
        const currentAmount = (existingDebt?.amount || 0) + participant.amountOwed;
        const groups = existingDebt?.groups || new Set<string>();
        if(expense.groupId) groups.add(mockGroups.find(g=>g.id === expense.groupId)?.name || 'Direct');
        else if (!expense.groupId) groups.add('Direct Expense');


        simplifiedDebts.set(key, { from: debtor, to: payer, amount: currentAmount, groups });
      }
    });
  });
  
  let debtIdCounter = 0;
  simplifiedDebts.forEach((value) => { // Removed 'key' as it's not used
    if (value.amount <=0.009) return; // skip zero or negligible amounts
    
    const debt: Debt = {
      id: `s_debt_${debtIdCounter++}`,
      fromUser: value.from,
      toUser: value.to,
      amount: value.amount,
      groupName: Array.from(value.groups).filter(g => g).join(', ') || 'Direct Expense'
    };

    if (debt.toUser.id === currentUserIdToFilterBy) {
      owedToUser.push(debt);
    } else if (debt.fromUser.id === currentUserIdToFilterBy) {
      userOwes.push(debt);
    }
  });
  
  return { owedToUser, userOwes };
};
