import { randomBytes, createHash } from "crypto";

const KEY_PREFIX = "gai_";
// Chars shown in the UI to identify a key without exposing the secret —
// long enough to tell keys apart at a glance, short of the actual secret.
const DISPLAY_PREFIX_LENGTH = 12;

export function generateApiKey() {
  const secret = randomBytes(24).toString("base64url");
  const plaintext = `${KEY_PREFIX}${secret}`;
  return {
    plaintext,
    keyPrefix: plaintext.slice(0, DISPLAY_PREFIX_LENGTH),
    keyHash: hashApiKey(plaintext),
  };
}

export function hashApiKey(plaintext: string): string {
  return createHash("sha256").update(plaintext).digest("hex");
}
