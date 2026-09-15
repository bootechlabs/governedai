// One-time data migration: converts each existing RiskClassification's old
// `triggeredRegulations` enum array into RiskClassificationRegulation join
// rows against the RegulationDefinition rows seeded by prisma/seed.ts.
// Run once, after `prisma migrate deploy` and `pnpm run db:seed`, via:
//   pnpm exec tsx prisma/backfill-regulations.ts
// Idempotent — re-running is safe (upserts by the unique
// [riskClassificationId, regulationId] pair) but should only be needed
// once per environment (local, then production).
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const regulations = await prisma.regulationDefinition.findMany({
    select: { id: true, code: true },
  });
  const regulationIdByCode = new Map(regulations.map((r) => [r.code, r.id]));

  const classifications = await prisma.riskClassification.findMany({
    select: { id: true, triggeredRegulations: true },
  });

  let migrated = 0;
  let skipped = 0;
  for (const classification of classifications) {
    for (const code of classification.triggeredRegulations) {
      const regulationId = regulationIdByCode.get(code);
      if (!regulationId) {
        console.warn(`No RegulationDefinition found for legacy code "${code}" — skipping`);
        skipped++;
        continue;
      }
      await prisma.riskClassificationRegulation.upsert({
        where: {
          riskClassificationId_regulationId: {
            riskClassificationId: classification.id,
            regulationId,
          },
        },
        update: {},
        create: { riskClassificationId: classification.id, regulationId },
      });
      migrated++;
    }
  }

  console.log(
    `Backfilled ${migrated} RiskClassificationRegulation row(s) across ${classifications.length} RiskClassification(s)` +
      (skipped > 0 ? ` — ${skipped} skipped (no matching RegulationDefinition)` : ""),
  );
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
