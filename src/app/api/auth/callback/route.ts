import { NextRequest, NextResponse } from "next/server";
import { stytchClient } from "@/lib/stytch";
import { setSessionCookie, SESSION_DURATION_MINUTES } from "@/lib/session";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  const tokenType = request.nextUrl.searchParams.get("stytch_token_type");
  const token = request.nextUrl.searchParams.get("token");

  if (!token) {
    return NextResponse.redirect(new URL("/sign-in", request.url));
  }

  try {
    let sessionJwt: string;
    let memberId: string;
    let email: string;
    let organizationId: string;
    let name: string | null;

    if (tokenType === "sso") {
      const authRes = await stytchClient.sso.authenticate({
        sso_token: token,
        session_duration_minutes: SESSION_DURATION_MINUTES,
      });
      sessionJwt = authRes.session_jwt;
      memberId = authRes.member.member_id;
      email = authRes.member.email_address;
      organizationId = authRes.member.organization_id;
      name = authRes.member.name || null;
    } else {
      const authRes = await stytchClient.magicLinks.authenticate({
        magic_links_token: token,
        session_duration_minutes: SESSION_DURATION_MINUTES,
      });
      sessionJwt = authRes.session_jwt;
      memberId = authRes.member.member_id;
      email = authRes.member.email_address;
      organizationId = authRes.member.organization_id;
      name = authRes.member.name || null;
    }

    // The local User row (and its role) is created up front when an admin
    // provisions the account (see src/app/systems/users/actions.ts) — this
    // just keeps name/email in sync with whatever's authoritative in
    // Stytch. Role is never touched here; it's local-only.
    await prisma.user.updateMany({
      where: { id: memberId },
      data: { email, name, organizationId },
    });

    await setSessionCookie(sessionJwt);
    return NextResponse.redirect(new URL("/systems", request.url));
  } catch (error) {
    console.error("Stytch callback authentication failed", error);
    return NextResponse.redirect(new URL("/sign-in", request.url));
  }
}
