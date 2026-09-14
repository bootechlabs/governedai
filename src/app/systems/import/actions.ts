"use server";

import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/lib/current-user";
import { canCreateSystem } from "@/lib/permissions";
import { parseImportFile, validateImportRow } from "@/lib/bulk-import";
import { createAiSystemRecord } from "@/lib/ai-systems";

export interface ImportResult {
  created: number;
  errors: { row: number; message: string }[];
}

export async function importAiSystems(
  _prevState: ImportResult | null,
  formData: FormData,
): Promise<ImportResult> {
  const actor = await getCurrentUser();
  if (!canCreateSystem(actor.role)) {
    throw new Error("Your role can't register new AI systems");
  }

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    throw new Error("Choose a CSV or Excel file to import");
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const rows = parseImportFile(buffer);

  const errors: ImportResult["errors"] = [];
  let created = 0;

  // Sequential, not Promise.all — imports are dozens-to-low-hundreds of
  // rows at MVP scale, and this keeps audit log ordering sane and avoids
  // hammering the connection pool with one query per row concurrently.
  for (let i = 0; i < rows.length; i++) {
    // Row 1 is the header; spreadsheet row numbers are 1-indexed, so the
    // first data row is row 2.
    const rowNumber = i + 2;
    try {
      const fields = validateImportRow(rows[i]);
      await createAiSystemRecord({
        organizationId: actor.organizationId,
        ownerId: actor.id,
        actorId: actor.id,
        fields,
        auditDetail: { ...fields, source: "bulk_import" },
      });
      created++;
    } catch (error) {
      errors.push({
        row: rowNumber,
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  revalidatePath("/systems");
  return { created, errors };
}
