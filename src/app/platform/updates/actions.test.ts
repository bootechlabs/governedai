import { describe, it, expect, vi, beforeEach } from "vitest";

let isPlatformAdmin = true;
vi.mock("@/lib/current-user", () => ({
  getCurrentUser: async () => ({ id: "admin_1", isPlatformAdmin }),
}));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("next/navigation", () => ({ redirect: vi.fn() }));

const existing: Record<string, unknown> = {};
const prismaMock = {
  regulationDefinition: { findMany: vi.fn(async () => [{ id: "r1" }]) },
  regulatoryUpdate: {
    findUniqueOrThrow: vi.fn(async () => existing),
    findUnique: vi.fn(async () => null),
    create: vi.fn(async () => ({ id: "new_1" })),
    update: vi.fn(async (args: unknown) => args),
  },
  regulatoryUpdateRegulation: { deleteMany: vi.fn(async (args: unknown) => args) },
  $transaction: vi.fn(async (ops: unknown[]) => Promise.all(ops)),
};
vi.mock("@/lib/prisma", () => ({ prisma: prismaMock }));

const { createUpdate, saveUpdate, publishUpdate, unpublishUpdate, archiveUpdate } = await import("./actions");

function form(over: Record<string, string> = {}) {
  const f = new FormData();
  const base: Record<string, string> = {
    title: "T",
    summary: "S",
    kind: "GUIDANCE",
    sourceName: "Agency",
    sourceUrl: "https://example.gov/x",
    eventDate: "2026-09-01",
    ...over,
  };
  for (const [k, v] of Object.entries(base)) f.append(k, v);
  return f;
}

const draft = {
  id: "u1", slug: "u1", vertical: null, publishedAt: null, archivedAt: null,
  summary: "S", sourceName: "n", sourceUrl: "https://a.gov", kind: "GUIDANCE", eventDate: new Date(),
};

beforeEach(() => {
  isPlatformAdmin = true;
  vi.clearAllMocks();
  for (const key of Object.keys(existing)) delete existing[key];
  Object.assign(existing, draft);
});

describe("platform update actions", () => {
  it("are platform-admin only", async () => {
    isPlatformAdmin = false;
    await expect(createUpdate(form())).rejects.toThrow("Only platform admins");
    await expect(saveUpdate("u1", form())).rejects.toThrow("Only platform admins");
    await expect(publishUpdate("u1")).rejects.toThrow("Only platform admins");
    await expect(unpublishUpdate("u1")).rejects.toThrow("Only platform admins");
    await expect(archiveUpdate("u1")).rejects.toThrow("Only platform admins");
    expect(prismaMock.regulatoryUpdate.create).not.toHaveBeenCalled();
    expect(prismaMock.regulatoryUpdate.update).not.toHaveBeenCalled();
  });

  it("refuses an insecure source link before writing anything", async () => {
    await expect(createUpdate(form({ sourceUrl: "http://example.gov" }))).rejects.toThrow("https");
    expect(prismaMock.regulatoryUpdate.create).not.toHaveBeenCalled();
  });

  it("saves a draft edit without stamping a revision", async () => {
    await saveUpdate("u1", form());
    expect(prismaMock.$transaction).toHaveBeenCalled();
    const data = (prismaMock.regulatoryUpdate.update.mock.calls[0] as unknown as [{ data: Record<string, unknown> }])[0].data;
    expect(data).not.toHaveProperty("revisedAt");
  });

  it("refuses to edit a published update without a revision note, and stamps revisedAt with one", async () => {
    existing.publishedAt = new Date();
    await expect(saveUpdate("u1", form())).rejects.toThrow("revision note");
    expect(prismaMock.$transaction).not.toHaveBeenCalled();

    await saveUpdate("u1", form({ revisionNote: "Corrected effective date" }));
    const data = (prismaMock.regulatoryUpdate.update.mock.calls[0] as unknown as [{ data: Record<string, unknown> }])[0].data;
    expect(data.revisionNote).toBe("Corrected effective date");
    expect(data.revisedAt).toBeInstanceOf(Date);
  });

  it("won't edit or publish an archived update", async () => {
    existing.archivedAt = new Date();
    await expect(saveUpdate("u1", form())).rejects.toThrow("Archived");
    await expect(publishUpdate("u1")).rejects.toThrow("Archived");
  });

  it("publish requires a complete item and stamps publishedAt once", async () => {
    existing.sourceUrl = "http://insecure.example";
    await expect(publishUpdate("u1")).rejects.toThrow("https source link");
    expect(prismaMock.regulatoryUpdate.update).not.toHaveBeenCalled();

    existing.sourceUrl = "https://a.gov";
    await publishUpdate("u1");
    expect(prismaMock.regulatoryUpdate.update).toHaveBeenCalledTimes(1);

    existing.publishedAt = new Date();
    await publishUpdate("u1");
    expect(prismaMock.regulatoryUpdate.update).toHaveBeenCalledTimes(1);
  });
});
