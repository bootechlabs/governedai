import { describe, it, expect } from "vitest";
import {
  computeAffectedSystems,
  describeMatchReason,
  isHttpsUrl,
  needsReview,
  parseUpdateInput,
  publishBlockers,
  reviewState,
  slugify,
  updateAppliesToVertical,
  updateStatus,
  USE_CASE_TEMPLATES,
  type MatchSystem,
  type MatchUpdate,
  type RawUpdateInput,
} from "./regulatory-updates";

const validRaw: RawUpdateInput = {
  title: "Alabama enacts SB 63",
  summary: "Requires a licensed human to make adverse determinations.",
  kind: "ENACTED",
  sourceName: "Alabama Legislature",
  sourceUrl: "https://alison.legislature.state.al.us/x.pdf",
  eventDate: "2026-04-17",
};

describe("parseUpdateInput", () => {
  it("accepts a complete draft", () => {
    const result = parseUpdateInput(validRaw, { revisionRequired: false });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.eventDate.toISOString()).toBe("2026-04-17T00:00:00.000Z");
      expect(result.value.effectiveDate).toBeNull();
      expect(result.value.vertical).toBeNull();
    }
  });

  it("requires title, summary, kind, source name/link, and event date", () => {
    const result = parseUpdateInput({}, { revisionRequired: false });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors).toEqual(
        expect.arrayContaining([
          "Title is required",
          "Summary is required",
          "Kind is required",
          "Source name is required",
          "Source link is required",
          "Event date is required (YYYY-MM-DD)",
        ]),
      );
    }
  });

  it.each(["http://example.com/a", "ftp://example.com", "javascript:alert(1)", "example.com/a", "not a url"])(
    "rejects a non-https source link: %s",
    (sourceUrl) => {
      const result = parseUpdateInput({ ...validRaw, sourceUrl }, { revisionRequired: false });
      expect(result.ok).toBe(false);
    },
  );

  it("rejects impossible dates", () => {
    expect(parseUpdateInput({ ...validRaw, eventDate: "2026-02-31" }, { revisionRequired: false }).ok).toBe(false);
    expect(parseUpdateInput({ ...validRaw, effectiveDate: "soon" }, { revisionRequired: false }).ok).toBe(false);
  });

  it("rejects unknown use-case templates and dedupes valid ones", () => {
    expect(parseUpdateInput({ ...validRaw, useCaseTemplates: ["NOPE"] }, { revisionRequired: false }).ok).toBe(false);
    const ok = parseUpdateInput(
      { ...validRaw, useCaseTemplates: ["PRIOR_AUTH_UM", "PRIOR_AUTH_UM"] },
      { revisionRequired: false },
    );
    expect(ok.ok && ok.value.useCaseTemplates).toEqual(["PRIOR_AUTH_UM"]);
  });

  it("accepts every real template", () => {
    const result = parseUpdateInput({ ...validRaw, useCaseTemplates: USE_CASE_TEMPLATES }, { revisionRequired: false });
    expect(result.ok).toBe(true);
  });

  it("rejects links to regulations that don't exist", () => {
    const result = parseUpdateInput(
      { ...validRaw, regulationIds: ["r1", "ghost"] },
      { revisionRequired: false, knownRegulationIds: new Set(["r1"]) },
    );
    expect(result.ok).toBe(false);
  });

  it("requires a revision note when revising a published update", () => {
    expect(parseUpdateInput(validRaw, { revisionRequired: true }).ok).toBe(false);
    expect(parseUpdateInput({ ...validRaw, revisionNote: "  " }, { revisionRequired: true }).ok).toBe(false);
    const ok = parseUpdateInput({ ...validRaw, revisionNote: "Corrected effective date" }, { revisionRequired: true });
    expect(ok.ok && ok.value.revisionNote).toBe("Corrected effective date");
  });
});

describe("helpers", () => {
  it("isHttpsUrl only accepts https", () => {
    expect(isHttpsUrl("https://a.gov/x")).toBe(true);
    expect(isHttpsUrl("http://a.gov/x")).toBe(false);
  });

  it("slugify makes a stable url-safe key", () => {
    expect(slugify("Alabama enacts SB 63 — AI limits!")).toBe("alabama-enacts-sb-63-ai-limits");
    expect(slugify("  ")).toBe("");
  });

  it("publishBlockers lists whatever is missing", () => {
    expect(
      publishBlockers({ summary: "s", sourceName: "n", sourceUrl: "https://a.gov", kind: "ENACTED", eventDate: new Date() }),
    ).toEqual([]);
    expect(
      publishBlockers({ summary: " ", sourceName: "", sourceUrl: "http://a.gov", kind: null, eventDate: null }),
    ).toHaveLength(5);
  });

  it("updateStatus derives from timestamps, archived winning", () => {
    const d = new Date();
    expect(updateStatus({ publishedAt: null, archivedAt: null })).toBe("draft");
    expect(updateStatus({ publishedAt: d, archivedAt: null })).toBe("published");
    expect(updateStatus({ publishedAt: d, archivedAt: d })).toBe("archived");
  });
});

const NIST = { id: "reg_nist", label: "NIST AI RMF" };
const AL = { id: "reg_al", label: "Alabama SB 63" };

function system(over: Partial<MatchSystem> & { id: string }): MatchSystem {
  return {
    name: over.id,
    archivedAt: null,
    riskClassification: { useCaseTemplate: "GENERIC", regulationIds: [] },
    ...over,
  };
}

const update = (over: Partial<MatchUpdate> = {}): MatchUpdate => ({
  vertical: null,
  useCaseTemplates: [],
  regulations: [],
  ...over,
});

describe("computeAffectedSystems", () => {
  it("matches by triggered regulation, with the reason", () => {
    const result = computeAffectedSystems(update({ regulations: [AL] }), null, [
      system({ id: "a", riskClassification: { useCaseTemplate: "GENERIC", regulationIds: ["reg_al"] } }),
      system({ id: "b" }),
    ]);
    expect(result.affected.map((s) => s.id)).toEqual(["a"]);
    expect(result.affected[0].reasons).toEqual([{ kind: "regulation", regulationId: "reg_al", label: "Alabama SB 63" }]);
  });

  it("matches by use-case template", () => {
    const result = computeAffectedSystems(update({ useCaseTemplates: ["PRIOR_AUTH_UM"] }), null, [
      system({ id: "a", riskClassification: { useCaseTemplate: "PRIOR_AUTH_UM", regulationIds: [] } }),
      system({ id: "b", riskClassification: { useCaseTemplate: "PATIENT_CHATBOT", regulationIds: [] } }),
    ]);
    expect(result.affected.map((s) => s.id)).toEqual(["a"]);
    expect(result.affected[0].reasons[0]).toMatchObject({ kind: "template", template: "PRIOR_AUTH_UM" });
  });

  it("reports both reasons when both apply, and multiple regulations", () => {
    const result = computeAffectedSystems(
      update({ regulations: [NIST, AL], useCaseTemplates: ["PRIOR_AUTH_UM"] }),
      null,
      [system({ id: "a", riskClassification: { useCaseTemplate: "PRIOR_AUTH_UM", regulationIds: ["reg_nist", "reg_al"] } })],
    );
    expect(result.affected).toHaveLength(1);
    expect(result.affected[0].reasons.map((r) => r.kind)).toEqual(["regulation", "regulation", "template"]);
  });

  it("matches nothing when neither reason applies", () => {
    const result = computeAffectedSystems(update({ regulations: [AL], useCaseTemplates: ["PRIOR_AUTH_UM"] }), null, [
      system({ id: "a", riskClassification: { useCaseTemplate: "PATIENT_CHATBOT", regulationIds: ["reg_nist"] } }),
    ]);
    expect(result.affected).toEqual([]);
    expect(result.visible).toBe(true);
  });

  it("an update with no regulations and no templates is general: visible, affects nothing", () => {
    const result = computeAffectedSystems(update(), null, [system({ id: "a" })]);
    expect(result).toMatchObject({ visible: true, affected: [] });
  });

  it("excludes archived systems from matches and from the unassessed count", () => {
    const result = computeAffectedSystems(update({ useCaseTemplates: ["GENERIC"] }), null, [
      system({ id: "live" }),
      system({ id: "old", archivedAt: new Date() }),
      system({ id: "old-unassessed", archivedAt: new Date(), riskClassification: null }),
    ]);
    expect(result.affected.map((s) => s.id)).toEqual(["live"]);
    expect(result.unassessedCount).toBe(0);
  });

  it("can't match systems with no risk classification, and counts them", () => {
    const result = computeAffectedSystems(update({ useCaseTemplates: ["GENERIC"] }), null, [
      system({ id: "a", riskClassification: null }),
      system({ id: "b", riskClassification: null }),
      system({ id: "c" }),
    ]);
    expect(result.affected.map((s) => s.id)).toEqual(["c"]);
    expect(result.unassessedCount).toBe(2);
  });

  describe("vertical", () => {
    it("null vertical applies to every org", () => {
      expect(updateAppliesToVertical(null, null)).toBe(true);
      expect(updateAppliesToVertical(null, "Payer")).toBe(true);
    });

    it("equal vertical applies, ignoring case and spacing", () => {
      expect(updateAppliesToVertical("payer", " Payer ")).toBe(true);
    });

    it("unequal or missing org vertical hides the update entirely", () => {
      expect(updateAppliesToVertical("payer", "Provider")).toBe(false);
      expect(updateAppliesToVertical("payer", null)).toBe(false);
      const result = computeAffectedSystems(update({ vertical: "payer", useCaseTemplates: ["GENERIC"] }), "Provider", [
        system({ id: "a", riskClassification: null }),
        system({ id: "b" }),
      ]);
      expect(result).toEqual({ visible: false, affected: [], unassessedCount: 0 });
    });
  });
});

describe("describeMatchReason", () => {
  it("states the reason in 'may' territory, never as a determination", () => {
    expect(describeMatchReason({ kind: "regulation", regulationId: "x", label: "NIST AI RMF" })).toBe(
      "NIST AI RMF is triggered for this system",
    );
    expect(describeMatchReason({ kind: "template", template: "PRIOR_AUTH_UM", label: "Prior authorization / UM" })).toBe(
      "Use-case template: Prior authorization / UM",
    );
  });
});

describe("review state", () => {
  const t = (iso: string) => new Date(iso);

  it("is unreviewed with no review", () => {
    expect(reviewState({ revisedAt: null }, null)).toBe("unreviewed");
  });

  it("is reviewed when never revised, or revised before the review", () => {
    expect(reviewState({ revisedAt: null }, { reviewedAt: t("2026-09-01") })).toBe("reviewed");
    expect(reviewState({ revisedAt: t("2026-08-01") }, { reviewedAt: t("2026-09-01") })).toBe("reviewed");
  });

  it("goes stale when revised after the review", () => {
    expect(reviewState({ revisedAt: t("2026-09-02") }, { reviewedAt: t("2026-09-01") })).toBe("stale");
  });

  it("needs review only when it affects something and isn't currently reviewed", () => {
    expect(needsReview(2, "unreviewed")).toBe(true);
    expect(needsReview(2, "stale")).toBe(true);
    expect(needsReview(2, "reviewed")).toBe(false);
    expect(needsReview(0, "unreviewed")).toBe(false);
  });
});
