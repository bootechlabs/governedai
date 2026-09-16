import { notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/current-user";
import { canCreateSystem } from "@/lib/permissions";
import { primaryButtonClass, subtleLinkClass } from "@/lib/ui";
import {
  getQuestionsForTemplate,
  getSecondaryQuestions,
  USE_CASE_TEMPLATE_LABELS,
  type RiskQuestion,
} from "@/lib/risk-classification";
import { submitRiskAssessment } from "./actions";
import type { UseCaseTemplate } from "@prisma/client";

function QuestionFieldset({
  question,
  index,
  total,
  existingAnswers,
}: {
  question: RiskQuestion;
  index: number;
  total: number;
  existingAnswers: Record<string, number>;
}) {
  return (
    <fieldset>
      <legend className="text-sm font-medium">
        <span className="block text-xs font-normal uppercase tracking-wide text-zinc-500">
          Question {index + 1} of {total}
        </span>
        {question.text}
      </legend>
      <div className="mt-3 flex flex-col gap-2">
        {question.options.map((option, i) => (
          <label
            key={i}
            className="flex items-start gap-3 rounded-lg border border-zinc-200 px-3 py-2.5 text-sm has-[:checked]:border-zinc-500 dark:border-zinc-800 dark:has-[:checked]:border-zinc-500"
          >
            <input
              type="radio"
              name={question.key}
              value={option.weight}
              required
              defaultChecked={existingAnswers[question.key] === option.weight}
              className="mt-0.5"
            />
            <span>{option.label}</span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}

export const dynamic = "force-dynamic";

const TEMPLATE_KEYS = Object.keys(USE_CASE_TEMPLATE_LABELS) as UseCaseTemplate[];

export default async function RiskAssessmentPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ template?: string }>;
}) {
  const { id } = await params;
  const { template: templateParam } = await searchParams;
  const actor = await getCurrentUser();
  if (!canCreateSystem(actor.role)) notFound();

  const system = await prisma.aiSystem.findUnique({
    where: { id, organizationId: actor.organizationId },
    include: { riskClassification: true },
  });
  if (!system) notFound();

  const template = TEMPLATE_KEYS.includes(templateParam as UseCaseTemplate)
    ? (templateParam as UseCaseTemplate)
    : null;

  if (!template) {
    return (
      <div className="mx-auto max-w-2xl px-6 py-12">
        <Link href={`/systems/${id}`} className={`text-sm ${subtleLinkClass}`}>
          ← Back to {system.name}
        </Link>

        <h1 className="mt-2 text-2xl font-semibold tracking-tight">Run risk assessment</h1>
        <p className="mt-1 text-sm text-zinc-500">
          Pick the use case that best matches this system. Each one asks a couple of extra
          questions on top of the shared core set.
        </p>

        <div className="mt-6 flex flex-col gap-2">
          {TEMPLATE_KEYS.map((key) => (
            <Link
              key={key}
              href={`/systems/${id}/risk-assessment?template=${key}`}
              className="rounded-lg border border-zinc-200 px-4 py-3 text-sm font-medium hover:border-zinc-400 dark:border-zinc-800 dark:hover:border-zinc-600"
            >
              {USE_CASE_TEMPLATE_LABELS[key]}
            </Link>
          ))}
        </div>
      </div>
    );
  }

  const questions = getQuestionsForTemplate(template);
  const secondaryQuestions = getSecondaryQuestions(template);
  const existingAnswers =
    system.riskClassification?.useCaseTemplate === template
      ? (system.riskClassification.answers as Record<string, number>)
      : {};

  return (
    <div className="mx-auto max-w-2xl px-6 py-12">
      <Link href={`/systems/${id}/risk-assessment`} className={`text-sm ${subtleLinkClass}`}>
        ← Choose a different use case
      </Link>

      <h1 className="mt-2 text-2xl font-semibold tracking-tight">
        {USE_CASE_TEMPLATE_LABELS[template]}
      </h1>
      <p className="mt-1 text-sm text-zinc-500">
        Answer every question, then submit. This is a self-assessment, not a legal determination —
        flagged regulations should be verified with counsel.
      </p>

      <form action={submitRiskAssessment.bind(null, system.id)} className="mt-6 flex flex-col gap-8">
        <input type="hidden" name="template" value={template} />
        {questions.map((question, i) => (
          <QuestionFieldset
            key={question.key}
            question={question}
            index={i}
            total={questions.length}
            existingAnswers={existingAnswers}
          />
        ))}

        <div className="border-t border-zinc-200 pt-6 dark:border-zinc-800">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500">
            Supplementary risk assessment
          </h2>
          <p className="mt-1 text-xs text-zinc-500">
            GovernedAI&apos;s own risk lens across two domains — not derived from or aligned to
            any external certification or proprietary framework.
          </p>
        </div>
        {secondaryQuestions.map((question, i) => (
          <QuestionFieldset
            key={question.key}
            question={question}
            index={i}
            total={secondaryQuestions.length}
            existingAnswers={existingAnswers}
          />
        ))}

        <button type="submit" className={`self-start ${primaryButtonClass}`}>
          Submit assessment
        </button>
      </form>
    </div>
  );
}
