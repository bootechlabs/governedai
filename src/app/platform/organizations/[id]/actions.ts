"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/current-user";
import { startImpersonation, getActiveImpersonationForAdmin, setImpersonationCookie } from "@/lib/impersonation";
import { sendImpersonationStartedEmail } from "@/lib/email";

async function requirePlatformAdmin() {
  const actor = await getCurrentUser();
  // Reachable at all only means "not currently impersonating" (see
  // src/app/platform/layout.tsx's reasoning), so this is always the real
  // admin — no separate non-overlay lookup needed.
  if (!actor.isPlatformAdmin) {
    throw new Error("Only platform admins can do this");
  }
  return actor;
}

export async function updateOrganizationVertical(organizationId: string, formData: FormData) {
  await requirePlatformAdmin();
  const vertical = String(formData.get("vertical") ?? "").trim() || null;

  await prisma.organization.update({
    where: { id: organizationId },
    data: { vertical },
  });

  revalidatePath(`/platform/organizations/${organizationId}`);
  revalidatePath("/platform");
}

export async function startImpersonationAction(targetUserId: string) {
  const admin = await requirePlatformAdmin();

  const existing = await getActiveImpersonationForAdmin(admin.id);
  if (existing) {
    throw new Error("Stop your current impersonation session before starting another");
  }

  const target = await prisma.user.findUniqueOrThrow({ where: { id: targetUserId } });
  if (target.id === admin.id) {
    throw new Error("Can't impersonate yourself");
  }
  if (target.isPlatformAdmin) {
    throw new Error("Can't impersonate another platform admin");
  }

  const session = await startImpersonation(admin.id, target.id);
  await setImpersonationCookie(session.id);

  try {
    await sendImpersonationStartedEmail({
      to: target.email,
      targetName: target.name ?? target.email,
      adminEmail: admin.email,
      expiresAt: session.expiresAt,
    });
  } catch (error) {
    console.error("Failed to send impersonation notification email", error);
  }

  redirect("/systems");
}
