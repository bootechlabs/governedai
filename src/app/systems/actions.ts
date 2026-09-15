"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/current-user";
import { uploadEvidenceFile } from "@/lib/storage";
import { logAuditEntry } from "@/lib/audit-log";
import { createAiSystemRecord, assertSystemEditable, resolveVendorId } from "@/lib/ai-systems";
import { canCreateSystem, canManageSystem, canDecideStage } from "@/lib/permissions";
import { requiresRationale } from "@/lib/workflow";
import { detectChanges } from "@/lib/change-events";
import type { DataClassification, DeploymentStatus, StageStatus, EvidenceCategory } from "@prisma/client";

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
  if (!canCreateSystem(owner.role)) {
    throw new Error("Your role can't register new AI systems");
  }

  const system = await createAiSystemRecord({
    organizationId: owner.organizationId,
    ownerId: owner.id,
    actorId: owner.id,
    fields,
  });

  revalidatePath("/systems");
  redirect(`/systems/${system.id}`);
}

export async function updateAiSystem(aiSystemId: string, formData: FormData) {
  const fields = parseAiSystemFields(formData);
  const actor = await getCurrentUser();
  if (!canManageSystem(actor.role)) {
    throw new Error("Your role can't edit AI systems");
  }

  const before = await assertSystemEditable(aiSystemId, actor.organizationId);
  const vendorId = await resolveVendorId(actor.organizationId, fields.vendorName);

  await prisma.aiSystem.update({ where: { id: aiSystemId }, data: { ...fields, vendorId } });

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

  const changes = detectChanges(
    {
      vendorName: before.vendorName,
      classification: before.classification,
      deploymentStatus: before.deploymentStatus,
      businessUnit: before.businessUnit,
    },
    {
      vendorName: fields.vendorName,
      classification: fields.classification,
      deploymentStatus: fields.deploymentStatus,
      businessUnit: fields.businessUnit,
    },
  );
  if (changes.length > 0) {
    await prisma.changeEvent.createMany({
      data: changes.map((change) => ({
        aiSystemId,
        actorId: actor.id,
        field: change.field,
        beforeValue: change.beforeValue,
        afterValue: change.afterValue,
      })),
    });
  }

  revalidatePath("/systems");
  revalidatePath(`/systems/${aiSystemId}`);
}

export async function deleteAiSystem(aiSystemId: string) {
  const actor = await getCurrentUser();
  if (!canManageSystem(actor.role)) {
    throw new Error("Your role can't delete AI systems");
  }
  const system = await prisma.aiSystem.findUniqueOrThrow({ where: { id: aiSystemId } });
  if (system.organizationId !== actor.organizationId) {
    throw new Error("Not found");
  }
  await prisma.aiSystem.delete({ where: { id: aiSystemId } });
  revalidatePath("/systems");
  redirect("/systems");
}

// Archiving (unlike delete) keeps workflow/evidence/audit history intact —
// for a retired tool a client still needs to review later, not lose.
export async function archiveAiSystem(aiSystemId: string) {
  const actor = await getCurrentUser();
  if (!canManageSystem(actor.role)) {
    throw new Error("Your role can't archive AI systems");
  }
  const system = await prisma.aiSystem.findUniqueOrThrow({ where: { id: aiSystemId } });
  if (system.organizationId !== actor.organizationId) {
    throw new Error("Not found");
  }
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
  if (!canManageSystem(actor.role)) {
    throw new Error("Your role can't unarchive AI systems");
  }
  const system = await prisma.aiSystem.findUniqueOrThrow({ where: { id: aiSystemId } });
  if (system.organizationId !== actor.organizationId) {
    throw new Error("Not found");
  }
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
  if (requiresRationale(status) && !rationale) {
    throw new Error("A rationale is required to reject or conditionally approve a stage");
  }

  const actor = await getCurrentUser();
  if (!canDecideStage(actor.role)) {
    throw new Error("Your role can't record workflow decisions");
  }

  const existingStage = await prisma.workflowStage.findUniqueOrThrow({
    where: { id: stageId },
    include: { aiSystem: true },
  });
  if (existingStage.aiSystem.organizationId !== actor.organizationId) {
    throw new Error("Not found");
  }
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
  const category = String(formData.get("category") ?? "GENERAL") as EvidenceCategory;
  const file = formData.get("file");

  const actor = await getCurrentUser();
  await assertSystemEditable(aiSystemId, actor.organizationId);

  let evidence;
  if (file instanceof File && file.size > 0) {
    const fileUrl = await uploadEvidenceFile(file);
    evidence = await prisma.evidenceItem.create({
      data: {
        aiSystemId,
        workflowStageId,
        type: "FILE",
        category,
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
        category,
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
    detail: { evidenceId: evidence.id, type: evidence.type, category: evidence.category, label: evidence.label },
  });

  revalidatePath(`/systems/${aiSystemId}`);
}
