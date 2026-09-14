import Link from "next/link";
import { redirect } from "next/navigation";
import {
  LayoutDashboard,
  ClipboardList,
  Users,
  KeyRound,
  Code,
  Building2,
  CircleQuestionMark,
  LogOut,
} from "lucide-react";
import { getCurrentUserOrNull } from "@/lib/current-user";
import { canManageUsers, canManageSso, canManageApiKeys, canManageVendors } from "@/lib/permissions";
import { getSessionCookie, clearSessionCookie } from "@/lib/session";
import { stytchClient } from "@/lib/stytch";

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
        <span className="font-medium">GovernedAI</span>
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
            href="/systems/legend"
            className="inline-flex items-center gap-1.5 hover:underline"
            title="Icon legend"
          >
            <CircleQuestionMark size={15} />
            Legend
          </Link>
          <span>
            {user.email} · {user.role}
          </span>
          <form
            action={async () => {
              "use server";
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
      {children}
    </div>
  );
}
