import Link from "next/link";
import { redirect } from "next/navigation";
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
          {canManageUsers(user.role) && (
            <Link href="/systems/users" className="hover:underline">
              Manage users
            </Link>
          )}
          {canManageSso(user.role) && (
            <Link href="/systems/sso" className="hover:underline">
              SSO
            </Link>
          )}
          {canManageApiKeys(user.role) && (
            <Link href="/systems/api-keys" className="hover:underline">
              API keys
            </Link>
          )}
          {canManageVendors(user.role) && (
            <Link href="/systems/vendors" className="hover:underline">
              Vendors
            </Link>
          )}
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
            <button type="submit" className="hover:underline">
              Sign out
            </button>
          </form>
        </div>
      </header>
      {children}
    </div>
  );
}
