import { cookies } from "next/headers";
import { stytchClient } from "@/lib/stytch";

// Stytch issues opaque session JWTs — we store one in an httpOnly cookie
// ourselves (there's no Auth.js/adapter session table anymore; Stytch is
// the session store). Matches the cookie lifetime pattern from Stytch's
// own example apps: 30 days, refreshed on every authenticate() call.
const SESSION_COOKIE = "governedai_session";
export const SESSION_DURATION_MINUTES = 60 * 24 * 30;

export async function setSessionCookie(sessionJwt: string) {
  (await cookies()).set(SESSION_COOKIE, sessionJwt, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * SESSION_DURATION_MINUTES,
  });
}

export async function clearSessionCookie() {
  (await cookies()).delete(SESSION_COOKIE);
}

export async function getSessionCookie() {
  return (await cookies()).get(SESSION_COOKIE)?.value;
}

// Verifies the session with Stytch and returns the member/organization, or
// null if there's no session or it's invalid/expired. Every call refreshes
// the JWT's expiry — callers that render a page should re-set the cookie
// with the returned session_jwt so the 30-day window keeps rolling forward.
export async function authenticateSession() {
  const sessionJwt = await getSessionCookie();
  if (!sessionJwt) return null;

  try {
    return await stytchClient.sessions.authenticate({
      session_jwt: sessionJwt,
      session_duration_minutes: SESSION_DURATION_MINUTES,
    });
  } catch {
    return null;
  }
}
