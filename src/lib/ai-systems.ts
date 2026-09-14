import { prisma } from "@/lib/prisma";
import { DEFAULT_WORKFLOW_STAGES } from "@/lib/workflow";
import { logAuditEntry } from "@/lib/audit-log";
import type { AiSystem, Prisma } from "@prisma/client";
import type { AiSystemFieldInput } from "@/lib/ai-system-fields";

// Shared JSON shape for the public API — same fields whether it's a list
// item or a single get/create response.
export function serializeAiSystem(system: AiSystem) {
  return {
    id: system.id,
    name: system.name,
    description: system.description,
    businessUnit: system.businessUnit,
    vendorName: system.vendorName,
    classification: system.classification,
    deploymentStatus: system.deploymentStatus,
    createdAt: system.createdAt.toISOString(),
    updatedAt: system.updatedAt.toISOString(),
    archivedAt: system.archivedAt?.toISOString() ?? null,
  };
}

// Three entry points create an AiSystem the same way — the UI form, bulk
// import, and the public API — so the "create with default stages, then
// log it" sequence lives in one place instead of three.
export async function createAiSystemRecord({
  organizationId,
  ownerId,
  actorId,
  fields,
  auditDetail,
}: {
  organizationId: string;
  ownerId: string;
  actorId: string;
  fields: AiSystemFieldInput;
  auditDetail?: Prisma.InputJsonValue;
}) {
  const system = await prisma.aiSystem.create({
    data: {
      ...fields,
      organizationId,
      ownerId,
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
    actorId,
    action: "system_created",
    detail: auditDetail ?? ({ ...fields } as Prisma.InputJsonValue),
  });

  return system;
}
