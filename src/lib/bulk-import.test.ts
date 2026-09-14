import { describe, it, expect } from "vitest";
import * as XLSX from "xlsx";
import { parseImportFile, validateImportRow } from "./bulk-import";

function csvBuffer(rows: string[]): Buffer {
  return Buffer.from(rows.join("\n"));
}

describe("parseImportFile", () => {
  it("parses a CSV buffer into row objects keyed by header", () => {
    const buffer = csvBuffer([
      "Name,Business Unit,Classification",
      "Claims Triage,Claims Ops,CONFIDENTIAL",
    ]);
    const rows = parseImportFile(buffer);
    expect(rows).toEqual([
      { Name: "Claims Triage", "Business Unit": "Claims Ops", Classification: "CONFIDENTIAL" },
    ]);
  });

  it("parses an XLSX buffer the same way", () => {
    const worksheet = XLSX.utils.aoa_to_sheet([
      ["Name", "Business Unit"],
      ["Ambient Scribe", "Clinical"],
    ]);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Sheet1");
    const buffer = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });

    const rows = parseImportFile(buffer);
    expect(rows).toEqual([{ Name: "Ambient Scribe", "Business Unit": "Clinical" }]);
  });

  it("returns an empty array for an empty file", () => {
    expect(parseImportFile(csvBuffer([""]))).toEqual([]);
  });
});

describe("validateImportRow", () => {
  it("accepts the exact template headers", () => {
    const result = validateImportRow({
      Name: "Claims Triage",
      Description: "Ambient scribe for claims review",
      "Business Unit": "Claims Ops",
      "Vendor Name": "Acme AI Inc",
      Classification: "CONFIDENTIAL",
      "Deployment Status": "PILOT",
    });
    expect(result).toEqual({
      name: "Claims Triage",
      description: "Ambient scribe for claims review",
      businessUnit: "Claims Ops",
      vendorName: "Acme AI Inc",
      classification: "CONFIDENTIAL",
      deploymentStatus: "PILOT",
    });
  });

  it("tolerates header casing/spacing variations", () => {
    const result = validateImportRow({
      name: "Ambient Scribe",
      businessunit: "Clinical",
      "  Vendor Name  ": "Nuance",
    });
    expect(result.name).toBe("Ambient Scribe");
    expect(result.businessUnit).toBe("Clinical");
    expect(result.vendorName).toBe("Nuance");
  });

  it("defaults classification and deployment status when blank", () => {
    const result = validateImportRow({ Name: "Minimal System" });
    expect(result.classification).toBe("INTERNAL");
    expect(result.deploymentStatus).toBe("PLANNED");
  });

  it("throws when name is missing", () => {
    expect(() => validateImportRow({ Classification: "PUBLIC" })).toThrow("Name is required");
  });

  it("throws a descriptive error for an invalid classification", () => {
    expect(() => validateImportRow({ Name: "X", Classification: "TOP_SECRET" })).toThrow(
      /Classification must be one of/,
    );
  });

  it("normalizes lowercase enum values", () => {
    const result = validateImportRow({ Name: "X", Classification: "confidential" });
    expect(result.classification).toBe("CONFIDENTIAL");
  });

  it("normalizes a space-separated enum value to its underscore form", () => {
    const result = validateImportRow({ Name: "X", "Deployment Status": "production" });
    expect(result.deploymentStatus).toBe("PRODUCTION");
  });
});
