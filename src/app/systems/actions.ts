"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/current-user";
import { DEFAULT_WORKFLOW_STAGES } from "@/lib/workflow";
import { uploadEvidenceFile } from "@/lib/storage";
import { logAuditEntry } from "@/lib/audit-log";
import type { DataClassification, DeploymentStatus, StageStatus } from "@prisma/client";

// An archived system is frozen — its workflow/evidence/audit history stays
// reviewable, but nothing about it should keep changing underneath that
// history. Enforced here (not just hidden in the UI) since a bound form
// action can still be POSTed to directly.
async function assertSystemEditable(aiSystemId: string) {
  const system = await prisma.aiSystem.findUniqueOrThrow({ where: { id: aiSystemId } });
  if (system.archivedAt) {
    throw new Error("This AI system is archived — unarchive it before making changes.");
  }
  return system;
}

function parseAiSystemFields(formData: FormData) {
  const name = String(formData.get("name") ?? "").trim();
  if (!name) {
    throw new Error("Name is required");
  }
  return {
    name,
    description: String(formData.get("description") ?? "").trim() || null,
    businessUnit: String(formData.get("businessUnit") ?? "").trim() || null,
    vendorName: String(formData.get("vendorName") ?? "").trim() || null,
    classification: String(
      formData.get("classification") ?? "INTERNAL",
    ) as DataClassification,
    deploymentStatus: String(
      formData.get("deploymentStatus") ?? "PLANNED",
    ) as DeploymentStatus,
  };
}

export async function createAiSystem(formData: FormData) {
  const fields = parseAiSystemFields(formData);
  const owner = await getCurrentUser();

  const system = await prisma.aiSystem.create({
    data: {
      ...fields,
      ownerId: owner.id,
      stages: {
        create: DEFAULT_WORKFLOW_STAGES.map((stage) => ({
          stageName: stage.stageName,
          sequence: stage.sequence,
        })),
      },
    },
  });

  await logAuditEntry({
    aiSystemId: system.id,
    actorId: owner.id,
    action: "system_created",
    detail: fields,
  });

  revalidatePath("/systems");
  redirect(`/systems/${system.id}`);
}

export async function updateAiSystem(aiSystemId: string, formData: FormData) {
  const fields = parseAiSystemFields(formData);
  const actor = await getCurrentUser();

  const before = await assertSystemEditable(aiSystemId);

  await prisma.aiSystem.update({ where: { id: aiSystemId }, data: fields });

  await logAuditEntry({
    aiSystemId,
    actorId: actor.id,
    action: "system_updated",
    detail: {
      before: {
        name: before.name,
        businessUnit: before.businessUnit,
        vendorName: before.vendorName,
        classification: before.classification,
        deploymentStatus: before.deploymentStatus,
      },
      after: fields,
    },
  });

  revalidatePath("/systems");
  revalidatePath(`/systems/${aiSystemId}`);
}

export async function deleteAiSystem(aiSystemId: string) {
  await getCurrentUser();
  await prisma.aiSystem.delete({ where: { id: aiSystemId } });
  revalidatePath("/systems");
  redirect("/systems");
}

// Archiving (unlike delete) keeps workflow/evidence/audit history intact —
// for a retired tool a client still needs to review later, not lose.
export async function archiveAiSystem(aiSystemId: string) {
  const actor = await getCurrentUser();
  await prisma.aiSystem.update({
    where: { id: aiSystemId },
    data: { archivedAt: new Date() },
  });
  await logAuditEntry({
    aiSystemId,
    actorId: actor.id,
    action: "system_archived",
    detail: {},
  });
  revalidatePath("/systems");
  revalidatePath(`/systems/${aiSystemId}`);
}

export async function unarchiveAiSystem(aiSystemId: string) {
  const actor = await getCurrentUser();
  await prisma.aiSystem.update({
    where: { id: aiSystemId },
    data: { archivedAt: null },
  });
  await logAuditEntry({
    aiSystemId,
    actorId: actor.id,
    action: "system_unarchived",
    detail: {},
  });
  revalidatePath("/systems");
  revalidatePath(`/systems/${aiSystemId}`);
}

export async function decideStage(stageId: string, formData: FormData) {
  const status = String(formData.get("status") ?? "") as StageStatus;
  const rationale = String(formData.get("rationale") ?? "").trim();
  if (!status) {
    throw new Error("Status is required");
  }

  const actor = await getCurrentUser();

  const existingStage = await prisma.workflowStage.findUniqueOrThrow({
    where: { id: stageId },
    include: { aiSystem: true },
  });
  if (existingStage.aiSystem.archivedAt) {
    throw new Error("This AI system is archived — unarchive it before making changes.");
  }

  const stage = await prisma.workflowStage.update({
    where: { id: stageId },
    data: {
      status,
      decisionRationale: rationale || null,
      decidedAt: new Date(),
      ownerId: actor.id,
    },
  });

  await logAuditEntry({
    aiSystemId: stage.aiSystemId,
    actorId: actor.id,
    action: "stage_transitioned",
    detail: { stageId: stage.id, stageName: stage.stageName, status, rationale },
  });

  revalidatePath(`/systems/${stage.aiSystemId}`);
}

export async function attachEvidence(aiSystemId: string, formData: FormData) {
  const label = String(formData.get("label") ?? "").trim() || null;
  const linkUrl = String(formData.get("linkUrl") ?? "").trim();
  const workflowStageId = String(formData.get("workflowStageId") ?? "") || null;
  const file = formData.get("file");

  const actor = await getCurrentUser();
  await assertSystemEditable(aiSystemId);

  let evidence;
  if (file instanceof File && file.size > 0) {
    const fileUrl = await uploadEvidenceFile(file);
    evidence = await prisma.evidenceItem.create({
      data: {
        aiSystemId,
        workflowStageId,
        type: "FILE",
        fileUrl,
        label: label ?? file.name,
        uploadedById: actor.id,
      },
    });
  } else if (linkUrl) {
    evidence = await prisma.evidenceItem.create({
      data: {
        aiSystemId,
        workflowStageId,
        type: "LINK",
        linkUrl,
        label,
        uploadedById: actor.id,
      },
    });
  } else {
    throw new Error("Attach either a file or a link");
  }

  await logAuditEntry({
    aiSystemId,
    actorId: actor.id,
    action: "evidence_attached",
    detail: { evidenceId: evidence.id, type: evidence.type, label: evidence.label },
  });

  revalidatePath(`/systems/${aiSystemId}`);
}
