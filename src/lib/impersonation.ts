import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";

// Separate from the real Stytch session cookie (src/lib/session.ts) —
// impersonation is an app-level overlay on top of a real, unaffected
// platform-admin login, not a re-authentication as the target user.
const IMPERSONATION_COOKIE = "governedai_impersonation_id";
const IMPERSONATION_DURATION_MINUTES = 60;

export async function setImpersonationCookie(impersonationId: string) {
  (await cookies()).set(IMPERSONATION_COOKIE, impersonationId, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * IMPERSONATION_DURATION_MINUTES,
  });
}

export async function clearImpersonationCookie() {
  (await cookies()).delete(IMPERSONATION_COOKIE);
}

export async function getImpersonationCookie() {
  return (await cookies()).get(IMPERSONATION_COOKIE)?.value;
}

export async function startImpersonation(platformAdminId: string, targetUserId: string) {
  const expiresAt = new Date(Date.now() + IMPERSONATION_DURATION_MINUTES * 60_000);
  return prisma.impersonationSession.create({
    data: { platformAdminId, targetUserId, expiresAt },
  });
}

// One active impersonation per admin — starting a new one first requires
// stopping any existing one (enforced by the caller, src/app/platform/
// organizations/[id]/actions.ts), so this only ever expects 0 or 1 rows.
export async function getActiveImpersonationForAdmin(platformAdminId: string) {
  return prisma.impersonationSession.findFirst({
    where: { platformAdminId, endedAt: null, expiresAt: { gt: new Date() } },
  });
}

export async function endImpersonation(impersonationId: string) {
  return prisma.impersonationSession.update({
    where: { id: impersonationId },
    data: { endedAt: new Date() },
  });
}
