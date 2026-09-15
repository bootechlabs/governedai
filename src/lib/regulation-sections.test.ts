import { describe, it, expect } from "vitest";
import { computeRegulationSectionStatuses, type TriggeredRegulation } from "./regulation-sections";

// Mirrors the content that used to live in the static REGULATION_SECTIONS
// map, now the shape a caller fetches from RegulationDefinition +
// RegulationArtifactDefinition rows.
const NIST: TriggeredRegulation = {
  id: "nist",
  code: "NIST_AI_RMF",
  label: "NIST AI Risk Management Framework",
  citation: null,
  summary: null,
  artifacts: [],
};

const NYC: TriggeredRegulation = {
  id: "nyc",
  code: "NYC_LL144",
  label: "NYC Local Law 144 — Automated Employment Decision Tools",
  citation: "NYC Local Law 144 of 2021",
  summary: "Applies to automated employment decision tools.",
  artifacts: [
    { id: "nyc-audit", label: "Independent bias audit on file", description: "...", evidenceCategory: "BIAS_AUDIT_REPORT" },
    { id: "nyc-summary", label: "Bias audit summary available", description: "...", evidenceCategory: "BIAS_AUDIT_REPORT" },
    { id: "nyc-notice", label: "Candidate/employee notice issued", description: "...", evidenceCategory: "POLICY_DOCUMENT" },
  ],
};

const CO: TriggeredRegulation = {
  id: "co",
  code: "CO_SB21_169",
  label: "Colorado SB21-169 — Algorithm & Predictive Model Governance",
  citation: "Colorado SB21-169",
  summary: "Applies to algorithms/predictive models.",
  artifacts: [
    { id: "co-impact", label: "Algorithmic impact assessment on file", description: "...", evidenceCategory: "TEST_RESULT" },
    { id: "co-notice", label: "Consumer notice issued", description: "...", evidenceCategory: "POLICY_DOCUMENT" },
  ],
};

describe("computeRegulationSectionStatuses", () => {
  it("returns a section with empty artifacts for a regulation with no checklist content", () => {
    const statuses = computeRegulationSectionStatuses([NIST], []);
    expect(statuses).toHaveLength(1);
    expect(statuses[0].artifacts).toEqual([]);
  });

  it("returns a section for a regulation with a defined checklist", () => {
    const statuses = computeRegulationSectionStatuses([NYC], []);
    expect(statuses).toHaveLength(1);
    expect(statuses[0].code).toBe("NYC_LL144");
    expect(statuses[0].artifacts).toHaveLength(3);
  });

  it("marks every artifact not-on-file when there's no matching evidence", () => {
    const statuses = computeRegulationSectionStatuses([NYC], []);
    expect(statuses[0].artifacts.every((a) => !a.onFile)).toBe(true);
    expect(statuses[0].artifacts.every((a) => a.evidenceLabel === null)).toBe(true);
  });

  it("marks an artifact on-file when a matching evidence category is present", () => {
    const statuses = computeRegulationSectionStatuses([NYC], [
      { category: "BIAS_AUDIT_REPORT", label: "2026 audit", fileUrl: "https://example.com/audit.pdf", linkUrl: null },
    ]);
    const biasAuditArtifacts = statuses[0].artifacts.filter((a) => a.evidenceCategory === "BIAS_AUDIT_REPORT");
    expect(biasAuditArtifacts.every((a) => a.onFile)).toBe(true);
    expect(biasAuditArtifacts[0].evidenceLabel).toBe("2026 audit");
    expect(biasAuditArtifacts[0].evidenceUrl).toBe("https://example.com/audit.pdf");

    const noticeArtifact = statuses[0].artifacts.find((a) => a.evidenceCategory === "POLICY_DOCUMENT");
    expect(noticeArtifact?.onFile).toBe(false);
  });

  it("falls back to linkUrl when fileUrl is absent", () => {
    const statuses = computeRegulationSectionStatuses([CO], [
      { category: "TEST_RESULT", label: "Impact assessment", fileUrl: null, linkUrl: "https://example.com/assessment" },
    ]);
    const artifact = statuses[0].artifacts.find((a) => a.evidenceCategory === "TEST_RESULT");
    expect(artifact?.onFile).toBe(true);
    expect(artifact?.evidenceUrl).toBe("https://example.com/assessment");
  });

  it("handles multiple triggered regulations", () => {
    const statuses = computeRegulationSectionStatuses([NYC, CO], []);
    expect(statuses.map((s) => s.code).sort()).toEqual(["CO_SB21_169", "NYC_LL144"]);
  });
});
