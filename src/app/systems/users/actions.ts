"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/current-user";
import { canManageUsers } from "@/lib/permissions";
import type { UserRole } from "@prisma/client";

async function requireAdmin() {
  const actor = await getCurrentUser();
  if (!canManageUsers(actor.role)) {
    throw new Error("Only admins can manage users");
  }
  return actor;
}

export async function addUser(formData: FormData) {
  await requireAdmin();

  const email = String(formData.get("email") ?? "")
    .trim()
    .toLowerCase();
  const role = String(formData.get("role") ?? "CONTRIBUTOR") as UserRole;
  if (!email) {
    throw new Error("Email is required");
  }

  await prisma.user.create({ data: { email, role } });

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

  await prisma.user.update({ where: { id: userId }, data: { role } });

  revalidatePath("/systems/users");
}
