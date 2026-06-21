import { db } from "@/lib/firebase";
import type { Group, User } from "@/types";
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

export function isMemberInvitePending(group: Group, member: User): boolean {
  if (!member.email) return false;
  return isInvitedToGroup(group, member.email);
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
  const groupDocRef = doc(db, "groups", group.id);

  await updateDoc(groupDocRef, {
    invitedEmails: arrayRemove(normalizedEmail),
  });

  await addDoc(collection(db, "groups", group.id, "activityLog"), {
    groupId: group.id,
    userId: adminUser.id,
    actorName: adminUser.name,
    actionType: "member_invited",
    description: `${adminUser.name || "Admin"} removed the app invitation for ${normalizedEmail}.`,
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
