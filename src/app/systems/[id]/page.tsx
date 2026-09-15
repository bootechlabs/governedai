import { notFound } from "next/navigation";
import Link from "next/link";
import {
  FileSpreadsheet,
  FileText,
  ArrowLeft,
  ShieldAlert,
  GitBranch,
  Paperclip,
  ScrollText,
  AlertTriangle,
} from "lucide-react";
import { prisma } from "@/lib/prisma";
import {
  decideStage,
  attachEvidence,
  updateAiSystem,
  archiveAiSystem,
  unarchiveAiSystem,
} from "../actions";
import {
  ClassificationBadge,
  DeploymentStatusBadge,
  StageStatusBadge,
  RiskTierBadge,
  BaaStatusBadge,
  EvidenceCategoryBadge,
  evidenceCategoryLabels,
} from "@/lib/badges";
import { isStageActionable } from "@/lib/workflow";
import { USE_CASE_TEMPLATE_LABELS, REGULATION_LABELS } from "@/lib/risk-classification";
import { computeRegulationSectionStatuses } from "@/lib/regulation-sections";
import { inputClass, primaryButtonClass, subtleLinkClass } from "@/lib/ui";
import { DeleteSystemButton } from "./delete-button";
import { getCurrentUser } from "@/lib/current-user";
import { canManageSystem, canDecideStage, canCreateSystem } from "@/lib/permissions";

export const dynamic = "force-dynamic";

export default async function SystemDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const actor = await getCurrentUser();

  const system = await prisma.aiSystem.findUnique({
    where: { id, organizationId: actor.organizationId },
    include: {
      owner: true,
      stages: { orderBy: { sequence: "asc" }, include: { owner: true } },
      evidence: { orderBy: { uploadedAt: "desc" }, include: { uploadedBy: true } },
      auditLog: { orderBy: { occurredAt: "desc" }, include: { actor: true } },
      riskClassification: { include: { completedBy: true } },
      vendor: true,
    },
  });

  if (!system) notFound();

  const vendors = await prisma.vendor.findMany({
    where: { organizationId: actor.organizationId },
    select: { name: true },
  });

  const isArchived = !!system.archivedAt;
  const canManage = canManageSystem(actor.role);
  const canDecide = canDecideStage(actor.role);
  const canAssessRisk = canCreateSystem(actor.role);

  // Everything a reviewer would otherwise have to read all five sections
  // to find — built from data already fetched above, no extra queries.
  const actionItems: string[] = [];
  if (!isArchived) {
    if (!system.riskClassification) {
      actionItems.push("No risk assessment has been run yet");
    }
    const pendingStageCount = system.stages.filter((s) => isStageActionable(s.status)).length;
    if (pendingStageCount > 0) {
      actionItems.push(
        `${pendingStageCount} workflow stage${pendingStageCount === 1 ? "" : "s"} awaiting a decision`,
      );
    }
    if (system.riskClassification) {
      const missingArtifacts = computeRegulationSectionStatuses(
        system.riskClassification.triggeredRegulations,
        system.evidence,
      ).flatMap((section) => section.artifacts.filter((a) => !a.onFile));
      if (missingArtifacts.length > 0) {
        actionItems.push(
          `${missingArtifacts.length} compliance item${missingArtifacts.length === 1 ? "" : "s"} missing evidence`,
        );
      }
    }
  }

  return (
    <div className="mx-auto max-w-3xl px-6 py-12">
      <Link href="/systems/inventory" className="inline-flex items-center gap-1 text-sm text-zinc-500 hover:underline">
        <ArrowLeft size={14} />
        All systems
      </Link>

      {system.archivedAt && (
        <div className="mt-3 rounded-lg border border-amber-300 bg-amber-50 px-4 py-2 text-sm text-amber-800 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-300">
          Archived {system.archivedAt.toISOString().slice(0, 10)} — hidden from the active
          inventory, view-only.
        </div>
      )}

      <h1 className="mt-2 text-2xl font-semibold tracking-tight">{system.name}</h1>
      <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-zinc-500">
        <span>Owner: {system.owner.name ?? system.owner.email}</span>
        <DeploymentStatusBadge value={system.deploymentStatus} />
        <ClassificationBadge value={system.classification} />
        {!system.vendor && system.vendorName && <span>Vendor: {system.vendorName}</span>}
      </div>

      {actionItems.length > 0 && (
        <div className="mt-3 rounded-lg border border-red-300 bg-red-50 px-4 py-2 text-sm text-red-800 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300">
          <div className="flex items-center gap-1.5 font-medium">
            <AlertTriangle size={14} />
            Needs attention
          </div>
          <ul className="mt-1 list-disc pl-5">
            {actionItems.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>
      )}

      {system.vendor && (
        <div className="mt-3 flex flex-wrap items-center gap-3 rounded-lg border border-zinc-200 px-3 py-2 text-sm dark:border-zinc-800">
          <Link href={`/systems/vendors/${system.vendor.id}`} className="font-medium underline hover:no-underline">
            {system.vendor.name}
          </Link>
          <BaaStatusBadge value={system.vendor.baaStatus} />
          {system.vendor.subprocessors.length > 0 && (
            <span className="text-xs text-zinc-500">
              {system.vendor.subprocessors.length} subprocessor
              {system.vendor.subprocessors.length === 1 ? "" : "s"}
            </span>
          )}
          {system.vendor.soc2ReportUrl && (
            <a href={system.vendor.soc2ReportUrl} target="_blank" rel="noopener noreferrer" className="text-xs underline hover:no-underline">
              SOC 2 report
            </a>
          )}
          {system.vendor.modelCardUrl && (
            <a href={system.vendor.modelCardUrl} target="_blank" rel="noopener noreferrer" className="text-xs underline hover:no-underline">
              Model card
            </a>
          )}
        </div>
      )}
      {system.description && (
        <p className="mt-3 text-sm text-zinc-700 dark:text-zinc-300">
          {system.description}
        </p>
      )}

      {canManage && (
      <details className="mt-4 rounded-lg border border-zinc-200 dark:border-zinc-800">
        <summary className="cursor-pointer px-4 py-2 text-sm font-medium text-zinc-600 dark:text-zinc-400">
          {isArchived ? "System actions" : "Edit system details"}
        </summary>
        <div className="border-t border-zinc-200 p-4 dark:border-zinc-800">
          {isArchived ? (
            <p className="text-sm text-zinc-500">
              Unarchive this system to edit it, record decisions, or attach evidence.
            </p>
          ) : (
            <form
              action={updateAiSystem.bind(null, system.id)}
              className="flex flex-col gap-3"
            >
              <input name="name" defaultValue={system.name} required className={inputClass} />
              <textarea
                name="description"
                defaultValue={system.description ?? ""}
                placeholder="Description"
                className={inputClass}
              />
              <div className="grid grid-cols-2 gap-3">
                <input
                  name="businessUnit"
                  defaultValue={system.businessUnit ?? ""}
                  placeholder="Business unit"
                  className={inputClass}
                />
                <input
                  name="vendorName"
                  defaultValue={system.vendorName ?? ""}
                  placeholder="Vendor"
                  list="vendor-names"
                  className={inputClass}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <select
                  name="classification"
                  defaultValue={system.classification}
                  className={inputClass}
                >
                  <option value="PUBLIC">Public</option>
                  <option value="INTERNAL">Internal</option>
                  <option value="CONFIDENTIAL">Confidential</option>
                  <option value="RESTRICTED">Restricted</option>
                </select>
                <select
                  name="deploymentStatus"
                  defaultValue={system.deploymentStatus}
                  className={inputClass}
                >
                  <option value="PLANNED">Planned</option>
                  <option value="PILOT">Pilot</option>
                  <option value="PRODUCTION">Production</option>
                  <option value="RETIRED">Retired</option>
                </select>
              </div>
              <button type="submit" className={`self-start ${primaryButtonClass}`}>
                Save changes
              </button>
              <datalist id="vendor-names">
                {vendors.map((v) => (
                  <option key={v.name} value={v.name} />
                ))}
              </datalist>
            </form>
          )}
          <div className="mt-4 flex items-center gap-4 border-t border-zinc-200 pt-4 dark:border-zinc-800">
            {isArchived ? (
              <form action={unarchiveAiSystem.bind(null, system.id)}>
                <button type="submit" className={subtleLinkClass}>
                  Unarchive this AI system
                </button>
              </form>
            ) : (
              <form action={archiveAiSystem.bind(null, system.id)}>
                <button type="submit" className={subtleLinkClass}>
                  Archive this AI system
                </button>
              </form>
            )}
            <DeleteSystemButton aiSystemId={system.id} systemName={system.name} />
          </div>
        </div>
      </details>
      )}

      <h2 className="mt-10 flex items-center gap-2 text-lg font-medium">
        <ShieldAlert size={18} />
        Risk classification
      </h2>
      {system.riskClassification ? (
        <div className="mt-4 rounded-lg border border-zinc-200 p-4 dark:border-zinc-800">
          <div className="flex flex-wrap items-center gap-3">
            <RiskTierBadge value={system.riskClassification.riskTier} />
            <span className="text-sm text-zinc-500">
              {USE_CASE_TEMPLATE_LABELS[system.riskClassification.useCaseTemplate]}
            </span>
          </div>
          {system.riskClassification.triggeredRegulations.length > 0 && (
            <div className="mt-3">
              <p className="text-xs text-zinc-500">
                Likely applies — verify with counsel, this is not a legal determination:
              </p>
              <ul className="mt-1 flex flex-wrap gap-2">
                {system.riskClassification.triggeredRegulations.map((reg) => (
                  <li
                    key={reg}
                    className="rounded bg-zinc-100 px-2 py-0.5 text-xs dark:bg-zinc-800"
                  >
                    {REGULATION_LABELS[reg]}
                  </li>
                ))}
              </ul>
            </div>
          )}
          <p className="mt-3 text-xs text-zinc-500">
            Assessed by {system.riskClassification.completedBy.name ?? system.riskClassification.completedBy.email}{" "}
            on {system.riskClassification.completedAt.toISOString().slice(0, 10)}
          </p>
          {canAssessRisk && !isArchived && (
            <Link href={`/systems/${system.id}/risk-assessment`} className={`mt-3 inline-block text-sm ${subtleLinkClass}`}>
              Retake assessment
            </Link>
          )}
        </div>
      ) : (
        <div className="mt-4 rounded-lg border border-zinc-200 p-4 text-sm text-zinc-500 dark:border-zinc-800">
          No risk assessment yet.{" "}
          {canAssessRisk && !isArchived && (
            <Link href={`/systems/${system.id}/risk-assessment`} className="underline hover:no-underline">
              Run risk assessment
            </Link>
          )}
        </div>
      )}

      <h2 className="mt-10 flex items-center gap-2 text-lg font-medium">
        <GitBranch size={18} />
        Workflow
      </h2>
      <ol className="mt-4 flex flex-col gap-4">
        {system.stages.map((stage) => (
          <li
            key={stage.id}
            className="rounded-lg border border-zinc-200 p-4 dark:border-zinc-800"
          >
            <div className="flex items-center justify-between">
              <span className="font-medium">
                {stage.sequence}. {stage.stageName}
              </span>
              <StageStatusBadge value={stage.status} />
            </div>
            {stage.decisionRationale && (
              <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
                {stage.decisionRationale}
              </p>
            )}
            {isStageActionable(stage.status) && !isArchived && canDecide ? (
              <form action={decideStage.bind(null, stage.id)} className="mt-3 flex flex-col gap-2">
                <input
                  name="rationale"
                  placeholder="Decision rationale (required to reject or conditionally approve)"
                  className={inputClass}
                />
                <div className="flex flex-wrap gap-2">
                  <button
                    type="submit"
                    name="status"
                    value="APPROVED"
                    className="rounded bg-emerald-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-emerald-700"
                  >
                    Approve
                  </button>
                  <button
                    type="submit"
                    name="status"
                    value="CONDITIONALLY_APPROVED"
                    className="rounded border border-amber-500 px-3 py-1.5 text-sm font-medium text-amber-700 hover:bg-amber-50 dark:text-amber-400 dark:hover:bg-amber-950/40"
                  >
                    Conditionally approve
                  </button>
                  <button
                    type="submit"
                    name="status"
                    value="REJECTED"
                    className="rounded border border-red-500 px-3 py-1.5 text-sm font-medium text-red-700 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/40"
                  >
                    Reject
                  </button>
                  <button
                    type="submit"
                    name="status"
                    value="IN_REVIEW"
                    className="text-sm text-zinc-500 underline hover:no-underline"
                  >
                    Move to in review
                  </button>
                </div>
              </form>
            ) : null}
          </li>
        ))}
      </ol>

      <h2 className="mt-10 flex items-center gap-2 text-lg font-medium">
        <Paperclip size={18} />
        Evidence
      </h2>
      {!isArchived && (
        <form
          action={attachEvidence.bind(null, system.id)}
          className="mt-4 flex flex-col gap-2 rounded-lg border border-zinc-200 p-4 dark:border-zinc-800 sm:flex-row sm:items-center"
        >
          <input
            type="file"
            name="file"
            className="text-sm file:mr-2 file:rounded file:border-0 file:bg-zinc-200 file:px-2 file:py-1 file:text-xs dark:file:bg-zinc-800"
          />
          <input
            name="linkUrl"
            placeholder="or paste a link"
            className={`flex-1 ${inputClass}`}
          />
          <input name="label" placeholder="Label (optional)" className={inputClass} />
          <select name="category" defaultValue="GENERAL" className={inputClass}>
            {Object.entries(evidenceCategoryLabels).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
          <button type="submit" className={primaryButtonClass}>
            Attach
          </button>
        </form>
      )}
      <ul className="mt-4 flex flex-col gap-2 text-sm">
        {system.evidence.length === 0 && (
          <li className="text-zinc-500">No evidence attached yet.</li>
        )}
        {system.evidence.map((item) => (
          <li key={item.id} className="flex items-center gap-2">
            <a
              href={item.fileUrl ?? item.linkUrl ?? "#"}
              target="_blank"
              rel="noopener noreferrer"
              className="text-zinc-700 underline hover:no-underline dark:text-zinc-300"
            >
              {item.label ?? item.fileUrl ?? item.linkUrl}
            </a>
            <EvidenceCategoryBadge value={item.category} />
            <span className="text-xs text-zinc-500">
              ({item.type.toLowerCase()}) — {item.uploadedBy.name ?? item.uploadedBy.email}
            </span>
          </li>
        ))}
      </ul>

      <div className="mt-10 flex items-center justify-between">
        <h2 className="flex items-center gap-2 text-lg font-medium">
          <ScrollText size={18} />
          Audit log
        </h2>
        <div className="flex gap-3 text-sm">
          <a
            href={`/systems/${system.id}/audit?format=csv`}
            className={`inline-flex items-center gap-1.5 ${subtleLinkClass}`}
          >
            <FileSpreadsheet size={14} />
            Raw audit log (CSV)
          </a>
          <a
            href={`/systems/${system.id}/audit?format=pdf`}
            className={`inline-flex items-center gap-1.5 ${subtleLinkClass}`}
          >
            <FileText size={14} />
            Full governance report (PDF)
          </a>
        </div>
      </div>
      <ul className="mt-4 flex flex-col gap-2 text-sm">
        {system.auditLog.length === 0 && (
          <li className="text-zinc-500">No activity yet.</li>
        )}
        {system.auditLog.map((entry) => (
          <li key={entry.id} className="text-zinc-600 dark:text-zinc-400">
            {entry.occurredAt.toISOString()} — {entry.actor.name ?? entry.actor.email}{" "}
            — {entry.action}
          </li>
        ))}
      </ul>
    </div>
  );
}
