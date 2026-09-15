import type { StageStatus } from "@prisma/client";

// Fixed MVP stage shape — see docs/mvp-scope.md. Names/count can change later
// without a migration since WorkflowStage.stageName is data, not schema.
export const DEFAULT_WORKFLOW_STAGES = [
  { sequence: 1, stageName: "Intake" },
  { sequence: 2, stageName: "Risk Review" },
] as const;

export function isStageActionable(status: StageStatus) {
  return status === "PENDING" || status === "IN_REVIEW";
}

// A rejection or conditional approval with no rationale is an incomplete
// audit trail the moment it's recorded — see src/app/systems/actions.ts
// decideStage, which enforces this before writing anything.
export function requiresRationale(status: StageStatus) {
  return status === "REJECTED" || status === "CONDITIONALLY_APPROVED";
}

// No stored "needs recertification" flag to keep in sync — computed from
// data that already exists: a system needs recertification if something
// governance-relevant changed (see src/lib/change-events.ts) after the
// most recent decision on any of its stages. A system with no decided
// stages yet isn't "needs recertification" — that's the ordinary
// "pending review" case, already surfaced separately.
export function needsRecertification(
  latestChangeAt: Date | null,
  stages: { decidedAt: Date | null }[],
): boolean {
  if (!latestChangeAt) return false;

  const decidedDates = stages
    .map((s) => s.decidedAt)
    .filter((d): d is Date => d !== null);
  if (decidedDates.length === 0) return false;

  const latestDecisionAt = new Date(Math.max(...decidedDates.map((d) => d.getTime())));
  return latestChangeAt > latestDecisionAt;
}
