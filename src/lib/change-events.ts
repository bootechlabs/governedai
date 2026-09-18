// The governance-relevant fields that can change post-creation — the
// only ones that matter for recertification (name/description are
// cosmetic). Shared by both write paths (the UI's updateAiSystem in
// src/app/systems/actions.ts and the public API's PUT) via keyChangeValues
// below, so a field added here is diffed identically in both; this is the
// comparison pulled out so it's unit-testable and drives which
// ChangeEvent rows get created alongside the audit entry.
export const KEY_CHANGE_FIELDS = [
  "vendorName",
  "classification",
  "deploymentStatus",
  "businessUnit",
  "statesDeployed",
  "isAgentic",
] as const;

export type KeyChangeField = (typeof KEY_CHANGE_FIELDS)[number];
export type KeyChangeValues = Record<KeyChangeField, string | null>;

export interface DetectedChange {
  field: KeyChangeField;
  beforeValue: string | null;
  afterValue: string | null;
}

export function detectChanges(before: KeyChangeValues, after: KeyChangeValues): DetectedChange[] {
  return KEY_CHANGE_FIELDS.filter((field) => before[field] !== after[field]).map((field) => ({
    field,
    beforeValue: before[field],
    afterValue: after[field],
  }));
}

// statesDeployed is a string[] on AiSystem, but KeyChangeValues (and
// ChangeEvent.beforeValue/afterValue) are plain strings — serialize to a
// sorted, comma-joined string so array order doesn't produce a spurious
// change and the stored before/after stays human-readable.
export function serializeStatesDeployed(states: string[]): string | null {
  if (states.length === 0) return null;
  return [...states].sort().join(",");
}

// The one place an AiSystem (or the parsed fields of an incoming update) is
// turned into KeyChangeValues. Both write paths call this, and it must
// return every KEY_CHANGE_FIELDS key (enforced by the type and by a test),
// so adding a field to that list can't be missed at one call site — which
// is how isAgentic originally went unrecorded. Booleans are stored as
// "true"/"false" rather than null so a flip reads clearly in the history.
export function keyChangeValues(system: {
  vendorName: string | null;
  classification: string;
  deploymentStatus: string;
  businessUnit: string | null;
  statesDeployed: string[];
  isAgentic: boolean;
}): KeyChangeValues {
  return {
    vendorName: system.vendorName,
    classification: system.classification,
    deploymentStatus: system.deploymentStatus,
    businessUnit: system.businessUnit,
    statesDeployed: serializeStatesDeployed(system.statesDeployed),
    isAgentic: String(system.isAgentic),
  };
}
