import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { UserCog } from "lucide-react";
import { getCurrentUserOrNull } from "@/lib/current-user";
import { NAV_COOKIE, parseNavPref } from "@/lib/nav";
import { stopImpersonation } from "./impersonation-actions";
import { NavProvider } from "./nav/nav-provider";
import { Sidebar } from "./nav/sidebar";
import { MobileDrawer } from "./nav/mobile-drawer";
import { Hamburger } from "./nav/hamburger";
import { AccountFooter } from "./nav/account-footer";

export default async function SystemsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUserOrNull();
  if (!user) {
    redirect("/sign-in");
  }

  const navPref = parseNavPref((await cookies()).get(NAV_COOKIE)?.value);

  return (
    <NavProvider initialPref={navPref}>
      <div className="flex min-h-screen flex-col">
        {/* Sticky so the sidebar has a fixed offset (h-14) to sit under. The
            profile link and sign-out live at the bottom of the sidebar/drawer. */}
        <header
          data-nav-inert
          className="sticky top-0 z-30 flex h-14 shrink-0 items-center border-b border-zinc-200 bg-background px-4 text-sm dark:border-zinc-800"
        >
          <div className="flex items-center gap-2">
            <Hamburger />
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/brand/governedai-logo-lockup.png" alt="GovernedAI" className="h-6 w-auto dark:hidden" />
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/brand/governedai-logo-lockup-dark.png"
              alt="GovernedAI"
              className="hidden h-6 w-auto dark:block"
            />
          </div>
        </header>

        {/* Indigo, deliberately outside the red/amber/orange/emerald status
            vocabulary (see src/lib/badges.tsx) — "I'm impersonating" must
            never be readable as a risk/status signal. */}
        {user.impersonation && (
          <div
            data-nav-inert
            className="flex items-center justify-between gap-3 border-b border-indigo-300 bg-indigo-50 px-6 py-2 text-sm text-indigo-900 dark:border-indigo-800 dark:bg-indigo-950/40 dark:text-indigo-300"
          >
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

        <div className="flex flex-1">
          <Sidebar role={user.role} footer={<AccountFooter user={user} />} />
          <main data-nav-inert className="min-w-0 flex-1">
            {children}
          </main>
        </div>
      </div>

      <MobileDrawer role={user.role} footer={<AccountFooter user={user} />} />
    </NavProvider>
  );
}
