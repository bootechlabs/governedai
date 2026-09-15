import { describe, it, expect } from "vitest";
import { isStageActionable, requiresRationale, DEFAULT_WORKFLOW_STAGES } from "./workflow";
import type { StageStatus } from "@prisma/client";

describe("isStageActionable", () => {
  it("is true for PENDING and IN_REVIEW", () => {
    expect(isStageActionable("PENDING")).toBe(true);
    expect(isStageActionable("IN_REVIEW")).toBe(true);
  });

  it("is false for terminal statuses", () => {
    const terminal: StageStatus[] = ["APPROVED", "CONDITIONALLY_APPROVED", "REJECTED"];
    for (const status of terminal) {
      expect(isStageActionable(status)).toBe(false);
    }
  });
});

describe("requiresRationale", () => {
  it("is true for REJECTED and CONDITIONALLY_APPROVED", () => {
    expect(requiresRationale("REJECTED")).toBe(true);
    expect(requiresRationale("CONDITIONALLY_APPROVED")).toBe(true);
  });

  it("is false for APPROVED, IN_REVIEW, and PENDING", () => {
    const noRationaleNeeded: StageStatus[] = ["APPROVED", "IN_REVIEW", "PENDING"];
    for (const status of noRationaleNeeded) {
      expect(requiresRationale(status)).toBe(false);
    }
  });
});

describe("DEFAULT_WORKFLOW_STAGES", () => {
  it("is Intake then Risk Review, in sequence order", () => {
    expect(DEFAULT_WORKFLOW_STAGES).toEqual([
      { sequence: 1, stageName: "Intake" },
      { sequence: 2, stageName: "Risk Review" },
    ]);
  });
});
