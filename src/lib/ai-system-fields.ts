import type { DataClassification, DeploymentStatus } from "@prisma/client";

export const CLASSIFICATIONS: DataClassification[] = [
  "PUBLIC",
  "INTERNAL",
  "CONFIDENTIAL",
  "RESTRICTED",
];

export const DEPLOYMENT_STATUSES: DeploymentStatus[] = [
  "PLANNED",
  "PILOT",
  "PRODUCTION",
  "RETIRED",
];

export interface AiSystemFieldInput {
  name: string;
  description: string | null;
  businessUnit: string | null;
  vendorName: string | null;
  classification: DataClassification;
  deploymentStatus: DeploymentStatus;
}

// Shared by bulk import (spreadsheet rows) and the public API (JSON
// bodies) — both take untrusted string input for these two enums, unlike
// the UI's <select>, whose option values are already valid enum members.
// Accepts loose casing/spacing ("data classification: internal", "Pilot")
// since a human is typing the source file/request by hand.
function normalizeEnum<T extends string>(
  raw: unknown,
  allowed: T[],
  fallback: T,
  fieldLabel: string,
): T {
  const value = String(raw ?? "").trim();
  if (!value) return fallback;
  const upper = value.toUpperCase().replace(/[\s-]+/g, "_");
  const match = allowed.find((a) => a === upper);
  if (!match) {
    throw new Error(`${fieldLabel} must be one of ${allowed.join(", ")} (got "${value}")`);
  }
  return match;
}

export function parseAiSystemFieldInput(raw: Record<string, unknown>): AiSystemFieldInput {
  const name = String(raw.name ?? "").trim();
  if (!name) {
    throw new Error("Name is required");
  }
  return {
    name,
    description: String(raw.description ?? "").trim() || null,
    businessUnit: String(raw.businessUnit ?? "").trim() || null,
    vendorName: String(raw.vendorName ?? "").trim() || null,
    classification: normalizeEnum(raw.classification, CLASSIFICATIONS, "INTERNAL", "Classification"),
    deploymentStatus: normalizeEnum(
      raw.deploymentStatus,
      DEPLOYMENT_STATUSES,
      "PLANNED",
      "Deployment status",
    ),
  };
}
