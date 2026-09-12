"use server";

import { headers } from "next/headers";
import { prisma } from "@/lib/prisma";
import { stytchClient } from "@/lib/stytch";

function currentOrigin(host: string) {
  const isLocal = host.startsWith("localhost") || host.startsWith("127.0.0.1");
  return `${isLocal ? "http" : "https"}://${host}`;
}

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
