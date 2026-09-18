import { describe, it, expect } from "vitest";
import { computeEntryHash, GENESIS_HASH } from "./audit-hash";

const base = {
  previousHash: GENESIS_HASH,
  aiSystemId: "system_1",
  actorId: "user_1",
  action: "stage_transitioned",
  occurredAt: new Date("2026-01-01T00:00:00.000Z"),
};

describe("computeEntryHash", () => {
  it("is a 64-char sha256 hex digest", () => {
    expect(computeEntryHash({ ...base, detail: {} })).toMatch(/^[0-9a-f]{64}$/);
  });

  // Postgres jsonb reorders object keys, so the detail hashed at write time
  // and the one read back at verify time differ in key order only.
  it("does not depend on the key order of detail", () => {
    const a = computeEntryHash({ ...base, detail: { stageName: "Intake", stageId: "abc", status: "APPROVED" } });
    const b = computeEntryHash({ ...base, detail: { status: "APPROVED", stageId: "abc", stageName: "Intake" } });
    expect(a).toBe(b);
  });

  it("does not depend on key order in nested objects, including inside arrays", () => {
    const a = computeEntryHash({
      ...base,
      detail: { before: { name: "x", vendorName: "y" }, list: [{ b: 1, a: 2 }] },
    });
    const b = computeEntryHash({
      ...base,
      detail: { list: [{ a: 2, b: 1 }], before: { vendorName: "y", name: "x" } },
    });
    expect(a).toBe(b);
  });

  it("still depends on array order, values, and every other input", () => {
    const ref = computeEntryHash({ ...base, detail: { list: [1, 2], k: "v" } });
    expect(computeEntryHash({ ...base, detail: { list: [2, 1], k: "v" } })).not.toBe(ref);
    expect(computeEntryHash({ ...base, detail: { list: [1, 2], k: "changed" } })).not.toBe(ref);
    expect(computeEntryHash({ ...base, detail: { list: [1, 2], k: "v" }, action: "other" })).not.toBe(ref);
    expect(computeEntryHash({ ...base, detail: { list: [1, 2], k: "v" }, actorId: "user_2" })).not.toBe(ref);
    expect(computeEntryHash({ ...base, detail: { list: [1, 2], k: "v" }, previousHash: "f".repeat(64) })).not.toBe(ref);
    expect(
      computeEntryHash({ ...base, detail: { list: [1, 2], k: "v" }, occurredAt: new Date("2026-01-01T00:00:00.001Z") }),
    ).not.toBe(ref);
  });

  it("treats a missing detail the same as null", () => {
    expect(computeEntryHash({ ...base, detail: undefined })).toBe(computeEntryHash({ ...base, detail: null }));
  });
});
