import { describe, it, expect } from "vitest";
import {
  slugifyFileName,
  buildAuditCsv,
  buildGovernanceReportPdf,
  type TriggeredRegulationRow,
} from "./report-export";
import type { AiSystem, AuditLogEntry, RiskClassification, User, Vendor } from "@prisma/client";

function fakeUser(overrides: Partial<User> = {}): User {
  return {
    id: "user_1",
    organizationId: "org_1",
    name: "Test User",
    email: "test@example.com",
    avatarUrl: null,
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

function fakeAiSystem(overrides: Partial<AiSystem> = {}): AiSystem {
  return {
    id: "system_1",
    name: "Test System",
    description: null,
    businessUnit: null,
    vendorName: null,
    classification: "INTERNAL",
    vendorId: null,
    deploymentStatus: "PILOT",
    statesDeployed: [],
    createdAt: new Date("2026-01-01T00:00:00.000Z"),
    updatedAt: new Date("2026-01-01T00:00:00.000Z"),
    archivedAt: null,
    organizationId: "org_1",
    ownerId: "user_1",
    ...overrides,
  };
}

function fakeRiskClassification(
  overrides: Partial<
    RiskClassification & { completedBy: User; triggeredRegulationRows: TriggeredRegulationRow[] }
  > = {},
): RiskClassification & { completedBy: User; triggeredRegulationRows: TriggeredRegulationRow[] } {
  return {
    id: "risk_1",
    useCaseTemplate: "GENERIC",
    answers: {},
    riskTier: "MODERATE",
    triggeredRegulations: [],
    completedAt: new Date("2026-01-01T00:00:00.000Z"),
    aiSystemId: "system_1",
    completedById: "user_1",
    completedBy: fakeUser(),
    triggeredRegulationRows: [],
    ...overrides,
  };
}

function fakeTriggeredRegulationRow(
  overrides: Partial<TriggeredRegulationRow["regulation"]> = {},
): TriggeredRegulationRow {
  return {
    regulation: {
      id: "reg_1",
      code: "NYC_LL144",
      label: "NYC Local Law 144",
      citation: "NYC Local Law 144 of 2021",
      summary: "Applies to automated employment decision tools.",
      artifacts: [
        {
          id: "artifact_1",
          label: "Independent bias audit on file",
          description: "A bias audit conducted within the past year.",
          evidenceCategory: "BIAS_AUDIT_REPORT",
        },
      ],
      ...overrides,
    },
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

describe("buildGovernanceReportPdf", () => {
  const baseInput = {
    system: { ...fakeAiSystem(), owner: fakeUser(), vendor: null as Vendor | null },
    stages: [],
    evidence: [],
    auditLog: [],
  };

  it("produces a real PDF (magic bytes) with no risk classification, stages, evidence, or audit log", async () => {
    const pdf = await buildGovernanceReportPdf({ ...baseInput, riskClassification: null });
    expect(pdf.subarray(0, 5).toString()).toBe("%PDF-");
    expect(pdf.length).toBeGreaterThan(0);
  });

  it("still produces a valid PDF when a triggered regulation has matching evidence on file", async () => {
    const pdf = await buildGovernanceReportPdf({
      ...baseInput,
      riskClassification: fakeRiskClassification({
        triggeredRegulationRows: [fakeTriggeredRegulationRow()],
      }),
      evidence: [
        {
          category: "BIAS_AUDIT_REPORT",
          type: "LINK",
          label: "2026 bias audit",
          fileUrl: null,
          linkUrl: "https://example.com/audit",
          uploadedBy: fakeUser(),
          uploadedAt: new Date("2026-01-01T00:00:00.000Z"),
        },
      ],
    });
    expect(pdf.subarray(0, 5).toString()).toBe("%PDF-");
  });

  it("still produces a valid PDF when a triggered regulation has no matching evidence", async () => {
    const pdf = await buildGovernanceReportPdf({
      ...baseInput,
      riskClassification: fakeRiskClassification({
        triggeredRegulationRows: [
          fakeTriggeredRegulationRow({
            code: "CO_SB21_169",
            label: "Colorado SB21-169",
            artifacts: [
              {
                id: "artifact_2",
                label: "Algorithmic impact assessment on file",
                description: "An assessment of the system's potential for unfair discriminatory outcomes.",
                evidenceCategory: "TEST_RESULT",
              },
            ],
          }),
        ],
      }),
    });
    expect(pdf.subarray(0, 5).toString()).toBe("%PDF-");
  });
});
