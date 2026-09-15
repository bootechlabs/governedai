import { describe, it, expect } from "vitest";
import { detectChanges, type KeyChangeValues } from "./change-events";

function values(overrides: Partial<KeyChangeValues> = {}): KeyChangeValues {
  return {
    vendorName: "Acme AI Inc",
    classification: "INTERNAL",
    deploymentStatus: "PILOT",
    businessUnit: "Claims Ops",
    ...overrides,
  };
}

describe("detectChanges", () => {
  it("returns nothing when no key field changed", () => {
    expect(detectChanges(values(), values())).toEqual([]);
  });

  it("detects a single changed field", () => {
    const result = detectChanges(values(), values({ classification: "RESTRICTED" }));
    expect(result).toEqual([
      { field: "classification", beforeValue: "INTERNAL", afterValue: "RESTRICTED" },
    ]);
  });

  it("detects multiple changed fields", () => {
    const result = detectChanges(
      values(),
      values({ vendorName: "New Vendor", deploymentStatus: "PRODUCTION" }),
    );
    expect(result.map((c) => c.field).sort()).toEqual(["deploymentStatus", "vendorName"]);
  });

  it("treats null-to-value and value-to-null as changes", () => {
    expect(detectChanges(values({ vendorName: null }), values({ vendorName: "Acme AI Inc" }))).toHaveLength(1);
    expect(detectChanges(values({ vendorName: "Acme AI Inc" }), values({ vendorName: null }))).toHaveLength(1);
  });
});
