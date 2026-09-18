import { describe, it, expect, beforeEach, vi } from "vitest";
import { needsRecertification } from "./workflow";

// Fake DB that (1) honors `where` and (2) normalizes json the way Postgres jsonb
// does — reordering object keys by length then bytewise. The audit hash chain
// once shipped broken because a fake didn't do this (see audit-log.test.ts).
type Row = Record<string, unknown>;

function jsonbNormalize(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(jsonbNormalize);
  if (value !== null && typeof value === "object") {
    const source = value as Record<string, unknown>;
    return Object.fromEntries(
      Object.keys(source)
        .sort((a, b) => a.length - b.length || (a < b ? -1 : a > b ? 1 : 0))
        .map((key) => [key, jsonbNormalize(source[key])]),
    );
  }
  return value;
}

function matches(row: Row, where: Row | undefined): boolean {
  if (!where) return true;
  return Object.entries(where).every(([key, expected]) => {
    const actual = row[key];
    if (expected !== null && typeof expected === "object" && !(expected instanceof Date) && "not" in expected) {
      return actual !== (expected as { not: unknown }).not;
    }
    return actual === expected;
  });
}

const db = {
  organizations: [] as Row[],
  users: [] as Row[],
  systems: [] as Row[],
  updates: [] as Row[],
  reviews: [] as Row[],
  audit: [] as Row[],
  changes: [] as Row[],
};

vi.mock("@/lib/prisma", () => ({
  prisma: {
    organization: {
      findUniqueOrThrow: vi.fn(async ({ where }: { where: Row }) => db.organizations.find((o) => matches(o, where))!),
    },
    user: { findFirst: vi.fn(async ({ where }: { where: Row }) => db.users.find((u) => matches(u, where)) ?? null) },
    aiSystem: { findMany: vi.fn(async ({ where }: { where: Row }) => db.systems.filter((s) => matches(s, where))) },
    regulatoryUpdate: {
      findFirst: vi.fn(async ({ where }: { where: Row }) => db.updates.find((u) => matches(u, where)) ?? null),
      findMany: vi.fn(async ({ where }: { where: Row }) => db.updates.filter((u) => matches(u, where))),
    },
    regulatoryUpdateReview: {
      findMany: vi.fn(async ({ where }: { where: Row }) => db.reviews.filter((r) => matches(r, where))),
      upsert: vi.fn(async ({ where, create, update }: { where: { updateId_organizationId: Row }; create: Row; update: Row }) => {
        const key = where.updateId_organizationId;
        const existing = db.reviews.find((r) => r.updateId === key.updateId && r.organizationId === key.organizationId);
        if (existing) return Object.assign(existing, update);
        db.reviews.push({ ...create });
        return create;
      }),
    },
    auditLogEntry: {
      findFirst: vi.fn(async ({ where }: { where: { aiSystemId: string } }) => {
        const rows = db.audit
          .filter((r) => r.aiSystemId === where.aiSystemId)
          .sort((a, b) => (b.occurredAt as Date).getTime() - (a.occurredAt as Date).getTime() || String(b.id).localeCompare(String(a.id)));
        return rows[0] ?? null;
      }),
      findMany: vi.fn(async ({ where }: { where: { aiSystemId: string } }) =>
        db.audit
          .filter((r) => r.aiSystemId === where.aiSystemId)
          .sort((a, b) => (a.occurredAt as Date).getTime() - (b.occurredAt as Date).getTime() || String(a.id).localeCompare(String(b.id))),
      ),
      create: vi.fn(async ({ data }: { data: Row }) => {
        const row = { id: `audit_${db.audit.length + 1}`, ...data, detail: jsonbNormalize(data.detail) };
        db.audit.push(row);
        return row;
      }),
    },
    changeEvent: {
      create: vi.fn(async ({ data }: { data: Row }) => {
        const row = { id: `chg_${db.changes.length + 1}`, occurredAt: new Date(), ...data };
        db.changes.push(row);
        return row;
      }),
    },
  },
}));

// Distinct, increasing timestamps so chain ordering is deterministic.
vi.useFakeTimers();

const { recordRegulatoryReview, flagAffectedForRecertification, loadOrgUpdate } = await import("./regulatory-updates-db");
const { verifyAuditChain } = await import("./audit-log");

const AL = { regulation: { id: "reg_al", code: "AL_SB63", label: "Alabama SB 63", citation: null, effectiveDate: null } };

function sys(id: string, organizationId: string, over: Row = {}): Row {
  return {
    id,
    name: id,
    organizationId,
    archivedAt: null,
    riskClassification: { useCaseTemplate: "PRIOR_AUTH_UM", triggeredRegulationRows: [{ regulationId: "reg_al" }] },
    ...over,
  };
}

function upd(id: string, over: Row = {}): Row {
  return {
    id, slug: `${id}-slug`, title: `Title ${id}`, summary: "s", whyItMatters: null, kind: "ENACTED",
    sourceName: "n", sourceUrl: "https://a.gov", eventDate: new Date("2026-04-01"), effectiveDate: null,
    actionRequired: false, publishedAt: new Date("2026-04-02"), revisedAt: null, revisionNote: null,
    archivedAt: null, vertical: null, useCaseTemplates: [], regulations: [AL], ...over,
  };
}

async function doReview(orgId: string, over: Partial<Parameters<typeof recordRegulatoryReview>[0]> = {}) {
  vi.advanceTimersByTime(1000);
  return recordRegulatoryReview({
    organizationId: orgId,
    actorId: `user_${orgId}`,
    updateId: "u1",
    outcome: "NO_ACTION_NEEDED",
    note: null,
    ...over,
  });
}

beforeEach(() => {
  vi.setSystemTime(new Date("2026-09-01T00:00:00Z"));
  db.organizations = [
    { id: "orgA", vertical: "Payer" },
    { id: "orgB", vertical: "Provider" },
  ];
  db.users = [{ id: "user_orgA", organizationId: "orgA", name: "Ada Admin", email: "a@x.invalid" }];
  db.systems = [
    sys("a1", "orgA"),
    sys("a2", "orgA"),
    sys("a-unmatched", "orgA", { riskClassification: { useCaseTemplate: "PATIENT_CHATBOT", triggeredRegulationRows: [] } }),
    sys("a-unassessed", "orgA", { riskClassification: null }),
    sys("b1", "orgB"),
  ];
  db.updates = [upd("u1")];
  db.reviews = [];
  db.audit = [];
  db.changes = [];
});

describe("recordRegulatoryReview: audit trail", () => {
  it("writes one entry per affected active system, with the frozen match reasons", async () => {
    const result = await doReview("orgA", { outcome: "REASSESSMENT_FLAGGED", note: "Look at claims triage" });
    expect(result.auditedSystemCount).toBe(2);
    expect(db.audit.map((e) => e.aiSystemId).sort()).toEqual(["a1", "a2"]);
    expect(db.audit[0]).toMatchObject({ action: "regulatory_update_reviewed", actorId: "user_orgA" });
    expect(db.audit[0].detail).toMatchObject({
      updateId: "u1",
      slug: "u1-slug",
      title: "Title u1",
      outcome: "REASSESSMENT_FLAGGED",
      matchReasons: ["Alabama SB 63 is triggered for this system"],
    });
    // Nothing for unmatched, unassessed, or another org's systems.
    expect(db.audit.some((e) => ["a-unmatched", "a-unassessed", "b1"].includes(e.aiSystemId as string))).toBe(false);
  });

  it("writes NO audit entries when nothing is affected, and the review row stands alone", async () => {
    db.systems = [sys("a-unmatched", "orgA", { riskClassification: { useCaseTemplate: "PATIENT_CHATBOT", triggeredRegulationRows: [] } })];
    const result = await doReview("orgA");
    expect(result.auditedSystemCount).toBe(0);
    expect(db.audit).toEqual([]);
    expect(db.reviews).toHaveLength(1);
  });

  it("keeps verifyAuditChain passing across several review entries with multi-key detail", async () => {
    await doReview("orgA", { outcome: "NO_ACTION_NEEDED" });
    await doReview("orgA", { outcome: "REASSESSMENT_FLAGGED", note: "second look" });
    await doReview("orgA", { outcome: "NO_ACTION_NEEDED" });
    // The fake reordered detail keys like jsonb; the hash must be insensitive to that.
    const detailKeys = Object.keys(db.audit[0].detail as object);
    expect(detailKeys).not.toEqual(["updateId", "slug", "title", "outcome", "matchReasons"]);

    for (const id of ["a1", "a2"]) {
      const verification = await verifyAuditChain(id);
      expect(verification).toMatchObject({ verified: true, entryCount: 3, brokenAtId: null });
    }
  });

  it("detects tampering with a review entry", async () => {
    await doReview("orgA");
    (db.audit.find((e) => e.aiSystemId === "a1")!.detail as Row).outcome = "REASSESSMENT_FLAGGED";
    expect((await verifyAuditChain("a1")).verified).toBe(false);
    expect((await verifyAuditChain("a2")).verified).toBe(true);
  });
});

describe("recordRegulatoryReview: the review row", () => {
  it("keeps one row per (update, org) and overwrites on re-review", async () => {
    await doReview("orgA", { outcome: "NO_ACTION_NEEDED" });
    await doReview("orgA", { outcome: "REASSESSMENT_FLAGGED", note: "changed my mind" });
    expect(db.reviews).toHaveLength(1);
    expect(db.reviews[0]).toMatchObject({ outcome: "REASSESSMENT_FLAGGED", note: "changed my mind", organizationId: "orgA" });
  });

  it("goes stale on revision and is current again after a fresh review", async () => {
    await doReview("orgA");
    expect((await loadOrgUpdate("orgA", "u1"))!.item.reviewState).toBe("reviewed");

    vi.advanceTimersByTime(60_000);
    db.updates = [upd("u1", { revisedAt: new Date(), revisionNote: "Corrected effective date" })];
    const stale = (await loadOrgUpdate("orgA", "u1"))!.item;
    expect(stale).toMatchObject({ reviewState: "stale", needsReview: true });

    await doReview("orgA");
    expect((await loadOrgUpdate("orgA", "u1"))!.item.reviewState).toBe("reviewed");
  });

  it("shows the reviewer's name, looked up within the org", async () => {
    await doReview("orgA");
    expect((await loadOrgUpdate("orgA", "u1"))!.item.review?.reviewedByName).toBe("Ada Admin");
  });

  it("rejects a bad outcome or oversized note before writing anything", async () => {
    await expect(doReview("orgA", { outcome: "NOPE" as never })).rejects.toThrow("outcome");
    await expect(doReview("orgA", { note: "x".repeat(2001) })).rejects.toThrow("2000");
    expect(db.audit).toEqual([]);
    expect(db.reviews).toEqual([]);
  });
});

describe("recordRegulatoryReview: tenancy and visibility", () => {
  it("one org's review never marks the update reviewed for another", async () => {
    db.organizations.push({ id: "orgC", vertical: "Payer" });
    db.systems.push(sys("c1", "orgC"));
    await doReview("orgA");
    expect((await loadOrgUpdate("orgC", "u1"))!.item).toMatchObject({ reviewState: "unreviewed", review: null });
    await doReview("orgC");
    expect(db.reviews).toHaveLength(2);
    // Each org's entries went only to its own systems.
    expect(db.audit.filter((e) => e.actorId === "user_orgC").map((e) => e.aiSystemId)).toEqual(["c1"]);
    expect(db.audit.filter((e) => e.actorId === "user_orgA").map((e) => e.aiSystemId).sort()).toEqual(["a1", "a2"]);
  });

  it.each([
    ["a draft", { publishedAt: null }],
    ["an archived update", { archivedAt: new Date("2026-06-01") }],
    ["an update scoped to another vertical", { vertical: "Provider" }],
  ])("refuses to record a review for %s, writing nothing", async (_label, over) => {
    db.updates = [upd("u1", over)];
    await expect(doReview("orgA")).rejects.toThrow("not found");
    expect(db.audit).toEqual([]);
    expect(db.reviews).toEqual([]);
  });

  it("refuses an unknown update id", async () => {
    await expect(doReview("orgA", { updateId: "ghost" })).rejects.toThrow("not found");
  });
});

describe("flagAffectedForRecertification", () => {
  it("writes a ChangeEvent and an audit entry per affected system, and re-opens recertification", async () => {
    const decidedAt = new Date("2026-08-01T00:00:00Z");
    vi.advanceTimersByTime(1000);
    const result = await flagAffectedForRecertification({ organizationId: "orgA", actorId: "user_orgA", updateId: "u1" });
    expect(result.flaggedSystemCount).toBe(2);

    expect(db.changes.map((c) => c.aiSystemId).sort()).toEqual(["a1", "a2"]);
    expect(db.changes[0]).toMatchObject({ field: "regulatory_update", beforeValue: null, afterValue: "u1-slug", actorId: "user_orgA" });
    expect(db.audit.every((e) => e.action === "regulatory_update_flagged")).toBe(true);

    // The existing computed logic reads only the change timestamp vs. the last decision.
    const latestChangeAt = db.changes[0].occurredAt as Date;
    expect(needsRecertification(latestChangeAt, [{ decidedAt }])).toBe(true);
    expect(needsRecertification(latestChangeAt, [{ decidedAt: null }])).toBe(false);
    expect((await verifyAuditChain("a1")).verified).toBe(true);
  });

  it("does nothing for an update that affects no systems or another org's data", async () => {
    db.updates = [upd("u1", { regulations: [], useCaseTemplates: [] })];
    const result = await flagAffectedForRecertification({ organizationId: "orgA", actorId: "user_orgA", updateId: "u1" });
    expect(result.flaggedSystemCount).toBe(0);
    expect(db.changes).toEqual([]);
    expect(db.audit).toEqual([]);
  });
});
