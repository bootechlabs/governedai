import { prisma } from "@/lib/prisma";
import { authenticateSession } from "@/lib/session";
import { getImpersonationCookie, getActiveImpersonationForAdmin } from "@/lib/impersonation";
import type { User } from "@prisma/client";

export interface ImpersonationContext {
  realAdminId: string;
  realAdminEmail: string;
  impersonationId: string;
  expiresAt: Date;
}

export type CurrentUser = User & { impersonation?: ImpersonationContext };

// The real Stytch session is always authenticated first and never
// replaced — impersonation is an app-level overlay on top of it (see
// src/lib/impersonation.ts). A platform admin with an active, unexpired
// impersonation session gets the *target* user's row back here, with
// `.impersonation` attached so callers that need the real identity (the
// banner in src/app/systems/layout.tsx, the stop action) still have it.
// Every other caller already trusts organizationId/role/id off this
// return value, so they operate as the impersonated user automatically.
export async function getCurrentUser(): Promise<CurrentUser> {
  const session = await authenticateSession();
  if (!session) {
    throw new Error("Not authenticated");
  }

  const realUser = await prisma.user.findUnique({
    where: { id: session.member.member_id },
  });
  if (!realUser) {
    throw new Error("Authenticated Stytch member has no matching local User row");
  }

  if (realUser.isPlatformAdmin) {
    const impersonationId = await getImpersonationCookie();
    if (impersonationId) {
      const impersonation = await getActiveImpersonationForAdmin(realUser.id);
      if (impersonation && impersonation.id === impersonationId) {
        const targetUser = await prisma.user.findUnique({
          where: { id: impersonation.targetUserId },
        });
        if (targetUser) {
          return {
            ...targetUser,
            impersonation: {
              realAdminId: realUser.id,
              realAdminEmail: realUser.email,
              impersonationId: impersonation.id,
              expiresAt: impersonation.expiresAt,
            },
          };
        }
      }
    }
  }

  return realUser;
}

// Same as getCurrentUser but returns null instead of throwing — for call
// sites (layouts, the sign-in redirect check) that need to branch on
// "signed in or not" rather than assume the caller is always authenticated.
export async function getCurrentUserOrNull() {
  try {
    return await getCurrentUser();
  } catch {
    return null;
  }
}
