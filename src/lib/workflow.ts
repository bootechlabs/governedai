// Fixed MVP stage shape — see docs/mvp-scope.md. Names/count can change later
// without a migration since WorkflowStage.stageName is data, not schema.
export const DEFAULT_WORKFLOW_STAGES = [
  { sequence: 1, stageName: "Intake" },
  { sequence: 2, stageName: "Risk Review" },
] as const;
