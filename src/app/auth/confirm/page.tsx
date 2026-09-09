import { headers } from "next/headers";
import { primaryButtonClass } from "@/lib/ui";

// The email links here instead of straight to the Auth.js callback URL —
// see the comment in src/auth.ts's sendVerificationRequest for why. This
// page must never forward to anything but our own callback endpoint, or
// it becomes an open redirect.
function getValidatedCallbackUrl(rawUrl: string | undefined, host: string | null) {
  if (!rawUrl || !host) return null;
  try {
    const parsed = new URL(rawUrl);
    const isSameHost = parsed.host === host;
    const isAuthCallback = parsed.pathname.startsWith("/api/auth/callback/");
    return isSameHost && isAuthCallback ? rawUrl : null;
  } catch {
    return null;
  }
}

export default async function ConfirmSignInPage({
  searchParams,
}: {
  searchParams: Promise<{ url?: string }>;
}) {
  const { url } = await searchParams;
  const host = (await headers()).get("host");
  const validUrl = getValidatedCallbackUrl(url, host);

  return (
    <div className="mx-auto flex min-h-screen max-w-sm flex-col items-center justify-center px-6 text-center">
      <h1 className="text-xl font-semibold tracking-tight">Confirm sign-in</h1>
      {validUrl ? (
        <>
          <p className="mt-2 text-sm text-zinc-500">
            Click below to finish signing in to GovernedAI.
          </p>
          <a href={validUrl} className={`mt-6 ${primaryButtonClass}`}>
            Sign in to GovernedAI
          </a>
        </>
      ) : (
        <p className="mt-2 text-sm text-red-600 dark:text-red-400">
          This sign-in link is invalid or has expired. Request a new one from the sign-in
          page.
        </p>
      )}
    </div>
  );
}
