"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/current-user";
import { canCreateSystem } from "@/lib/permissions";
import { assertSystemEditable } from "@/lib/ai-systems";
import { logAuditEntry } from "@/lib/audit-log";
import { getQuestionsForTemplate, computeRiskClassification } from "@/lib/risk-classification";
import type { UseCaseTemplate } from "@prisma/client";

export async function submitRiskAssessment(aiSystemId: string, formData: FormData) {
  const actor = await getCurrentUser();
  if (!canCreateSystem(actor.role)) {
    throw new Error("Your role can't run a risk assessment");
  }
  await assertSystemEditable(aiSystemId, actor.organizationId);

  const template = String(formData.get("template") ?? "") as UseCaseTemplate;
  const questions = getQuestionsForTemplate(template);
  if (questions.length === 0 && template !== "GENERIC") {
    throw new Error("Invalid use case template");
  }

  const answers: Record<string, number> = {};
  for (const question of questions) {
    const raw = formData.get(question.key);
    const weight = Number(raw);
    if (raw === null || Number.isNaN(weight)) {
      throw new Error(`Missing answer for: ${question.text}`);
    }
    answers[question.key] = weight;
  }

  const { riskTier, triggeredRegulations } = computeRiskClassification(template, answers);

  await prisma.riskClassification.upsert({
    where: { aiSystemId },
    create: {
      aiSystemId,
      useCaseTemplate: template,
      answers,
      riskTier,
      triggeredRegulations,
      completedById: actor.id,
    },
    update: {
      useCaseTemplate: template,
      answers,
      riskTier,
      triggeredRegulations,
      completedById: actor.id,
      completedAt: new Date(),
    },
  });

  await logAuditEntry({
    aiSystemId,
    actorId: actor.id,
    action: "risk_classified",
    detail: { useCaseTemplate: template, riskTier, triggeredRegulations },
  });

  revalidatePath(`/systems/${aiSystemId}`);
  redirect(`/systems/${aiSystemId}`);
}
