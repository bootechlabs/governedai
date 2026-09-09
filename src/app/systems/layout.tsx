import Link from "next/link";
import { signOut } from "@/auth";
import { getCurrentUser } from "@/lib/current-user";
import { canManageUsers } from "@/lib/permissions";

export default async function SystemsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();

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
          <span>
            {user.email} · {user.role}
          </span>
          <form
            action={async () => {
              "use server";
              await signOut({ redirectTo: "/sign-in" });
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
