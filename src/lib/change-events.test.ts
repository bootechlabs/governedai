import { describe, it, expect } from "vitest";
import {
  detectChanges,
  serializeStatesDeployed,
  keyChangeValues,
  KEY_CHANGE_FIELDS,
  type KeyChangeValues,
} from "./change-events";

function values(overrides: Partial<KeyChangeValues> = {}): KeyChangeValues {
  return {
    vendorName: "Acme AI Inc",
    classification: "INTERNAL",
    deploymentStatus: "PILOT",
    businessUnit: "Claims Ops",
    statesDeployed: null,
    isAgentic: "false",
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

  it("detects a change in statesDeployed", () => {
    const result = detectChanges(
      values({ statesDeployed: serializeStatesDeployed(["AL"]) }),
      values({ statesDeployed: serializeStatesDeployed(["AL", "GA"]) }),
    );
    expect(result).toEqual([{ field: "statesDeployed", beforeValue: "AL", afterValue: "AL,GA" }]);
  });
});

describe("serializeStatesDeployed", () => {
  it("returns null for an empty list", () => {
    expect(serializeStatesDeployed([])).toBeNull();
  });

  it("sorts and comma-joins so order doesn't produce a spurious change", () => {
    expect(serializeStatesDeployed(["GA", "AL"])).toBe("AL,GA");
    expect(serializeStatesDeployed(["AL", "GA"])).toBe("AL,GA");
  });
});

describe("isAgentic as a key change field", () => {
  it("detects flipping isAgentic on and off", () => {
    expect(detectChanges(values({ isAgentic: "false" }), values({ isAgentic: "true" }))).toEqual([
      { field: "isAgentic", beforeValue: "false", afterValue: "true" },
    ]);
    expect(detectChanges(values({ isAgentic: "true" }), values({ isAgentic: "false" }))).toEqual([
      { field: "isAgentic", beforeValue: "true", afterValue: "false" },
    ]);
  });
});

describe("keyChangeValues", () => {
  const system = {
    vendorName: "Acme AI Inc",
    classification: "INTERNAL",
    deploymentStatus: "PILOT",
    businessUnit: null,
    statesDeployed: ["GA", "AL"],
    isAgentic: true,
  };

  it("maps a system to serialized change values", () => {
    expect(keyChangeValues(system)).toEqual({
      vendorName: "Acme AI Inc",
      classification: "INTERNAL",
      deploymentStatus: "PILOT",
      businessUnit: null,
      statesDeployed: "AL,GA",
      isAgentic: "true",
    });
  });

  it("returns exactly the KEY_CHANGE_FIELDS keys, so a new field can't be missed at a call site", () => {
    expect(Object.keys(keyChangeValues(system)).sort()).toEqual([...KEY_CHANGE_FIELDS].sort());
  });

  it("produces the same change events whether diffing a stored system or parsed input", () => {
    // Both write paths (UI action and API PUT) diff a stored AiSystem
    // against parsed input; a flip must be detected identically.
    const changes = detectChanges(keyChangeValues(system), keyChangeValues({ ...system, isAgentic: false }));
    expect(changes).toEqual([{ field: "isAgentic", beforeValue: "true", afterValue: "false" }]);
  });
});
