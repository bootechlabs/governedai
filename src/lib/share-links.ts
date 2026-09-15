import { randomBytes, createHash } from "crypto";
import { prisma } from "@/lib/prisma";

const TOKEN_PREFIX = "share_";
const DISPLAY_PREFIX_LENGTH = 12;

export function generateShareToken() {
  const secret = randomBytes(24).toString("base64url");
  const plaintext = `${TOKEN_PREFIX}${secret}`;
  return {
    plaintext,
    tokenPrefix: plaintext.slice(0, DISPLAY_PREFIX_LENGTH),
    tokenHash: hashShareToken(plaintext),
  };
}

export function hashShareToken(plaintext: string): string {
  return createHash("sha256").update(plaintext).digest("hex");
}

export const SHARE_LINK_DURATIONS_DAYS = [7, 30, 90] as const;

// Looks up a share link by its plaintext token, rejecting a revoked or
// expired one, and records the view. Returns null for every failure mode
// (not found, revoked, expired) — callers respond with a plain 404 either
// way, so there's nothing to distinguish and nothing to leak.
export async function resolveShareLink(token: string, viewerIp: string | null) {
  const shareLink = await prisma.shareLink.findUnique({
    where: { tokenHash: hashShareToken(token) },
  });
  if (!shareLink || shareLink.revokedAt || shareLink.expiresAt < new Date()) {
    return null;
  }

  await prisma.shareLinkView.create({
    data: { shareLinkId: shareLink.id, viewerIp },
  });

  return shareLink;
}
