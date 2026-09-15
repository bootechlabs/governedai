// The governance-relevant fields that can change post-creation — the
// only ones that matter for recertification (name/description are
// cosmetic). All four are already diffed into updateAiSystem's
// before/after audit-log detail (src/app/systems/actions.ts); this is
// the same comparison, pulled out so it's unit-testable and drives
// which ChangeEvent rows get created alongside that audit entry.
export const KEY_CHANGE_FIELDS = [
  "vendorName",
  "classification",
  "deploymentStatus",
  "businessUnit",
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
