"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { stytchClient, ssoStartUrl } from "@/lib/stytch";
import { currentOrigin } from "@/lib/url";

export async function sendMagicLink(formData: FormData) {
  const email = String(formData.get("email") ?? "")
    .trim()
    .toLowerCase();
  if (!email) {
    throw new Error("Email is required");
  }

  // Sign-in is admin-provisioned (see /systems/users) — if there's no
  // local User row for this email, nobody has invited them yet. We don't
  // reveal that distinction to the caller (same UI response either way),
  // matching the same no-user-enumeration property the old Auth.js flow had.
  const user = await prisma.user.findFirst({ where: { email } });
  if (!user) {
    return;
  }

  const host = (await headers()).get("host")!;
  const callbackUrl = `${currentOrigin(host)}/auth/confirm`;

  await stytchClient.magicLinks.email.loginOrSignup({
    email_address: email,
    organization_id: user.organizationId,
    login_redirect_url: callbackUrl,
    signup_redirect_url: callbackUrl,
  });
}

export async function startSsoLogin(formData: FormData) {
  const email = String(formData.get("email") ?? "")
    .trim()
    .toLowerCase();
  if (!email) {
    throw new Error("Email is required");
  }

  const host = (await headers()).get("host")!;
  const redirectDomain = currentOrigin(host);

  const user = await prisma.user.findFirst({ where: { email } });
  if (user) {
    const { saml_connections, oidc_connections } = await stytchClient.sso.getConnections({
      organization_id: user.organizationId,
    });
    const connection =
      saml_connections.find((c) => c.status === "active") ??
      oidc_connections.find((c) => c.status === "active");

    if (connection) {
      redirect(ssoStartUrl(connection.connection_id, redirectDomain));
    }
  }

  // Same email either resolved to no user or to a user whose org has no
  // active SSO connection — one generic outcome either way, no enumeration.
  redirect("/sign-in?sso=unavailable");
}
