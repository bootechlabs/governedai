import { describe, it, expect, beforeEach, vi } from "vitest";

// A fake DB that HONORS `where`: if the implementation ever drops the
// organizationId / published / archived filter, these tests see the leak
// instead of passing vacuously against pre-filtered data.
type Row = Record<string, unknown>;

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
  systems: [] as Row[],
  updates: [] as Row[],
  reviews: [] as Row[],
};

vi.mock("@/lib/prisma", () => ({
  prisma: {
    organization: {
      findUniqueOrThrow: vi.fn(async ({ where }: { where: Row }) => {
        const row = db.organizations.find((o) => matches(o, where));
        if (!row) throw new Error("not found");
        return row;
      }),
    },
    aiSystem: {
      findMany: vi.fn(async ({ where }: { where: Row }) => db.systems.filter((s) => matches(s, where))),
    },
    regulatoryUpdate: {
      findMany: vi.fn(async ({ where }: { where: Row }) => db.updates.filter((u) => matches(u, where))),
      findFirst: vi.fn(async ({ where }: { where: Row }) => db.updates.find((u) => matches(u, where)) ?? null),
    },
    regulatoryUpdateReview: {
      findMany: vi.fn(async ({ where }: { where: Row }) => db.reviews.filter((r) => matches(r, where))),
    },
  },
}));

const { loadOrgFeed, loadOrgUpdate } = await import("./regulatory-updates-db");

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
    id,
    slug: id,
    title: id,
    summary: "s",
    whyItMatters: null,
    kind: "ENACTED",
    sourceName: "n",
    sourceUrl: "https://a.gov",
    eventDate: new Date("2026-04-01"),
    effectiveDate: null,
    actionRequired: false,
    publishedAt: new Date("2026-04-02"),
    revisedAt: null,
    revisionNote: null,
    archivedAt: null,
    vertical: null,
    useCaseTemplates: [],
    regulations: [AL],
    ...over,
  };
}

function review(updateId: string, organizationId: string, reviewedAt = "2026-05-01"): Row {
  return {
    updateId,
    organizationId,
    outcome: "NO_ACTION_NEEDED",
    note: null,
    reviewedAt: new Date(reviewedAt),
    reviewedById: "u",
  };
}

beforeEach(() => {
  db.organizations = [
    { id: "orgA", vertical: "Payer" },
    { id: "orgB", vertical: "Provider" },
  ];
  db.systems = [sys("a1", "orgA"), sys("a2", "orgA"), sys("b1", "orgB")];
  db.updates = [upd("u1")];
  db.reviews = [];
});

describe("published-only", () => {
  it("never returns drafts or archived updates, in the feed or by id", async () => {
    db.updates = [
      upd("live"),
      upd("draft", { publishedAt: null }),
      upd("archived", { archivedAt: new Date("2026-06-01") }),
    ];
    const { items } = await loadOrgFeed("orgA");
    expect(items.map((i) => i.id)).toEqual(["live"]);
    expect(await loadOrgUpdate("orgA", "draft")).toBeNull();
    expect(await loadOrgUpdate("orgA", "archived")).toBeNull();
    expect((await loadOrgUpdate("orgA", "live"))?.item.id).toBe("live");
  });
});

describe("tenancy", () => {
  it("only matches the caller's own systems", async () => {
    const a = await loadOrgFeed("orgA");
    expect(a.items[0].affected.map((s) => s.id).sort()).toEqual(["a1", "a2"]);
    const b = await loadOrgFeed("orgB");
    expect(b.items[0].affected.map((s) => s.id)).toEqual(["b1"]);
  });

  it("one org's review never marks the update reviewed for another", async () => {
    db.reviews = [review("u1", "orgA")];
    expect((await loadOrgFeed("orgA")).items[0]).toMatchObject({ reviewState: "reviewed", needsReview: false });
    expect((await loadOrgFeed("orgB")).items[0]).toMatchObject({ reviewState: "unreviewed", needsReview: true, review: null });
    expect((await loadOrgUpdate("orgB", "u1"))?.item.review).toBeNull();
  });

  it("counts unassessed systems per org, active only", async () => {
    db.systems = [
      sys("a1", "orgA", { riskClassification: null }),
      sys("a2", "orgA", { riskClassification: null, archivedAt: new Date() }),
      sys("b1", "orgB", { riskClassification: null }),
      sys("b2", "orgB", { riskClassification: null }),
    ];
    expect((await loadOrgFeed("orgA")).unassessedCount).toBe(1);
    expect((await loadOrgFeed("orgB")).unassessedCount).toBe(2);
    expect((await loadOrgUpdate("orgA", "u1"))?.unassessedCount).toBe(1);
  });
});

describe("vertical scoping", () => {
  it("hides a vertical-scoped update from orgs in another vertical", async () => {
    db.updates = [upd("payer-only", { vertical: "payer" })];
    expect((await loadOrgFeed("orgA")).items.map((i) => i.id)).toEqual(["payer-only"]);
    expect((await loadOrgFeed("orgB")).items).toEqual([]);
    expect(await loadOrgUpdate("orgB", "payer-only")).toBeNull();
  });
});

describe("staleness", () => {
  it("a revision after the org's review puts the update back in needs-review", async () => {
    db.updates = [upd("u1", { revisedAt: new Date("2026-06-01"), revisionNote: "Corrected date" })];
    db.reviews = [review("u1", "orgA", "2026-05-01")];
    const item = (await loadOrgFeed("orgA")).items[0];
    expect(item).toMatchObject({ reviewState: "stale", needsReview: true, revisionNote: "Corrected date" });
  });

  it("a review after the revision stands", async () => {
    db.updates = [upd("u1", { revisedAt: new Date("2026-06-01"), revisionNote: "x" })];
    db.reviews = [review("u1", "orgA", "2026-06-02")];
    expect((await loadOrgFeed("orgA")).items[0].reviewState).toBe("reviewed");
  });

  it("an unaffected update never needs review", async () => {
    db.updates = [upd("u1", { regulations: [], useCaseTemplates: [] })];
    expect((await loadOrgFeed("orgA")).items[0]).toMatchObject({ affected: [], needsReview: false });
  });
});
