import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import { LayoutDashboard, Building2 } from "lucide-react";
import { getCurrentUserOrNull } from "@/lib/current-user";

export default async function PlatformLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUserOrNull();
  if (!user) {
    redirect("/sign-in");
  }
  // getCurrentUser() only returns a non-platform-admin row while an
  // impersonation is active (it returns the target, not the real admin —
  // see src/lib/current-user.ts) or when the signed-in user genuinely
  // isn't a platform admin. Either way, /platform is off-limits until any
  // active impersonation is stopped from the banner in src/app/systems/layout.tsx.
  if (!user.isPlatformAdmin) {
    notFound();
  }

  return (
    <div>
      <header className="flex items-center justify-between border-b border-zinc-200 px-6 py-3 text-sm dark:border-zinc-800">
        <div className="flex items-center gap-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/brand/governedai-logo-lockup.png" alt="GovernedAI" className="h-6 w-auto dark:hidden" />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/brand/governedai-logo-lockup-dark.png"
            alt="GovernedAI"
            className="hidden h-6 w-auto dark:block"
          />
          <span className="font-medium text-zinc-500">— Platform</span>
        </div>
        <div className="flex items-center gap-3 text-zinc-500">
          <Link href="/platform" className="inline-flex items-center gap-1.5 hover:underline">
            <LayoutDashboard size={15} />
            Global dashboard
          </Link>
          <Link href="/systems" className="inline-flex items-center gap-1.5 hover:underline">
            <Building2 size={15} />
            Back to my org
          </Link>
        </div>
      </header>
      {children}
    </div>
  );
}
