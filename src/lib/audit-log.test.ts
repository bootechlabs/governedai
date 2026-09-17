import { describe, it, expect, beforeEach, vi } from "vitest";
import { createHash } from "crypto";

const GENESIS_HASH = "0".repeat(64);

// Pure re-implementation of computeEntryHash's algorithm, kept in sync by
// the tests below asserting against real logAuditEntry/verifyAuditChain
// output rather than this copy independently — this is just the fixture
// builder, not a second source of truth for the hashing scheme.
function hashOf(input: {
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

// In-memory fake of the two Prisma calls verifyAuditChain/logAuditEntry
// need, so this stays a fast unit test rather than needing a real DB.
const rows: Array<{
  id: string;
  aiSystemId: string;
  actorId: string;
  action: string;
  detail: unknown;
  occurredAt: Date;
  previousHash: string | null;
  hash: string | null;
}> = [];

vi.mock("@/lib/prisma", () => ({
  prisma: {
    auditLogEntry: {
      findFirst: vi.fn(async ({ where }: { where: { aiSystemId: string } }) => {
        const matches = rows
          .filter((r) => r.aiSystemId === where.aiSystemId)
          .sort((a, b) => b.occurredAt.getTime() - a.occurredAt.getTime() || b.id.localeCompare(a.id));
        return matches[0] ?? null;
      }),
      findMany: vi.fn(async ({ where }: { where: { aiSystemId: string } }) => {
        return rows
          .filter((r) => r.aiSystemId === where.aiSystemId)
          .sort((a, b) => a.occurredAt.getTime() - b.occurredAt.getTime() || a.id.localeCompare(b.id));
      }),
      create: vi.fn(async ({ data }: { data: Omit<(typeof rows)[number], "id"> }) => {
        // Real Prisma auto-generates id via @default(cuid()) — this fake
        // needs to do the same, since logAuditEntry never supplies one.
        const row = { id: `entry_${rows.length + 1}`, ...data };
        rows.push(row);
        return row;
      }),
    },
  },
}));

const { logAuditEntry, verifyAuditChain } = await import("./audit-log");

describe("audit log hash chaining", () => {
  beforeEach(() => {
    rows.length = 0;
  });

  it("chains the first entry for a system from the genesis hash", async () => {
    const entry = await logAuditEntry({
      aiSystemId: "system_1",
      actorId: "user_1",
      action: "system_created",
      detail: { name: "Test" },
    });
    expect(entry.previousHash).toBe(GENESIS_HASH);
    expect(entry.hash).toBe(
      hashOf({
        previousHash: GENESIS_HASH,
        aiSystemId: "system_1",
        actorId: "user_1",
        action: "system_created",
        detail: { name: "Test" },
        occurredAt: entry.occurredAt,
      }),
    );
  });

  it("chains a second entry from the first entry's hash", async () => {
    const first = await logAuditEntry({
      aiSystemId: "system_1",
      actorId: "user_1",
      action: "system_created",
      detail: {},
    });
    const second = await logAuditEntry({
      aiSystemId: "system_1",
      actorId: "user_1",
      action: "evidence_attached",
      detail: {},
    });
    expect(second.previousHash).toBe(first.hash);
  });

  it("keeps separate systems on separate chains", async () => {
    const a = await logAuditEntry({ aiSystemId: "system_a", actorId: "user_1", action: "x", detail: {} });
    const b = await logAuditEntry({ aiSystemId: "system_b", actorId: "user_1", action: "y", detail: {} });
    expect(a.previousHash).toBe(GENESIS_HASH);
    expect(b.previousHash).toBe(GENESIS_HASH);
  });

  it("verifies an untampered chain as intact", async () => {
    await logAuditEntry({ aiSystemId: "system_1", actorId: "user_1", action: "a", detail: {} });
    await logAuditEntry({ aiSystemId: "system_1", actorId: "user_1", action: "b", detail: {} });
    await logAuditEntry({ aiSystemId: "system_1", actorId: "user_1", action: "c", detail: {} });

    const result = await verifyAuditChain("system_1");
    expect(result).toEqual({ verified: true, entryCount: 3, brokenAtId: null });
  });

  it("detects tampering with a historical entry's content", async () => {
    await logAuditEntry({ aiSystemId: "system_1", actorId: "user_1", action: "a", detail: {} });
    const second = await logAuditEntry({ aiSystemId: "system_1", actorId: "user_1", action: "b", detail: {} });
    await logAuditEntry({ aiSystemId: "system_1", actorId: "user_1", action: "c", detail: {} });

    // Simulate exactly what "immutable by convention" is meant to
    // prevent — a direct mutation bypassing logAuditEntry.
    const row = rows.find((r) => r.id === second.id)!;
    row.action = "tampered_action";

    const result = await verifyAuditChain("system_1");
    expect(result.verified).toBe(false);
    expect(result.brokenAtId).toBe(second.id);
  });

  it("treats an un-backfilled legacy entry (no hash) as unverifiable, not silently valid", async () => {
    rows.push({
      id: "legacy_1",
      aiSystemId: "system_1",
      actorId: "user_1",
      action: "legacy_action",
      detail: null,
      occurredAt: new Date("2020-01-01"),
      previousHash: null,
      hash: null,
    });

    const result = await verifyAuditChain("system_1");
    expect(result.verified).toBe(false);
    expect(result.brokenAtId).toBe("legacy_1");
  });
});
