import * as XLSX from "xlsx";
import { parseAiSystemFieldInput, type AiSystemFieldInput } from "@/lib/ai-system-fields";

// SheetJS reads both CSV and XLSX from the same buffer (format is
// detected from content), so one library covers both file types the
// import page accepts.
export function parseImportFile(buffer: Buffer): Record<string, unknown>[] {
  const workbook = XLSX.read(buffer, { type: "buffer" });
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  if (!sheet) return [];
  return XLSX.utils.sheet_to_json(sheet, { defval: "" });
}

// Template headers are "Business Unit", "Vendor Name", etc. — normalize
// to a bare lowercase key so header casing/spacing doesn't matter, while
// still requiring the template's column names (no alias guessing beyond
// that).
function normalizeRowKeys(raw: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(raw)) {
    out[key.trim().toLowerCase().replace(/[\s_-]+/g, "")] = value;
  }
  return out;
}

export function validateImportRow(raw: Record<string, unknown>): AiSystemFieldInput {
  const normalized = normalizeRowKeys(raw);
  return parseAiSystemFieldInput({
    name: normalized.name,
    description: normalized.description,
    businessUnit: normalized.businessunit,
    vendorName: normalized.vendorname,
    classification: normalized.classification,
    deploymentStatus: normalized.deploymentstatus,
    statesDeployed: normalized.statesdeployed,
  });
}
