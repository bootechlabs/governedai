import { prisma } from "@/lib/prisma";
import { authenticateSession } from "@/lib/session";

export async function getCurrentUser() {
  const session = await authenticateSession();
  if (!session) {
    throw new Error("Not authenticated");
  }

  const user = await prisma.user.findUnique({
    where: { id: session.member.member_id },
  });
  if (!user) {
    throw new Error("Authenticated Stytch member has no matching local User row");
  }
  return user;
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
