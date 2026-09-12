import * as stytch from "stytch";

// Identity, organizations, sessions, and SSO all live in Stytch B2B — this
// app only mirrors display fields locally (see prisma/schema.prisma). One
// client per server process, matching the Prisma client singleton pattern.
const globalForStytch = globalThis as unknown as { stytchClient?: stytch.B2BClient };

export const stytchEnv =
  process.env.STYTCH_PROJECT_ENV === "live" ? stytch.envs.live : stytch.envs.test;

export const stytchClient =
  globalForStytch.stytchClient ??
  new stytch.B2BClient({
    project_id: process.env.STYTCH_PROJECT_ID!,
    secret: process.env.STYTCH_SECRET!,
    env: stytchEnv,
  });

if (process.env.NODE_ENV !== "production") {
  globalForStytch.stytchClient = stytchClient;
}

export const stytchPublicToken = process.env.NEXT_PUBLIC_STYTCH_PUBLIC_TOKEN!;

// Used to build the SSO redirect URL (see the "Sign in with SSO" flow in
// src/app/sign-in) — Stytch's SSO start endpoint is a plain GET the browser
// navigates to directly, not something the SDK wraps.
export function ssoStartUrl(connectionId: string, redirectDomain: string) {
  const callbackUrl = `${redirectDomain}/api/auth/callback`;
  const params = new URLSearchParams({
    connection_id: connectionId,
    public_token: stytchPublicToken,
    login_redirect_url: callbackUrl,
    signup_redirect_url: callbackUrl,
  });
  return `${stytchEnv}v1/public/sso/start?${params.toString()}`;
}
