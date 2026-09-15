// Pure logic pulled out of src/app/systems/users/actions.ts addUser — the
// duplicate lookup itself is a DB query (not pure), but what it *means*
// and how a failed Stytch invite gets turned into a message the admin
// actually sees are both plain functions, so they're the part that can
// be unit-tested the way everything else in this codebase is.

export function duplicateUserMessage(email: string, existing: unknown): string | null {
  return existing ? `${email} is already a user in your organization` : null;
}

// Local dev and prod share one Stytch project, so a user invited in one
// can already exist in Stytch (duplicate_member_email) with no local row
// in the other — this is the path that actually failed live. The local
// duplicateUserMessage check above can't catch that case; this is what
// turns whatever Stytch (or anything else) throws into a message worth
// showing, instead of an unhandled crash.
export function formatInviteError(email: string, error: unknown): string {
  const message = error instanceof Error ? error.message : "Unknown error";
  return `Couldn't invite ${email}: ${message}`;
}
