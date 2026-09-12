import { primaryButtonClass } from "@/lib/ui";

// Stytch's magic-link/SSO email redirects the browser here (we set this as
// login_redirect_url/signup_redirect_url — see src/app/sign-in/actions.ts
// and the SSO start URL in src/lib/stytch.ts), appending the real token as
// query params. Email link-safety scanners (Gmail, corporate gateways)
// prefetch every URL in an email body, which would silently burn a
// single-use token before a human clicks it — this page exists so a
// scanner only fetches this inert confirmation screen, and the actual
// token-redeeming request only happens on a real click.
//
// The destination is always our own fixed relative path, never anything
// from the query string, so this can't become an open redirect — we only
// need to sanity-check the token type/value before echoing them into that
// fixed link.
const ALLOWED_TOKEN_TYPES = new Set(["multi_tenant_magic_links", "sso"]);

function isSafeToken(value: string) {
  return /^[A-Za-z0-9_-]+$/.test(value);
}

export default async function ConfirmSignInPage({
  searchParams,
}: {
  searchParams: Promise<{ stytch_token_type?: string; token?: string }>;
}) {
  const { stytch_token_type, token } = await searchParams;

  const isValid =
    !!stytch_token_type &&
    !!token &&
    ALLOWED_TOKEN_TYPES.has(stytch_token_type) &&
    isSafeToken(token);

  const callbackHref = isValid
    ? `/api/auth/callback?stytch_token_type=${stytch_token_type}&token=${token}`
    : null;

  return (
    <div className="mx-auto flex min-h-screen max-w-sm flex-col items-center justify-center px-6 text-center">
      <h1 className="text-xl font-semibold tracking-tight">Confirm sign-in</h1>
      {callbackHref ? (
        <>
          <p className="mt-2 text-sm text-zinc-500">
            Click below to finish signing in to GovernedAI.
          </p>
          <a href={callbackHref} className={`mt-6 ${primaryButtonClass}`}>
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
