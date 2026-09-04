"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/current-user";
import { DEFAULT_WORKFLOW_STAGES } from "@/lib/workflow";
import type { DataSensitivity, DeploymentStatus, StageStatus } from "@prisma/client";

export async function createAiSystem(formData: FormData) {
  const name = String(formData.get("name") ?? "").trim();
  if (!name) {
    throw new Error("Name is required");
  }
  const description = String(formData.get("description") ?? "").trim() || null;
  const businessUnit = String(formData.get("businessUnit") ?? "").trim() || null;
  const vendorName = String(formData.get("vendorName") ?? "").trim() || null;
  const dataSensitivity = String(
    formData.get("dataSensitivity") ?? "NONE",
  ) as DataSensitivity;
  const deploymentStatus = String(
    formData.get("deploymentStatus") ?? "PLANNED",
  ) as DeploymentStatus;

  const owner = await getCurrentUser();

  const system = await prisma.aiSystem.create({
    data: {
      name,
      description,
      businessUnit,
      vendorName,
      dataSensitivity,
      deploymentStatus,
      ownerId: owner.id,
      stages: {
        create: DEFAULT_WORKFLOW_STAGES.map((stage) => ({
          stageName: stage.stageName,
          sequence: stage.sequence,
        })),
      },
    },
  });

  await prisma.auditLogEntry.create({
    data: {
      aiSystemId: system.id,
      actorId: owner.id,
      action: "system_created",
      detail: { name, dataSensitivity, deploymentStatus },
    },
  });

  revalidatePath("/systems");
  redirect(`/systems/${system.id}`);
}

export async function decideStage(stageId: string, formData: FormData) {
  const status = String(formData.get("status") ?? "") as StageStatus;
  const rationale = String(formData.get("rationale") ?? "").trim();
  if (!status) {
    throw new Error("Status is required");
  }

  const actor = await getCurrentUser();

  const stage = await prisma.workflowStage.update({
    where: { id: stageId },
    data: {
      status,
      decisionRationale: rationale || null,
      decidedAt: new Date(),
      ownerId: actor.id,
    },
  });

  await prisma.auditLogEntry.create({
    data: {
      aiSystemId: stage.aiSystemId,
      actorId: actor.id,
      action: "stage_transitioned",
      detail: { stageId: stage.id, stageName: stage.stageName, status, rationale },
    },
  });

  revalidatePath(`/systems/${stage.aiSystemId}`);
}
