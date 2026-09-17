import { createHash } from "crypto";
import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";

// Genesis hash for the first entry in a system's chain — 64 zeros, same
// length as a real sha256 hex digest so nothing downstream has to special
// case it.
const GENESIS_HASH = "0".repeat(64);

function computeEntryHash(input: {
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
        detail: input.detail ?? null,
        occurredAt: input.occurredAt.toISOString(),
      }),
    )
    .digest("hex");
}

// Every mutation in src/app/systems/actions.ts writes one of these —
// centralized so the shape (and the "insert-only, never edit" contract
// from the schema comment) stays consistent as more actions are added.
//
// Slice 16 — each system's entries are sequentially hash-chained
// (previousHash + this entry's content -> hash), so altering or deleting
// a past row breaks every hash after it; see verifyAuditChain below.
// Known limitation: two truly concurrent writes for the same system could
// both read the same "previous" hash and fork the chain — acceptable at
// this app's human-paced, one-admin-at-a-time usage, not a cryptographic
// guarantee under concurrent writes.
export async function logAuditEntry(entry: {
  aiSystemId: string;
  actorId: string;
  action: string;
  detail: Prisma.InputJsonValue;
}) {
  const last = await prisma.auditLogEntry.findFirst({
    where: { aiSystemId: entry.aiSystemId },
    orderBy: [{ occurredAt: "desc" }, { id: "desc" }],
    select: { hash: true },
  });
  const previousHash = last?.hash ?? GENESIS_HASH;
  const occurredAt = new Date();
  const hash = computeEntryHash({ ...entry, previousHash, occurredAt });

  return prisma.auditLogEntry.create({
    data: { ...entry, occurredAt, previousHash, hash },
  });
}

export interface AuditChainVerification {
  verified: boolean;
  entryCount: number;
  brokenAtId: string | null;
}

// Recomputes the chain from scratch and compares against the stored
// hashes — this is what makes "tamper-evident" a real, checkable claim
// rather than a stated line in a report. Entries with no hash (rows from
// before this shipped, not yet backfilled) are treated as unverifiable
// rather than broken.
export async function verifyAuditChain(aiSystemId: string): Promise<AuditChainVerification> {
  const entries = await prisma.auditLogEntry.findMany({
    where: { aiSystemId },
    orderBy: [{ occurredAt: "asc" }, { id: "asc" }],
  });

  let previousHash = GENESIS_HASH;
  for (const entry of entries) {
    if (!entry.hash) {
      return { verified: false, entryCount: entries.length, brokenAtId: entry.id };
    }
    const expected = computeEntryHash({
      previousHash,
      aiSystemId: entry.aiSystemId,
      actorId: entry.actorId,
      action: entry.action,
      detail: entry.detail,
      occurredAt: entry.occurredAt,
    });
    if (expected !== entry.hash) {
      return { verified: false, entryCount: entries.length, brokenAtId: entry.id };
    }
    previousHash = entry.hash;
  }

  return { verified: true, entryCount: entries.length, brokenAtId: null };
}
