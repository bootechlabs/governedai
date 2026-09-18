import { createHash } from "crypto";

// Pure hashing for the audit-log chain (see src/lib/audit-log.ts). Kept free
// of any database import so the app and prisma/backfill-audit-hashes.ts share
// exactly one implementation — two copies is how the scheme could silently
// diverge.

// Genesis hash for the first entry in a system's chain — 64 zeros, same
// length as a real sha256 hex digest so nothing downstream special-cases it.
export const GENESIS_HASH = "0".repeat(64);

// Recursively sorts object keys. AuditLogEntry.detail is stored as Postgres
// jsonb, which does NOT preserve key order (it reorders by key length, then
// bytewise), so the object we hash at write time and the object read back at
// verify time have the same content but different key order. Hashing a
// key-order-independent serialization is what makes the two agree. Arrays
// keep their order (jsonb preserves it).
function sortKeys(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sortKeys);
  if (value !== null && typeof value === "object") {
    const source = value as Record<string, unknown>;
    return Object.fromEntries(
      Object.keys(source)
        .sort()
        .map((key) => [key, sortKeys(source[key])]),
    );
  }
  return value;
}

export function computeEntryHash(input: {
  previousHash: string;
  aiSystemId: string;
  actorId: string;
  action: string;
  detail: unknown;
  occurredAt: Date;
}): string {
  return createHash("sha256")
    .update(
      JSON.stringify({
        previousHash: input.previousHash,
        aiSystemId: input.aiSystemId,
        actorId: input.actorId,
        action: input.action,
        detail: sortKeys(input.detail ?? null),
        occurredAt: input.occurredAt.toISOString(),
      }),
    )
    .digest("hex");
}
