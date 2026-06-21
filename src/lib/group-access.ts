import { db } from "@/lib/firebase";
import type { Contribution, Expense, Group, Payment, User } from "@/types";
import {
  Timestamp,
  addDoc,
  arrayRemove,
  arrayUnion,
  collection,
  doc,
  getDoc,
  getDocs,
  or,
  query,
  serverTimestamp,
  updateDoc,
  where,
  writeBatch,
} from "firebase/firestore";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function isValidEmail(email: string): boolean {
  return EMAIL_REGEX.test(email);
}

export function mapFirestoreGroup(
  id: string,
  data: Record<string, unknown>
): Group {
  const createdAt = data.createdAt;
  let createdAtIso: string;

  if (createdAt instanceof Timestamp) {
    createdAtIso = createdAt.toDate().toISOString();
  } else if (
    typeof createdAt === "object" &&
    createdAt !== null &&
    "seconds" in createdAt &&
    typeof (createdAt as { seconds: number }).seconds === "number"
  ) {
    createdAtIso = new Date(
      (createdAt as { seconds: number }).seconds * 1000
    ).toISOString();
  } else {
    createdAtIso = new Date().toISOString();
  }

  return {
    id,
    name: (data.name as string) || "",
    description: data.description as string | undefined,
    photoUrl: data.photoUrl as string | undefined,
    dataAiHint: data.dataAiHint as string | undefined,
    members: (data.members as Group["members"]) || [],
    memberIds: (data.memberIds as string[]) || [],
    ownerId: (data.ownerId as string) || "",
    createdAt: createdAtIso,
    visibility: (data.visibility as Group["visibility"]) || "private",
    category: data.category as Group["category"],
    budgetAmount: data.budgetAmount as number | undefined,
    invitedEmails: (data.invitedEmails as string[]) || [],
  };
}

export function isGroupMember(group: Group, userId: string): boolean {
  return group.memberIds.includes(userId);
}

export function isInvitedToGroup(
  group: Group,
  email: string | null | undefined
): boolean {
  if (!email) return false;
  return (group.invitedEmails || []).includes(normalizeEmail(email));
}

function getOwnerEmail(group: Pick<Group, "ownerId" | "members">): string | null {
  const owner = group.members.find((member) => member.id === group.ownerId);
  return owner?.email ? normalizeEmail(owner.email) : null;
}

function isLikelyFirebaseAuthUid(id: string): boolean {
  return id.length >= 28 && /^[a-zA-Z0-9]+$/.test(id);
}

/** True when a member should be tracked in invitedEmails (never the group owner/admin). */
export function memberNeedsAppInvite(
  group: Pick<Group, "ownerId">,
  member: { id: string; email?: string | null }
): boolean {
  if (member.id === group.ownerId) return false;
  const email = member.email?.trim();
  if (!email || !isValidEmail(normalizeEmail(email))) return false;
  return true;
}

function hasJoinedWithAppAccount(group: Group, member: User): boolean {
  if (member.id === group.ownerId) return true;
  if (!member.email) return false;
  if (isInvitedToGroup(group, member.email)) return false;
  return isLikelyFirebaseAuthUid(member.id);
}

/** Normalizes invitedEmails: removes the group owner/admin email only (does not re-add revoked invites). */
export function computeInvitedEmails(group: Group): string[] {
  const ownerEmail = getOwnerEmail(group);
  const emails = new Set<string>();

  for (const email of group.invitedEmails || []) {
    const normalized = normalizeEmail(email);
    if (ownerEmail && normalized === ownerEmail) continue;
    emails.add(normalized);
  }

  return Array.from(emails);
}

export function isMemberInvitePending(group: Group, member: User): boolean {
  if (!memberNeedsAppInvite(group, member)) return false;
  return isInvitedToGroup(group, member.email);
}

/** Member is in the group for expense splits but does not have active app access. */
export function isMemberSplitsOnly(group: Group, member: User): boolean {
  if (member.id === group.ownerId) return false;
  if (isMemberInvitePending(group, member)) return false;
  if (hasJoinedWithAppAccount(group, member)) return false;
  return true;
}

/** Member has email on file but invite was revoked or never sent — admin can invite again. */
export function canReinviteMemberToApp(group: Group, member: User): boolean {
  if (!memberNeedsAppInvite(group, member)) return false;
  if (isMemberInvitePending(group, member)) return false;
  return !hasJoinedWithAppAccount(group, member);
}

export async function repairGroupInvitedEmailsIfNeeded(
  group: Group
): Promise<Group> {
  const fixed = computeInvitedEmails(group);
  const current = (group.invitedEmails || []).map(normalizeEmail).sort();
  const next = [...fixed].sort();

  if (
    current.length === next.length &&
    current.every((email, index) => email === next[index])
  ) {
    return group;
  }

  await updateDoc(doc(db, "groups", group.id), { invitedEmails: fixed });
  return { ...group, invitedEmails: fixed };
}

export function canViewGroup(group: Group, user: User): boolean {
  if (isGroupMember(group, user.id)) return true;
  if (group.visibility === "public") return true;
  return isInvitedToGroup(group, user.email);
}

export function getMemberEmails(group: Group): Set<string> {
  const emails = new Set<string>();
  for (const member of group.members) {
    if (member.email) {
      emails.add(normalizeEmail(member.email));
    }
  }
  return emails;
}

async function migrateMemberIdInGroup(
  groupId: string,
  oldId: string,
  newId: string
): Promise<void> {
  const expensesSnap = await getDocs(
    collection(db, "groups", groupId, "expenses")
  );
  for (const expDoc of expensesSnap.docs) {
    const data = expDoc.data();
    let changed = false;
    let paidByUserId = data.paidByUserId as string;
    if (paidByUserId === oldId) {
      paidByUserId = newId;
      changed = true;
    }
    const participants = (
      (data.participants as { userId: string; amountOwed: number }[]) || []
    ).map((p) => {
      if (p.userId === oldId) {
        changed = true;
        return { ...p, userId: newId };
      }
      return p;
    });
    if (changed) {
      await updateDoc(expDoc.ref, { paidByUserId, participants });
    }
  }

  const paymentsSnap = await getDocs(
    collection(db, "groups", groupId, "payments")
  );
  for (const payDoc of paymentsSnap.docs) {
    const data = payDoc.data();
    const updates: Record<string, string> = {};
    if (data.paidByUserId === oldId) updates.paidByUserId = newId;
    if (data.paidToUserId === oldId) updates.paidToUserId = newId;
    if (Object.keys(updates).length > 0) {
      await updateDoc(payDoc.ref, updates);
    }
  }

  const contributionsSnap = await getDocs(
    collection(db, "groups", groupId, "contributions")
  );
  for (const contribDoc of contributionsSnap.docs) {
    const data = contribDoc.data();
    if (data.contributorId === oldId) {
      await updateDoc(contribDoc.ref, { contributorId: newId });
    }
  }
}

export async function acceptGroupInviteIfNeeded(
  groupId: string,
  user: User
): Promise<{ accepted: boolean; group: Group | null }> {
  if (!user.email) {
    return { accepted: false, group: null };
  }

  const groupDocRef = doc(db, "groups", groupId);
  const groupDocSnap = await getDoc(groupDocRef);

  if (!groupDocSnap.exists()) {
    return { accepted: false, group: null };
  }

  const group = mapFirestoreGroup(groupDocSnap.id, groupDocSnap.data());

  if (isGroupMember(group, user.id)) {
    return { accepted: false, group };
  }

  const normalizedEmail = normalizeEmail(user.email);
  const invitedEmails = group.invitedEmails || [];

  if (!invitedEmails.includes(normalizedEmail)) {
    return { accepted: false, group };
  }

  const placeholder = group.members.find(
    (member) =>
      member.email &&
      normalizeEmail(member.email) === normalizedEmail &&
      member.id !== user.id
  );

  if (placeholder) {
    const oldId = placeholder.id;
    const updatedMembers = group.members.map((member) =>
      member.id === oldId
        ? {
            id: user.id,
            name: user.name ?? member.name,
            email: user.email,
            avatarUrl: user.avatarUrl || "",
          }
        : member
    );
    const updatedMemberIds = [
      ...group.memberIds.filter((id) => id !== oldId),
      user.id,
    ];

    await updateDoc(groupDocRef, {
      members: updatedMembers,
      memberIds: updatedMemberIds,
      invitedEmails: invitedEmails.filter((email) => email !== normalizedEmail),
    });

    await migrateMemberIdInGroup(groupId, oldId, user.id);
  } else {
    const newMember: User = {
      id: user.id,
      name: user.name,
      email: user.email,
      avatarUrl: user.avatarUrl || "",
    };

    await updateDoc(groupDocRef, {
      memberIds: arrayUnion(user.id),
      members: arrayUnion(newMember),
      invitedEmails: invitedEmails.filter((email) => email !== normalizedEmail),
    });
  }

  await addDoc(collection(db, "groups", groupId, "activityLog"), {
    groupId,
    userId: user.id,
    actorName: user.name,
    actionType: "member_added",
    description: `${user.name || "A user"} joined the group via email invitation.`,
    relatedUserId: user.id,
    timestamp: serverTimestamp(),
  });

  const updatedSnap = await getDoc(groupDocRef);
  if (!updatedSnap.exists()) {
    return { accepted: true, group: null };
  }
  return {
    accepted: true,
    group: mapFirestoreGroup(updatedSnap.id, updatedSnap.data()),
  };
}

export async function loadGroupAsMember(
  groupId: string,
  user: User
): Promise<{ group: Group | null; denied: boolean }> {
  const { group: initialGroup } = await acceptGroupInviteIfNeeded(groupId, user);

  let group = initialGroup;
  if (!group) {
    const snap = await getDoc(doc(db, "groups", groupId));
    if (!snap.exists()) {
      return { group: null, denied: true };
    }
    group = mapFirestoreGroup(snap.id, snap.data());
  }

  if (!isGroupMember(group, user.id)) {
    return { group: null, denied: true };
  }

  return { group, denied: false };
}

export async function fetchUserGroups(user: User): Promise<Group[]> {
  const groupsCollectionRef = collection(db, "groups");
  const normalizedEmail = user.email ? normalizeEmail(user.email) : null;

  const constraints = [
    where("visibility", "==", "public"),
    where("memberIds", "array-contains", user.id),
  ];

  if (normalizedEmail) {
    constraints.push(where("invitedEmails", "array-contains", normalizedEmail));
  }

  const q = query(groupsCollectionRef, or(...constraints));
  const querySnapshot = await getDocs(q);
  const groupsMap = new Map<string, Group>();

  querySnapshot.forEach((groupDoc) => {
    const group = mapFirestoreGroup(groupDoc.id, groupDoc.data());

    if (
      group.visibility === "private" &&
      !isGroupMember(group, user.id) &&
      !isInvitedToGroup(group, user.email)
    ) {
      return;
    }

    groupsMap.set(group.id, group);
  });

  for (const group of groupsMap.values()) {
    if (isInvitedToGroup(group, user.email) && !isGroupMember(group, user.id)) {
      const { group: acceptedGroup } = await acceptGroupInviteIfNeeded(
        group.id,
        user
      );
      if (acceptedGroup) {
        groupsMap.set(group.id, acceptedGroup);
      }
    }
  }

  return Array.from(groupsMap.values()).sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
}

export async function revokeGroupInvite(
  group: Group,
  adminUser: User,
  email: string
): Promise<void> {
  const normalizedEmail = normalizeEmail(email);
  const ownerEmail = getOwnerEmail(group);
  if (ownerEmail && normalizedEmail === ownerEmail) {
    throw new Error("Cannot revoke the group admin's access.");
  }

  const groupDocRef = doc(db, "groups", group.id);

  await updateDoc(groupDocRef, {
    invitedEmails: arrayRemove(normalizedEmail),
  });

  await addDoc(collection(db, "groups", group.id, "activityLog"), {
    groupId: group.id,
    userId: adminUser.id,
    actorName: adminUser.name,
    actionType: "member_invited",
    description: `${adminUser.name || "Admin"} removed the app invitation for ${normalizedEmail}. They remain in the group for expense splits only.`,
    timestamp: serverTimestamp(),
  });
}

export async function resendGroupInvite(
  group: Group,
  adminUser: User,
  email: string
): Promise<void> {
  const normalizedEmail = normalizeEmail(email);
  const ownerEmail = getOwnerEmail(group);
  if (ownerEmail && normalizedEmail === ownerEmail) {
    throw new Error("Cannot invite the group admin.");
  }

  const member = group.members.find(
    (m) => m.email && normalizeEmail(m.email) === normalizedEmail
  );
  if (!member) {
    throw new Error("No member found with that email.");
  }
  if (!canReinviteMemberToApp(group, member)) {
    throw new Error("This member cannot be invited right now.");
  }

  const groupDocRef = doc(db, "groups", group.id);

  await updateDoc(groupDocRef, {
    invitedEmails: arrayUnion(normalizedEmail),
  });

  await addDoc(collection(db, "groups", group.id, "activityLog"), {
    groupId: group.id,
    userId: adminUser.id,
    actorName: adminUser.name,
    actionType: "member_invited",
    description: `${adminUser.name || "Admin"} invited ${member.name || normalizedEmail} to access the group in the app (${normalizedEmail}).`,
    relatedUserId: member.id,
    timestamp: serverTimestamp(),
  });
}

export type GroupMemberInput = {
  id: string;
  name: string | null;
  email?: string | null;
  avatarUrl?: string | null;
};

export async function addGroupMembersToGroup(
  group: Group,
  adminUser: User,
  membersToAdd: GroupMemberInput[]
): Promise<{ addedCount: number; invitedCount: number }> {
  const invitedEmails = group.invitedEmails || [];
  const memberEmails = getMemberEmails(group);
  const existingIds = new Set(group.memberIds);

  const newMemberObjects: User[] = [];
  const newMemberIds: string[] = [];
  const emailsToInvite: string[] = [];

  for (const member of membersToAdd) {
    if (existingIds.has(member.id)) continue;
    existingIds.add(member.id);

    const rawEmail = member.email?.trim();
    const validEmail =
      rawEmail && isValidEmail(normalizeEmail(rawEmail))
        ? normalizeEmail(rawEmail)
        : null;

    newMemberObjects.push({
      id: member.id,
      name: member.name,
      email: validEmail,
      avatarUrl: member.avatarUrl || "",
    });
    newMemberIds.push(member.id);

    if (
      memberNeedsAppInvite(group, member) &&
      validEmail &&
      !invitedEmails.includes(validEmail) &&
      !memberEmails.has(validEmail)
    ) {
      emailsToInvite.push(validEmail);
      memberEmails.add(validEmail);
    }
  }

  if (newMemberIds.length === 0) {
    return { addedCount: 0, invitedCount: 0 };
  }

  const groupDocRef = doc(db, "groups", group.id);
  const updatePayload: Record<string, unknown> = {
    memberIds: arrayUnion(...newMemberIds),
    members: arrayUnion(...newMemberObjects),
  };
  if (emailsToInvite.length > 0) {
    updatePayload.invitedEmails = arrayUnion(...emailsToInvite);
  }

  await updateDoc(groupDocRef, updatePayload);

  const activityLogColRef = collection(db, "groups", group.id, "activityLog");
  for (const member of newMemberObjects) {
    const invited = member.email && emailsToInvite.includes(member.email);
    await addDoc(activityLogColRef, {
      groupId: group.id,
      userId: adminUser.id,
      actorName: adminUser.name,
      actionType: invited ? "member_invited" : "member_added",
      description: invited
        ? `${adminUser.name || "Admin"} added ${member.name || "a member"} with app access for ${member.email}.`
        : `${adminUser.name || "Admin"} added ${member.name || "a member"} for expense splits.`,
      relatedUserId: member.id,
      timestamp: serverTimestamp(),
    });
  }

  return { addedCount: newMemberIds.length, invitedCount: emailsToInvite.length };
}

export type MemberRemovalImpact = {
  expensesRevised: number;
  paymentsRemoved: number;
  contributionsRemoved: number;
};

type ExpenseParticipantRow = { userId: string; amountOwed: number };

function distributeAmountEqually(
  total: number,
  userIds: string[]
): ExpenseParticipantRow[] {
  if (userIds.length === 0) return [];
  const share = parseFloat((total / userIds.length).toFixed(2));
  return userIds.map((userId, index) => ({
    userId,
    amountOwed:
      index === userIds.length - 1
        ? parseFloat((total - share * (userIds.length - 1)).toFixed(2))
        : share,
  }));
}

function redistributeRemovedShare(
  participants: ExpenseParticipantRow[],
  removedShare: number,
  totalAmount: number
): ExpenseParticipantRow[] {
  const sumRemaining = participants.reduce((sum, p) => sum + p.amountOwed, 0);

  if (sumRemaining <= 0) {
    return distributeAmountEqually(
      totalAmount,
      participants.map((p) => p.userId)
    );
  }

  const updated = participants.map((p) => ({
    userId: p.userId,
    amountOwed: parseFloat(
      (p.amountOwed + (removedShare * p.amountOwed) / sumRemaining).toFixed(2)
    ),
  }));

  const newSum = updated.reduce((sum, p) => sum + p.amountOwed, 0);
  const drift = parseFloat((totalAmount - newSum).toFixed(2));
  if (Math.abs(drift) > 0.001 && updated.length > 0) {
    updated[updated.length - 1].amountOwed = parseFloat(
      (updated[updated.length - 1].amountOwed + drift).toFixed(2)
    );
  }

  return updated;
}

function reviseExpenseForRemovedMember(
  expense: Pick<Expense, "amount" | "paidByUserId" | "participants">,
  removedUserId: string,
  remainingMemberIds: string[],
  reassignPayerTo: string
): { paidByUserId: string; participants: ExpenseParticipantRow[] } | null {
  const involvesRemoved =
    expense.paidByUserId === removedUserId ||
    expense.participants.some((p) => p.userId === removedUserId);

  if (!involvesRemoved) return null;

  const paidByUserId =
    expense.paidByUserId === removedUserId ? reassignPayerTo : expense.paidByUserId;

  const removedShare =
    expense.participants.find((p) => p.userId === removedUserId)?.amountOwed ?? 0;

  let participants = expense.participants.filter((p) => p.userId !== removedUserId);
  participants = participants.filter((p) => remainingMemberIds.includes(p.userId));

  if (participants.length === 0 && remainingMemberIds.length > 0) {
    participants = distributeAmountEqually(expense.amount, remainingMemberIds);
  } else if (removedShare > 0 && participants.length > 0) {
    participants = redistributeRemovedShare(participants, removedShare, expense.amount);
  }

  return { paidByUserId, participants };
}

export function computeMemberRemovalImpact(
  memberId: string,
  expenses: Expense[],
  payments: Payment[],
  contributions: Contribution[]
): MemberRemovalImpact {
  let expensesRevised = 0;
  for (const expense of expenses) {
    if (
      expense.paidByUserId === memberId ||
      expense.participants.some((p) => p.userId === memberId)
    ) {
      expensesRevised++;
    }
  }

  const paymentsRemoved = payments.filter(
    (p) => p.paidByUserId === memberId || p.paidToUserId === memberId
  ).length;

  const contributionsRemoved = contributions.filter(
    (c) => c.contributorId === memberId
  ).length;

  return { expensesRevised, paymentsRemoved, contributionsRemoved };
}

export async function removeGroupMemberFromGroup(
  group: Group,
  adminUser: User,
  memberIdToRemove: string
): Promise<MemberRemovalImpact> {
  if (group.ownerId !== adminUser.id) {
    throw new Error("Only the group admin can remove members.");
  }
  if (memberIdToRemove === group.ownerId) {
    throw new Error("Cannot remove the group admin.");
  }
  if (!group.memberIds.includes(memberIdToRemove)) {
    throw new Error("Member is not in this group.");
  }

  const remainingMemberIds = group.memberIds.filter((id) => id !== memberIdToRemove);
  const memberToRemove = group.members.find((m) => m.id === memberIdToRemove);
  const memberName = memberToRemove?.name || "Member";

  const [expensesSnap, paymentsSnap, contributionsSnap] = await Promise.all([
    getDocs(collection(db, "groups", group.id, "expenses")),
    getDocs(collection(db, "groups", group.id, "payments")),
    getDocs(collection(db, "groups", group.id, "contributions")),
  ]);

  const impact: MemberRemovalImpact = {
    expensesRevised: 0,
    paymentsRemoved: 0,
    contributionsRemoved: 0,
  };

  let batch = writeBatch(db);
  let batchOps = 0;

  const commitIfNeeded = async (force = false) => {
    if (batchOps > 0 && (force || batchOps >= 450)) {
      await batch.commit();
      batch = writeBatch(db);
      batchOps = 0;
    }
  };

  for (const expDoc of expensesSnap.docs) {
    const data = expDoc.data();
    const expense = {
      amount: data.amount as number,
      paidByUserId: data.paidByUserId as string,
      participants: (data.participants as ExpenseParticipantRow[]) || [],
    };

    const revised = reviseExpenseForRemovedMember(
      expense,
      memberIdToRemove,
      remainingMemberIds,
      group.ownerId
    );

    if (revised) {
      batch.update(expDoc.ref, {
        paidByUserId: revised.paidByUserId,
        participants: revised.participants,
      });
      batchOps++;
      impact.expensesRevised++;
      await commitIfNeeded();
    }
  }

  for (const payDoc of paymentsSnap.docs) {
    const data = payDoc.data();
    if (
      data.paidByUserId === memberIdToRemove ||
      data.paidToUserId === memberIdToRemove
    ) {
      batch.delete(payDoc.ref);
      batchOps++;
      impact.paymentsRemoved++;
      await commitIfNeeded();
    }
  }

  for (const contribDoc of contributionsSnap.docs) {
    if (contribDoc.data().contributorId === memberIdToRemove) {
      batch.delete(contribDoc.ref);
      batchOps++;
      impact.contributionsRemoved++;
      await commitIfNeeded();
    }
  }

  await commitIfNeeded(true);

  const updatedMembers = group.members.filter((m) => m.id !== memberIdToRemove);
  const updatedMemberIds = remainingMemberIds;
  const updatedInvitedEmails = (group.invitedEmails || []).filter((email) => {
    if (!memberToRemove?.email) return true;
    return email !== normalizeEmail(memberToRemove.email);
  });

  await updateDoc(doc(db, "groups", group.id), {
    members: updatedMembers,
    memberIds: updatedMemberIds,
    invitedEmails: updatedInvitedEmails,
  });

  await addDoc(collection(db, "groups", group.id, "activityLog"), {
    groupId: group.id,
    userId: adminUser.id,
    actorName: adminUser.name,
    actionType: "member_removed",
    description: `${adminUser.name || "Admin"} removed ${memberName} from the group. Balances and expense splits were recalculated.`,
    relatedUserId: memberIdToRemove,
    timestamp: serverTimestamp(),
  });

  return impact;
}
