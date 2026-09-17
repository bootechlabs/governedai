// One-time data migration: computes hash and previousHash retroactively
// for every existing AuditLogEntry row, per AiSystem, oldest first — see
// src/lib/audit-log.ts for the chaining scheme this establishes going
// forward. All the data needed (aiSystemId, actorId, action, detail,
// occurredAt) already exists on every historical row, so the full chain
// can be reconstructed exactly as if it had been chained from the start.
// Idempotent — skips any entry that already has a hash, so re-running
// (e.g. after a partial run) is safe. Run once per environment (local,
// then production), after `prisma migrate deploy`:
//   pnpm exec tsx prisma/backfill-audit-hashes.ts
import { PrismaClient } from "@prisma/client";
import { createHash } from "crypto";

const prisma = new PrismaClient();
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

async function main() {
  const systems = await prisma.aiSystem.findMany({ select: { id: true } });

  let chained = 0;
  let skipped = 0;
  for (const system of systems) {
    const entries = await prisma.auditLogEntry.findMany({
      where: { aiSystemId: system.id },
      orderBy: [{ occurredAt: "asc" }, { id: "asc" }],
    });

    let previousHash = GENESIS_HASH;
    for (const entry of entries) {
      if (entry.hash) {
        previousHash = entry.hash;
        skipped++;
        continue;
      }
      const hash = computeEntryHash({
        previousHash,
        aiSystemId: entry.aiSystemId,
        actorId: entry.actorId,
        action: entry.action,
        detail: entry.detail,
        occurredAt: entry.occurredAt,
      });
      await prisma.auditLogEntry.update({
        where: { id: entry.id },
        data: { previousHash, hash },
      });
      previousHash = hash;
      chained++;
    }
  }

  console.log(`Backfilled ${chained} entries across ${systems.length} systems (${skipped} already chained).`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
