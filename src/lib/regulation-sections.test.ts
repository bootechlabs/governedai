import { describe, it, expect } from "vitest";
import { computeRegulationSectionStatuses } from "./regulation-sections";

describe("computeRegulationSectionStatuses", () => {
  it("returns nothing for regulations with no defined checklist", () => {
    const statuses = computeRegulationSectionStatuses(["NIST_AI_RMF", "ISO_42001"], []);
    expect(statuses).toEqual([]);
  });

  it("returns a section for a regulation with a defined checklist", () => {
    const statuses = computeRegulationSectionStatuses(["NYC_LL144"], []);
    expect(statuses).toHaveLength(1);
    expect(statuses[0].regulation).toBe("NYC_LL144");
    expect(statuses[0].artifacts).toHaveLength(3);
  });

  it("marks every artifact not-on-file when there's no matching evidence", () => {
    const statuses = computeRegulationSectionStatuses(["NYC_LL144"], []);
    expect(statuses[0].artifacts.every((a) => !a.onFile)).toBe(true);
    expect(statuses[0].artifacts.every((a) => a.evidenceLabel === null)).toBe(true);
  });

  it("marks an artifact on-file when a matching evidence category is present", () => {
    const statuses = computeRegulationSectionStatuses(["NYC_LL144"], [
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
    const statuses = computeRegulationSectionStatuses(["CO_SB21_169"], [
      { category: "TEST_RESULT", label: "Impact assessment", fileUrl: null, linkUrl: "https://example.com/assessment" },
    ]);
    const artifact = statuses[0].artifacts.find((a) => a.evidenceCategory === "TEST_RESULT");
    expect(artifact?.onFile).toBe(true);
    expect(artifact?.evidenceUrl).toBe("https://example.com/assessment");
  });

  it("handles multiple triggered regulations", () => {
    const statuses = computeRegulationSectionStatuses(["NYC_LL144", "CO_SB21_169"], []);
    expect(statuses.map((s) => s.regulation).sort()).toEqual(["CO_SB21_169", "NYC_LL144"]);
  });
});
