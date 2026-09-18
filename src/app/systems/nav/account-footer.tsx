import Link from "next/link";
import { redirect } from "next/navigation";
import { LogOut } from "lucide-react";
import { Avatar } from "@/lib/avatar";
import type { CurrentUser } from "@/lib/current-user";
import { getSessionCookie, clearSessionCookie } from "@/lib/session";
import { endImpersonation, clearImpersonationCookie } from "@/lib/impersonation";
import { stytchClient } from "@/lib/stytch";
import { rowBase, rowIdle, showWhenExpanded } from "./nav-styles";

// Profile link + sign-out, pinned to the bottom of the sidebar and the phone
// drawer. A server component (the sign-out action closes over the user), passed
// into both as a slot; its labels follow the enclosing `group/nav` state in CSS
// like every other nav row. The avatar row uses px-2 (not the rows' px-[11px])
// so the 24px avatar centers on the same axis as the 18px icons above it.
export function AccountFooter({ user }: { user: CurrentUser }) {
  const who = user.name ?? user.email;

  return (
    <div className="flex flex-col gap-0.5">
      <Link
        href="/systems/profile"
        aria-label="Your profile"
        title={who}
        className={`flex min-h-11 w-full items-center gap-[9px] rounded-md px-2 py-2 text-sm md:min-h-9 ${rowIdle}`}
      >
        <Avatar user={user} />
        <span className={`truncate ${showWhenExpanded}`}>{who}</span>
      </Link>
      <form
        action={async () => {
          "use server";
          if (user.impersonation) {
            await endImpersonation(user.impersonation.impersonationId);
            await clearImpersonationCookie();
          }
          const sessionJwt = await getSessionCookie();
          await clearSessionCookie();
          if (sessionJwt) {
            await stytchClient.sessions.revoke({ session_jwt: sessionJwt });
          }
          redirect("/sign-in");
        }}
      >
        <button type="submit" aria-label="Sign out" title="Sign out" className={`${rowBase} ${rowIdle}`}>
          <LogOut size={18} className="shrink-0" />
          <span className={`truncate ${showWhenExpanded}`}>Sign out</span>
        </button>
      </form>
    </div>
  );
}
