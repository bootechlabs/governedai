import { describe, it, expect } from "vitest";
import {
  getQuestionsForTemplate,
  computeRiskClassification,
  CORE_QUESTIONS,
} from "./risk-classification";

describe("getQuestionsForTemplate", () => {
  it("returns only the core questions for the generic template", () => {
    expect(getQuestionsForTemplate("GENERIC")).toEqual(CORE_QUESTIONS);
  });

  it("appends template-specific questions for a named use case", () => {
    const questions = getQuestionsForTemplate("AMBIENT_SCRIBE");
    expect(questions.length).toBe(CORE_QUESTIONS.length + 2);
    expect(questions.some((q) => q.key === "noteEntersRecord")).toBe(true);
  });
});

describe("computeRiskClassification", () => {
  it("classifies all-zero answers as LOW risk with no triggered regulations", () => {
    const result = computeRiskClassification("GENERIC", {});
    expect(result.riskTier).toBe("LOW");
    expect(result.triggeredRegulations).toEqual([]);
  });

  it("classifies all-max answers as CRITICAL with NIST and ISO triggered", () => {
    const allMax = Object.fromEntries(CORE_QUESTIONS.map((q) => [q.key, 3]));
    const result = computeRiskClassification("GENERIC", allMax);
    expect(result.riskTier).toBe("CRITICAL");
    expect(result.triggeredRegulations).toContain("NIST_AI_RMF");
    expect(result.triggeredRegulations).toContain("ISO_42001");
  });

  it("triggers NYC_LL144 when the employment-decision answer is 2 or higher", () => {
    const result = computeRiskClassification("GENERIC", { employmentDecision: 2 });
    expect(result.triggeredRegulations).toContain("NYC_LL144");
  });

  it("does not trigger NYC_LL144 below the threshold", () => {
    const result = computeRiskClassification("GENERIC", { employmentDecision: 1 });
    expect(result.triggeredRegulations).not.toContain("NYC_LL144");
  });

  it("triggers CO_SB21_169 when the consequential-decision answer is 2 or higher", () => {
    const result = computeRiskClassification("GENERIC", { consequentialDecision: 3 });
    expect(result.triggeredRegulations).toContain("CO_SB21_169");
  });

  it("triggers EU_AI_ACT when the EU-exposure answer is 2 or higher", () => {
    const result = computeRiskClassification("GENERIC", { euExposure: 2 });
    expect(result.triggeredRegulations).toContain("EU_AI_ACT");
  });

  it("treats an unanswered question as weight 0", () => {
    const result = computeRiskClassification("GENERIC", { dataSensitivity: 3 });
    // 3 out of 6 questions * 3 max = 18 possible; 3/18 = 17% -> LOW
    expect(result.riskTier).toBe("LOW");
  });

  it("includes template-specific question weight in the score", () => {
    const sameCoreAnswers = { dataSensitivity: 1, humanOversight: 1 };
    const coreOnly = computeRiskClassification("GENERIC", sameCoreAnswers);
    const withTemplate = computeRiskClassification("AMBIENT_SCRIBE", {
      ...sameCoreAnswers,
      noteEntersRecord: 3,
      audioRetention: 3,
    });
    // Same core answers, but the template questions push the percentage
    // of max possible higher — since it's a percentage, adding maxed-out
    // template weight only raises the tier if it wasn't already there.
    expect(withTemplate.riskTier).not.toBe(coreOnly.riskTier);
  });

  it("respects tier boundaries at the documented percentages", () => {
    // 6 core questions, max 18. 25% = 4.5 -> weight sum of 4 stays LOW.
    const low = computeRiskClassification("GENERIC", {
      dataSensitivity: 2,
      humanOversight: 2,
    });
    expect(low.riskTier).toBe("LOW");

    // Sum of 10/18 = 56% -> HIGH.
    const high = computeRiskClassification("GENERIC", {
      dataSensitivity: 3,
      humanOversight: 3,
      employmentDecision: 3,
      consequentialDecision: 1,
    });
    expect(high.riskTier).toBe("HIGH");
  });
});
