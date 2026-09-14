import { describe, it, expect } from "vitest";
import { matchVendorByName } from "./ai-systems";

const vendors = [
  { id: "v1", name: "Acme AI Inc" },
  { id: "v2", name: "Nuance" },
];

describe("matchVendorByName", () => {
  it("matches an exact vendor name", () => {
    expect(matchVendorByName(vendors, "Acme AI Inc")).toBe("v1");
  });

  it("matches case-insensitively and trims whitespace", () => {
    expect(matchVendorByName(vendors, "  acme ai inc  ")).toBe("v1");
  });

  it("returns null when no vendor matches", () => {
    expect(matchVendorByName(vendors, "Some Other Vendor")).toBeNull();
  });

  it("returns null for a null vendor name", () => {
    expect(matchVendorByName(vendors, null)).toBeNull();
  });

  it("returns null for an empty or blank vendor name", () => {
    expect(matchVendorByName(vendors, "")).toBeNull();
    expect(matchVendorByName(vendors, "   ")).toBeNull();
  });

  it("returns null against an empty vendor list", () => {
    expect(matchVendorByName([], "Acme AI Inc")).toBeNull();
  });
});
