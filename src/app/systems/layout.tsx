import Link from "next/link";
import { redirect } from "next/navigation";
import {
  LayoutDashboard,
  ClipboardList,
  Users,
  KeyRound,
  Code,
  BookOpen,
  Building2,
  CircleQuestionMark,
  LogOut,
  UserCog,
} from "lucide-react";
import { getCurrentUserOrNull } from "@/lib/current-user";
import { Avatar } from "@/lib/avatar";
import { canManageUsers, canManageSso, canManageApiKeys, canManageVendors } from "@/lib/permissions";
import { getSessionCookie, clearSessionCookie } from "@/lib/session";
import { endImpersonation, clearImpersonationCookie } from "@/lib/impersonation";
import { stytchClient } from "@/lib/stytch";
import { stopImpersonation } from "./impersonation-actions";

export default async function SystemsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUserOrNull();
  if (!user) {
    redirect("/sign-in");
  }

  return (
    <div>
      <header className="flex items-center justify-between border-b border-zinc-200 px-6 py-3 text-sm dark:border-zinc-800">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/brand/governedai-logo-lockup.png" alt="GovernedAI" className="h-6 w-auto dark:hidden" />
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/brand/governedai-logo-lockup-dark.png"
          alt="GovernedAI"
          className="hidden h-6 w-auto dark:block"
        />
        <div className="flex items-center gap-3 text-zinc-500">
          <Link href="/systems" className="inline-flex items-center gap-1.5 hover:underline">
            <LayoutDashboard size={15} />
            Dashboard
          </Link>
          <Link href="/systems/inventory" className="inline-flex items-center gap-1.5 hover:underline">
            <ClipboardList size={15} />
            Inventory
          </Link>
          {canManageUsers(user.role) && (
            <Link href="/systems/users" className="inline-flex items-center gap-1.5 hover:underline">
              <Users size={15} />
              Users
            </Link>
          )}
          {canManageSso(user.role) && (
            <Link href="/systems/sso" className="inline-flex items-center gap-1.5 hover:underline">
              <KeyRound size={15} />
              SSO
            </Link>
          )}
          {canManageApiKeys(user.role) && (
            <Link href="/systems/api-keys" className="inline-flex items-center gap-1.5 hover:underline">
              <Code size={15} />
              API keys
            </Link>
          )}
          {canManageVendors(user.role) && (
            <Link href="/systems/vendors" className="inline-flex items-center gap-1.5 hover:underline">
              <Building2 size={15} />
              Vendors
            </Link>
          )}
          <Link
            href="/systems/api-keys/docs"
            className="inline-flex items-center gap-1.5 hover:underline"
            title="API documentation"
          >
            <BookOpen size={15} />
            API docs
          </Link>
          <Link
            href="/systems/legend"
            className="inline-flex items-center gap-1.5 hover:underline"
            title="Icon legend"
          >
            <CircleQuestionMark size={15} />
            Legend
          </Link>
          {/* Avatar's own title attribute (name/email) shows on hover —
              role is one click away on the profile page itself. */}
          <Link href="/systems/profile">
            <Avatar user={user} />
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
            <button type="submit" className="inline-flex items-center gap-1.5 hover:underline">
              <LogOut size={15} />
              Sign out
            </button>
          </form>
        </div>
      </header>

      {/* Indigo, deliberately outside the red/amber/orange/emerald status
          vocabulary (see src/lib/badges.tsx) — "I'm impersonating" must
          never be readable as a risk/status signal. */}
      {user.impersonation && (
        <div className="flex items-center justify-between gap-3 border-b border-indigo-300 bg-indigo-50 px-6 py-2 text-sm text-indigo-900 dark:border-indigo-800 dark:bg-indigo-950/40 dark:text-indigo-300">
          <span className="inline-flex items-center gap-1.5">
            <UserCog size={15} />
            Viewing as {user.email} on behalf of {user.impersonation.realAdminEmail} — expires{" "}
            {user.impersonation.expiresAt.toLocaleTimeString()}
          </span>
          <form action={stopImpersonation}>
            <button type="submit" className="font-medium underline hover:no-underline">
              Stop impersonating
            </button>
          </form>
        </div>
      )}

      {children}
    </div>
  );
}
