import { describe, it, expect } from "vitest";
import { slugifyFileName, buildAuditCsv, buildAuditPdf } from "./audit-export";
import type { AuditLogEntry, User } from "@prisma/client";

function fakeUser(overrides: Partial<User> = {}): User {
  return {
    id: "user_1",
    organizationId: "org_1",
    name: "Test User",
    email: "test@example.com",
    role: "ADMIN",
    isPlatformAdmin: false,
    createdAt: new Date("2026-01-01T00:00:00.000Z"),
    ...overrides,
  };
}

function fakeEntry(
  overrides: Partial<AuditLogEntry & { actor: User }> = {},
): AuditLogEntry & { actor: User } {
  return {
    id: "entry_1",
    action: "system_created",
    detail: { name: "Test System" },
    occurredAt: new Date("2026-01-02T00:00:00.000Z"),
    aiSystemId: "system_1",
    actorId: "user_1",
    actor: fakeUser(),
    ...overrides,
  };
}

describe("slugifyFileName", () => {
  it("lowercases and hyphenates", () => {
    expect(slugifyFileName("Ambient Scribe Assistant")).toBe("ambient-scribe-assistant");
  });

  it("strips non-alphanumeric characters", () => {
    expect(slugifyFileName("Claims & Triage (v2)!")).toBe("claims-triage-v2");
  });

  it("trims leading/trailing hyphens", () => {
    expect(slugifyFileName("  --Weird Name--  ")).toBe("weird-name");
  });
});

describe("buildAuditCsv", () => {
  it("returns just the header for no entries", () => {
    expect(buildAuditCsv([])).toBe("Timestamp,Actor,Action,Detail\n");
  });

  it("uses the actor's name when present, falling back to email", () => {
    const csv = buildAuditCsv([
      fakeEntry({ actor: fakeUser({ name: null, email: "noname@example.com" }) }),
    ]);
    expect(csv).toContain("noname@example.com");
  });

  it("quotes fields containing commas, quotes, or newlines (real detail JSON always has commas)", () => {
    const csv = buildAuditCsv([fakeEntry({ detail: { a: 1, b: "has, a comma" } })]);
    // JSON.stringify({a:1,b:"has, a comma"}) contains a comma, so csvEscape
    // must wrap the whole field in quotes and double its embedded quotes.
    expect(csv).toContain('"{""a"":1,""b"":""has, a comma""}"');
  });

  it("does not quote fields with no special characters", () => {
    const csv = buildAuditCsv([fakeEntry({ action: "system_created" })]);
    expect(csv).toContain(",system_created,");
  });
});

describe("buildAuditPdf", () => {
  it("produces a real PDF (magic bytes) even with no entries", async () => {
    const pdf = await buildAuditPdf("Test System", []);
    expect(pdf.subarray(0, 5).toString()).toBe("%PDF-");
    expect(pdf.length).toBeGreaterThan(0);
  });
});
