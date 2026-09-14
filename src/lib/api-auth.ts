import { prisma } from "@/lib/prisma";
import { hashApiKey } from "@/lib/api-keys";

export class ApiAuthError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

// Every public API route calls this first. Looks up the key by its
// hash (never the plaintext), rejects revoked keys, and records
// last-used-at so a stale/forgotten key is visible in the admin UI.
export async function authenticateApiRequest(request: Request) {
  const header = request.headers.get("authorization") ?? "";
  const [scheme, token] = header.split(" ");
  if (scheme?.toLowerCase() !== "bearer" || !token) {
    throw new ApiAuthError("Missing or malformed Authorization header — expected 'Bearer <key>'", 401);
  }

  const apiKey = await prisma.apiKey.findUnique({ where: { keyHash: hashApiKey(token) } });
  if (!apiKey || apiKey.revokedAt) {
    throw new ApiAuthError("Invalid or revoked API key", 401);
  }

  await prisma.apiKey.update({
    where: { id: apiKey.id },
    data: { lastUsedAt: new Date() },
  });

  return apiKey;
}
