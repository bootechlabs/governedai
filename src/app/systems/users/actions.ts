"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/current-user";
import { canManageUsers } from "@/lib/permissions";
import { stytchClient } from "@/lib/stytch";
import type { UserRole } from "@prisma/client";

async function requireAdmin() {
  const actor = await getCurrentUser();
  if (!canManageUsers(actor.role)) {
    throw new Error("Only admins can manage users");
  }
  return actor;
}

function currentOrigin(host: string) {
  const isLocal = host.startsWith("localhost") || host.startsWith("127.0.0.1");
  return `${isLocal ? "http" : "https"}://${host}`;
}

// Provisioning a user means both: creating them as a Stytch Member (so
// they can actually sign in) and mirroring that locally with a role
// (Stytch doesn't know about our app-specific RBAC — see
// src/lib/permissions.ts). If the Stytch invite succeeds but the local
// write fails, the person could authenticate with no local User row;
// current-user.ts treats that as "not authenticated" rather than crashing,
// but it's a real inconsistency worth knowing about if it ever shows up.
export async function addUser(formData: FormData) {
  const actor = await requireAdmin();

  const email = String(formData.get("email") ?? "")
    .trim()
    .toLowerCase();
  const name = String(formData.get("name") ?? "").trim() || null;
  const role = String(formData.get("role") ?? "CONTRIBUTOR") as UserRole;
  if (!email) {
    throw new Error("Email is required");
  }

  const host = (await headers()).get("host")!;
  const inviteRedirectUrl = `${currentOrigin(host)}/auth/confirm`;

  const { member } = await stytchClient.magicLinks.email.invite({
    organization_id: actor.organizationId,
    email_address: email,
    name: name ?? undefined,
    invited_by_member_id: actor.id,
    invite_redirect_url: inviteRedirectUrl,
  });

  await prisma.user.create({
    data: {
      id: member.member_id,
      organizationId: actor.organizationId,
      email,
      name,
      role,
    },
  });

  revalidatePath("/systems/users");
}

export async function updateUserRole(userId: string, formData: FormData) {
  const actor = await requireAdmin();
  const role = String(formData.get("role") ?? "") as UserRole;
  if (!role) {
    throw new Error("Role is required");
  }
  if (userId === actor.id) {
    throw new Error("You can't change your own role");
  }

  // Scope the update to the actor's own org — an admin from one
  // organization should never be able to touch another org's users, even
  // by guessing a user id.
  const { count } = await prisma.user.updateMany({
    where: { id: userId, organizationId: actor.organizationId },
    data: { role },
  });
  if (count === 0) {
    throw new Error("User not found in your organization");
  }

  revalidatePath("/systems/users");
}
