import type { UserRole } from "@prisma/client";

// Segregation of duties: whoever adds a system to the inventory
// (CONTRIBUTOR) isn't the same person who approves it (REVIEWER) —
// standard compliance practice, and the reason these two are split
// rather than just ranked on one ladder. ADMIN can do everything.

export function canCreateSystem(role: UserRole) {
  return role === "ADMIN" || role === "CONTRIBUTOR";
}

// Edit, delete, archive, unarchive — structural changes to a system's record.
export function canManageSystem(role: UserRole) {
  return role === "ADMIN";
}

export function canDecideStage(role: UserRole) {
  return role === "ADMIN" || role === "REVIEWER";
}

// Deliberately no canAttachEvidence — every role can attach evidence, so
// there's nothing to gate.

export function canManageUsers(role: UserRole) {
  return role === "ADMIN";
}

export function canManageSso(role: UserRole) {
  return role === "ADMIN";
}

export function canManageApiKeys(role: UserRole) {
  return role === "ADMIN";
}
