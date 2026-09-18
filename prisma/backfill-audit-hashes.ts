// Computes hash and previousHash for AuditLogEntry rows, per AiSystem, oldest
// first — see src/lib/audit-log.ts for the chaining scheme. All the data
// needed (aiSystemId, actorId, action, detail, occurredAt) already exists on
// every historical row, so the full chain can be reconstructed exactly as if
// it had been chained from the start. Run after `prisma migrate deploy`:
//
//   pnpm exec tsx prisma/backfill-audit-hashes.ts            # chain rows that have no hash yet
//   pnpm exec tsx prisma/backfill-audit-hashes.ts --rehash   # recompute EVERY row's hash
//
// --rehash is needed once per environment after the scheme fix that made
// hashing independent of JSON key order (Postgres jsonb reorders keys, so the
// first version hashed a different string at verify time than at write time
// for any multi-key detail). It rewrites hashes, so it re-baselines the
// chain's tamper-evidence at the moment it runs — the same trust boundary the
// original backfill already had. Both modes are idempotent.
import { PrismaClient } from "@prisma/client";
import { GENESIS_HASH, computeEntryHash } from "../src/lib/audit-hash";

const prisma = new PrismaClient();
const rehash = process.argv.includes("--rehash");

async function main() {
  const systems = await prisma.aiSystem.findMany({ select: { id: true } });

  let written = 0;
  let changed = 0;
  let skipped = 0;
  for (const system of systems) {
    const entries = await prisma.auditLogEntry.findMany({
      where: { aiSystemId: system.id },
      orderBy: [{ occurredAt: "asc" }, { id: "asc" }],
    });

    let previousHash = GENESIS_HASH;
    for (const entry of entries) {
      if (entry.hash && !rehash) {
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
      if (hash !== entry.hash || previousHash !== entry.previousHash) {
        await prisma.auditLogEntry.update({
          where: { id: entry.id },
          data: { previousHash, hash },
        });
        changed++;
      }
      previousHash = hash;
      written++;
    }
  }

  console.log(
    `${rehash ? "Rehashed" : "Backfilled"} ${written} entries across ${systems.length} systems ` +
      `(${changed} rewritten, ${skipped} already chained and left alone).`,
  );
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
