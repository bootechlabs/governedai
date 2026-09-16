"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/current-user";
import { canCreateSystem } from "@/lib/permissions";
import { assertSystemEditable } from "@/lib/ai-systems";
import { logAuditEntry } from "@/lib/audit-log";
import {
  getQuestionsForTemplate,
  getSecondaryQuestions,
  computeRiskClassification,
  computeSecondaryRiskTiers,
} from "@/lib/risk-classification";
import type { UseCaseTemplate } from "@prisma/client";

export async function submitRiskAssessment(aiSystemId: string, formData: FormData) {
  const actor = await getCurrentUser();
  if (!canCreateSystem(actor.role)) {
    throw new Error("Your role can't run a risk assessment");
  }
  const system = await assertSystemEditable(aiSystemId, actor.organizationId);

  const template = String(formData.get("template") ?? "") as UseCaseTemplate;
  const questions = getQuestionsForTemplate(template);
  if (questions.length === 0 && template !== "GENERIC") {
    throw new Error("Invalid use case template");
  }

  const answers: Record<string, number> = {};
  for (const question of [...questions, ...getSecondaryQuestions(template)]) {
    const raw = formData.get(question.key);
    const weight = Number(raw);
    if (raw === null || Number.isNaN(weight)) {
      throw new Error(`Missing answer for: ${question.text}`);
    }
    answers[question.key] = weight;
  }

  const regulations = await prisma.regulationDefinition.findMany({
    where: { active: true },
    select: { id: true, triggerConfig: true },
  });

  const { riskTier, triggeredRegulationIds } = computeRiskClassification(
    template,
    answers,
    system.statesDeployed,
    regulations,
  );
  const { lifeSafetyTier, techDataTier } = computeSecondaryRiskTiers(template, answers);

  await prisma.$transaction(async (tx) => {
    const riskClassification = await tx.riskClassification.upsert({
      where: { aiSystemId },
      create: {
        aiSystemId,
        useCaseTemplate: template,
        answers,
        riskTier,
        lifeSafetyTier,
        techDataTier,
        completedById: actor.id,
      },
      update: {
        useCaseTemplate: template,
        answers,
        riskTier,
        lifeSafetyTier,
        techDataTier,
        completedById: actor.id,
        completedAt: new Date(),
      },
    });

    await tx.riskClassificationRegulation.deleteMany({
      where: { riskClassificationId: riskClassification.id },
    });
    if (triggeredRegulationIds.length > 0) {
      await tx.riskClassificationRegulation.createMany({
        data: triggeredRegulationIds.map((regulationId) => ({
          riskClassificationId: riskClassification.id,
          regulationId,
        })),
      });
    }
  });

  await logAuditEntry({
    aiSystemId,
    actorId: actor.id,
    action: "risk_classified",
    detail: { useCaseTemplate: template, riskTier, triggeredRegulationIds },
  });

  revalidatePath(`/systems/${aiSystemId}`);
  redirect(`/systems/${aiSystemId}`);
}
