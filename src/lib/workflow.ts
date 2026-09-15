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
