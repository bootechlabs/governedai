import { redirect } from "next/navigation";
import { sendMagicLink, startSsoLogin } from "./actions";
import { inputClass, primaryButtonClass } from "@/lib/ui";

export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{ sso?: string }>;
}) {
  const { sso } = await searchParams;

  return (
    <div className="mx-auto flex min-h-screen max-w-sm flex-col justify-center px-6">
      {/* Dark-mode-illegible wordmark — see src/app/systems/layout.tsx.
          No dark-mode fallback needed here since the heading below already
          names the product. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/brand/governedai-logo-lockup.png" alt="GovernedAI" className="mb-6 h-8 w-auto dark:hidden" />
      <h1 className="text-xl font-semibold tracking-tight">Sign in to GovernedAI</h1>
      <p className="mt-2 text-sm text-zinc-500">
        Enter your work email — we&apos;ll send a magic link.
      </p>
      <form
        action={async (formData) => {
          "use server";
          await sendMagicLink(formData);
          redirect("/sign-in/check-email");
        }}
        className="mt-6 flex flex-col gap-3"
      >
        <input
          type="email"
          name="email"
          placeholder="you@company.com"
          required
          className={inputClass}
        />
        <button type="submit" className={primaryButtonClass}>
          Send magic link
        </button>
      </form>

      <div className="mt-6 border-t border-zinc-200 pt-6 dark:border-zinc-800">
        <p className="text-sm text-zinc-500">
          Or, if your organization uses single sign-on:
        </p>
        <form action={startSsoLogin} className="mt-3 flex flex-col gap-3">
          <input
            type="email"
            name="email"
            placeholder="you@company.com"
            required
            className={inputClass}
          />
          <button
            type="submit"
            className="rounded border border-zinc-300 px-3 py-1.5 text-sm font-medium dark:border-zinc-700"
          >
            Continue with SSO
          </button>
        </form>
        {sso === "unavailable" && (
          <p className="mt-2 text-sm text-red-600 dark:text-red-400">
            SSO isn&apos;t set up for that email yet — try a magic link instead.
          </p>
        )}
      </div>
    </div>
  );
}
