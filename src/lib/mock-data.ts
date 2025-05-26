import type { User, Expense, Group, Debt } from '@/types';

export const mockUsers: User[] = [
  { id: 'user1', name: 'Alice', avatarUrl: 'https://placehold.co/40x40.png?text=A' },
  { id: 'user2', name: 'Bob', avatarUrl: 'https://placehold.co/40x40.png?text=B' },
  { id: 'user3', name: 'Charlie', avatarUrl: 'https://placehold.co/40x40.png?text=C' },
  { id: 'user4', name: 'Diana', avatarUrl: 'https://placehold.co/40x40.png?text=D' },
];

export const currentUser: User = mockUsers[0]; // Alice is the current user

export const mockGroups: Group[] = [
  { 
    id: 'group1', 
    name: 'Trip to Mountains', 
    members: [mockUsers[0], mockUsers[1], mockUsers[2]],
    avatarUrl: 'https://placehold.co/60x60.png?text=TM' 
  },
  { 
    id: 'group2', 
    name: 'Apartment Bills', 
    members: [mockUsers[0], mockUsers[3]],
    avatarUrl: 'https://placehold.co/60x60.png?text=AB'
  },
  {
    id: 'group3',
    name: 'Weekend Getaway',
    members: [mockUsers[0], mockUsers[1], mockUsers[3]],
    avatarUrl: 'https://placehold.co/60x60.png?text=WG'
  }
];

export const mockExpenses: Expense[] = [
  {
    id: 'expense1',
    title: 'Groceries',
    totalAmount: 60,
    paidByUserId: 'user1', // Alice
    participants: [
      { userId: 'user1', amountOwed: 20 },
      { userId: 'user2', amountOwed: 20 },
      { userId: 'user3', amountOwed: 20 },
    ],
    date: new Date('2024-07-15T10:00:00Z').toISOString(),
    groupId: 'group1',
    splitType: 'equal',
  },
  {
    id: 'expense2',
    title: 'Dinner',
    totalAmount: 100,
    paidByUserId: 'user2', // Bob
    participants: [
      { userId: 'user1', amountOwed: 25 },
      { userId: 'user2', amountOwed: 50 }, // Bob paid more for himself
      { userId: 'user3', amountOwed: 25 },
    ],
    date: new Date('2024-07-16T19:30:00Z').toISOString(),
    groupId: 'group1',
    splitType: 'unequal',
  },
  {
    id: 'expense3',
    title: 'Electricity Bill',
    totalAmount: 80,
    paidByUserId: 'user4', // Diana
    participants: [
      { userId: 'user1', amountOwed: 40 },
      { userId: 'user4', amountOwed: 40 },
    ],
    date: new Date('2024-07-20T12:00:00Z').toISOString(),
    groupId: 'group2',
    splitType: 'equal',
  },
  {
    id: 'expense4',
    title: 'Movie Tickets',
    totalAmount: 30,
    paidByUserId: 'user1', // Alice
    participants: [ // Only Alice and Bob
      { userId: 'user1', amountOwed: 15 },
      { userId: 'user2', amountOwed: 15 },
    ],
    date: new Date('2024-07-22T18:00:00Z').toISOString(),
    // No group, direct expense
    splitType: 'equal',
  }
];

// Simplified debt calculation logic for mock data
// This would typically be derived dynamically
export const mockDebts: Debt[] = [
  { 
    id: 'debt1',
    fromUser: mockUsers[1], // Bob
    toUser: mockUsers[0],   // Alice
    amount: 5, // From groceries (20) - dinner share (25) = -5 for Bob to Alice. Or from movie (15)
               // Let's re-evaluate:
               // Exp1: Alice paid 60. Bob owes 20 to Alice. Charlie owes 20 to Alice.
               // Exp2: Bob paid 100. Alice owes 25 to Bob. Charlie owes 25 to Bob.
               // Net for Alice-Bob: Alice owes Bob 5 (25-20).
               // Net for Alice-Charlie: Charlie owes Alice 20. Bob owes Charlie -25. (debt from Charlie to Bob 25)
               // Exp3: Diana paid 80. Alice owes Diana 40.
               // Exp4: Alice paid 30. Bob owes Alice 15.
               //
               // 최종정산:
               // Alice: owes Bob 5, is owed 20 by Charlie, owes Diana 40, is owed 15 by Bob
               // Alice total: Owed (20+15)=35. Owes (5+40)=45. Net: Alice owes 10.
               // Bob: owes Alice 15, is owed 5 by Alice, is owed 25 by Charlie
               // Bob total: Owed (5+25)=30. Owes 15. Net: Bob is owed 15.

    // Simplified debts:
    // Bob owes Alice 10 (net from various transactions)
    // Charlie owes Alice 20
    // Alice owes Diana 40
    groupName: 'Trip to Mountains & Direct'
  },
  // Derived from mockExpenses for simplicity:
  // Exp1: Alice paid 60. Bob owes 20 to Alice. Charlie owes 20 to Alice.
  { id: 'debt_b_to_a_exp1', fromUser: mockUsers[1], toUser: mockUsers[0], amount: 20, groupName: 'Trip to Mountains' },
  { id: 'debt_c_to_a_exp1', fromUser: mockUsers[2], toUser: mockUsers[0], amount: 20, groupName: 'Trip to Mountains' },

  // Exp2: Bob paid 100. Alice owes 25 to Bob. Charlie owes 25 to Bob.
  { id: 'debt_a_to_b_exp2', fromUser: mockUsers[0], toUser: mockUsers[1], amount: 25, groupName: 'Trip to Mountains' },
  { id: 'debt_c_to_b_exp2', fromUser: mockUsers[2], toUser: mockUsers[1], amount: 25, groupName: 'Trip to Mountains' },
  
  // Exp3: Diana paid 80. Alice owes 40 to Diana.
  { id: 'debt_a_to_d_exp3', fromUser: mockUsers[0], toUser: mockUsers[3], amount: 40, groupName: 'Apartment Bills' },

  // Exp4: Alice paid 30. Bob owes 15 to Alice.
  { id: 'debt_b_to_a_exp4', fromUser: mockUsers[1], toUser: mockUsers[0], amount: 15, groupName: 'Direct Expense' },
];

// Function to calculate current user's debts (simplified)
export const calculateCurrentUserDebts = (currentUserId: string): { owedToUser: Debt[], userOwes: Debt[] } => {
  const owedToUser: Debt[] = [];
  const userOwes: Debt[] = [];

  const simplifiedDebts: Map<string, { from: User, to: User, amount: number, groups: Set<string> }> = new Map();

  mockExpenses.forEach(expense => {
    const payer = mockUsers.find(u => u.id === expense.paidByUserId);
    if (!payer) return;

    expense.participants.forEach(participant => {
      if (participant.userId === expense.paidByUserId) return; // Payer doesn't owe themselves for their share

      const debtor = mockUsers.find(u => u.id === participant.userId);
      if (!debtor) return;
      
      // Debtor owes Payer
      const key = `${debtor.id}_owes_${payer.id}`;
      const reverseKey = `${payer.id}_owes_${debtor.id}`;

      if (simplifiedDebts.has(reverseKey)) {
        const existingDebt = simplifiedDebts.get(reverseKey)!;
        existingDebt.amount -= participant.amountOwed;
        if(expense.groupId) existingDebt.groups.add(mockGroups.find(g=>g.id === expense.groupId)?.name || 'Direct');

        if (existingDebt.amount < 0) { // Now payer owes debtor
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
        else groups.add('Direct Expense');

        simplifiedDebts.set(key, { from: debtor, to: payer, amount: currentAmount, groups });
      }
    });
  });
  
  let debtIdCounter = 0;
  simplifiedDebts.forEach((value, key) => {
    if (value.amount <=0) return; // skip zero or negative (which means reversed debt handled)
    
    const debt: Debt = {
      id: `s_debt_${debtIdCounter++}`,
      fromUser: value.from,
      toUser: value.to,
      amount: value.amount,
      groupName: Array.from(value.groups).join(', ')
    };

    if (debt.toUser.id === currentUserId) {
      owedToUser.push(debt);
    } else if (debt.fromUser.id === currentUserId) {
      userOwes.push(debt);
    }
  });
  
  return { owedToUser, userOwes };
};
