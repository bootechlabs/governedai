"use client";

import Link from "next/link";
import { AlertTriangle } from "lucide-react";
import { primaryButtonClass, subtleLinkClass } from "@/lib/ui";

// Root error boundary — catches every thrown error from every Server
// Action / route in the app that doesn't have a more specific one.
// Without this, Next.js's production default silently swallows the
// error message and Vercel renders a bare "This page couldn't load"
// screen with nothing actionable — even for deliberate, user-facing
// validation errors like "A rationale is required..." or "X is already
// a user in your organization." Every thrown Error in this codebase is
// written to be shown to the user (never a leaked internal/stack
// trace), so surfacing error.message directly here is safe and is the
// point of throwing it in the first place.
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="mx-auto flex min-h-screen max-w-sm flex-col justify-center px-6 text-center">
      <div className="mx-auto flex items-center gap-1.5 text-red-600 dark:text-red-400">
        <AlertTriangle size={18} />
        <h1 className="text-lg font-semibold">Something went wrong</h1>
      </div>
      <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">{error.message}</p>
      <div className="mt-6 flex items-center justify-center gap-4">
        <button type="button" onClick={reset} className={primaryButtonClass}>
          Try again
        </button>
        <Link href="/systems" className={subtleLinkClass}>
          Back to dashboard
        </Link>
      </div>
    </div>
  );
}
