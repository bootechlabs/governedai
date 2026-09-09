import Link from "next/link";

// Auth.js redirects here on any sign-in failure. The only way that happens
// in this app is createUser() rejecting an unprovisioned email (see
// src/auth.ts) or a used/expired magic link — both map to the same
// user-facing message rather than Auth.js's generic "Configuration" error.
export default function AuthErrorPage() {
  return (
    <div className="mx-auto flex min-h-screen max-w-sm flex-col items-center justify-center px-6 text-center">
      <h1 className="text-xl font-semibold tracking-tight">Unable to sign in</h1>
      <p className="mt-2 text-sm text-zinc-500">
        Either this email hasn&apos;t been provisioned for GovernedAI yet — ask an admin
        to add your account — or the sign-in link was already used or expired.
      </p>
      <Link href="/sign-in" className="mt-6 text-sm underline hover:no-underline">
        Back to sign in
      </Link>
    </div>
  );
}
