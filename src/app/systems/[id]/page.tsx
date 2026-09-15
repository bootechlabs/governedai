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
import { isStageActionable, needsRecertification } from "@/lib/workflow";
import { USE_CASE_TEMPLATE_LABELS, getTrackedStates } from "@/lib/risk-classification";
import { computeRegulationSectionStatuses } from "@/lib/regulation-sections";
import { inputClass, primaryButtonClass, subtleLinkClass } from "@/lib/ui";
import { DeleteSystemButton } from "./delete-button";
import { ShareLinkForm } from "./share-link-form";
import { RevokeShareLinkButton } from "./revoke-share-link-button";
import { getCurrentUser } from "@/lib/current-user";
import { canManageSystem, canDecideStage, canCreateSystem } from "@/lib/permissions";

export const dynamic = "force-dynamic";

type TabKey = "risk" | "workflow" | "evidence" | "audit";
const TAB_KEYS: TabKey[] = ["risk", "workflow", "evidence", "audit"];
const TAB_CONFIG: Record<TabKey, { label: string; icon: typeof ShieldAlert }> = {
  risk: { label: "Risk classification", icon: ShieldAlert },
  workflow: { label: "Workflow", icon: GitBranch },
  evidence: { label: "Evidence", icon: Paperclip },
  audit: { label: "Audit log", icon: ScrollText },
};

export default async function SystemDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ tab?: string }>;
}) {
  const { id } = await params;
  const { tab: tabParam } = await searchParams;
  const tab: TabKey = TAB_KEYS.includes(tabParam as TabKey) ? (tabParam as TabKey) : "risk";
  const actor = await getCurrentUser();

  const system = await prisma.aiSystem.findUnique({
    where: { id, organizationId: actor.organizationId },
    include: {
      owner: true,
      stages: { orderBy: { sequence: "asc" }, include: { owner: true } },
      evidence: { orderBy: { uploadedAt: "desc" }, include: { uploadedBy: true } },
      auditLog: { orderBy: { occurredAt: "desc" }, include: { actor: true } },
      riskClassification: {
        include: {
          completedBy: true,
          triggeredRegulationRows: { include: { regulation: { include: { artifacts: true } } } },
        },
      },
      vendor: true,
      changeEvents: { orderBy: { occurredAt: "desc" }, take: 1 },
      shareLinks: {
        orderBy: { createdAt: "desc" },
        include: { _count: { select: { views: true } } },
      },
    },
  });

  if (!system) notFound();

  const vendors = await prisma.vendor.findMany({
    where: { organizationId: actor.organizationId },
    select: { name: true },
  });

  const activeRegulations = await prisma.regulationDefinition.findMany({
    where: { active: true },
    select: { id: true, triggerConfig: true },
  });
  const trackedStates = getTrackedStates(activeRegulations);

  const triggeredRegulations =
    system.riskClassification?.triggeredRegulationRows.map((row) => ({
      id: row.regulation.id,
      code: row.regulation.code,
      label: row.regulation.label,
      citation: row.regulation.citation,
      summary: row.regulation.summary,
      artifacts: row.regulation.artifacts,
    })) ?? [];

  const isArchived = !!system.archivedAt;
  const canManage = canManageSystem(actor.role);
  const canDecide = canDecideStage(actor.role);
  const canAssessRisk = canCreateSystem(actor.role);
  const needsRecert = needsRecertification(
    system.changeEvents[0]?.occurredAt ?? null,
    system.stages,
  );

  // Everything a reviewer would otherwise have to read all four tabs to
  // find — built from data already fetched above, no extra queries. Each
  // item links straight to the tab that resolves it.
  const actionItems: { label: string; tab: TabKey }[] = [];
  if (!isArchived) {
    if (!system.riskClassification) {
      actionItems.push({ label: "No risk assessment has been run yet", tab: "risk" });
    }
    const pendingStageCount = system.stages.filter((s) => isStageActionable(s.status)).length;
    if (pendingStageCount > 0) {
      actionItems.push({
        label: `${pendingStageCount} workflow stage${pendingStageCount === 1 ? "" : "s"} awaiting a decision`,
        tab: "workflow",
      });
    }
    if (system.riskClassification) {
      const missingArtifacts = computeRegulationSectionStatuses(
        triggeredRegulations,
        system.evidence,
      ).flatMap((section) => section.artifacts.filter((a) => !a.onFile));
      if (missingArtifacts.length > 0) {
        actionItems.push({
          label: `${missingArtifacts.length} compliance item${missingArtifacts.length === 1 ? "" : "s"} missing evidence`,
          tab: "evidence",
        });
      }
    }
    if (needsRecert) {
      actionItems.push({ label: "Changed since last review — recertification recommended", tab: "workflow" });
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
              <li key={item.label}>
                <Link href={`/systems/${system.id}?tab=${item.tab}`} className="underline hover:no-underline">
                  {item.label}
                </Link>
              </li>
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
              className="flex flex-col gap-4"
            >
              <div className="flex flex-col gap-3">
                <span className="text-xs uppercase tracking-wide text-zinc-500">Basic info</span>
                <div className="flex flex-col gap-1">
                  <label htmlFor="edit-name" className="text-xs text-zinc-500">
                    Name
                  </label>
                  <input
                    id="edit-name"
                    name="name"
                    defaultValue={system.name}
                    required
                    className={inputClass}
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label htmlFor="edit-description" className="text-xs text-zinc-500">
                    Description
                  </label>
                  <textarea
                    id="edit-description"
                    name="description"
                    defaultValue={system.description ?? ""}
                    className={inputClass}
                  />
                </div>
              </div>

              <div className="flex flex-col gap-3 border-t border-zinc-200 pt-4 dark:border-zinc-800">
                <span className="text-xs uppercase tracking-wide text-zinc-500">Classification</span>
                <div className="grid grid-cols-2 gap-3">
                  <div className="flex flex-col gap-1">
                    <label htmlFor="edit-businessUnit" className="text-xs text-zinc-500">
                      Business unit
                    </label>
                    <input
                      id="edit-businessUnit"
                      name="businessUnit"
                      defaultValue={system.businessUnit ?? ""}
                      className={inputClass}
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label htmlFor="edit-vendorName" className="text-xs text-zinc-500">
                      Vendor
                    </label>
                    <input
                      id="edit-vendorName"
                      name="vendorName"
                      defaultValue={system.vendorName ?? ""}
                      list="vendor-names"
                      className={inputClass}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="flex flex-col gap-1">
                    <label htmlFor="edit-classification" className="text-xs text-zinc-500">
                      Data classification
                    </label>
                    <select
                      id="edit-classification"
                      name="classification"
                      defaultValue={system.classification}
                      className={inputClass}
                    >
                      <option value="PUBLIC">Public</option>
                      <option value="INTERNAL">Internal</option>
                      <option value="CONFIDENTIAL">Confidential</option>
                      <option value="RESTRICTED">Restricted</option>
                    </select>
                  </div>
                  <div className="flex flex-col gap-1">
                    <label htmlFor="edit-deploymentStatus" className="text-xs text-zinc-500">
                      Deployment status
                    </label>
                    <select
                      id="edit-deploymentStatus"
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
                </div>
              </div>

              {trackedStates.length > 0 && (
                <div className="flex flex-col gap-3 border-t border-zinc-200 pt-4 dark:border-zinc-800">
                  <span className="text-xs uppercase tracking-wide text-zinc-500">Regulatory</span>
                  <div className="flex flex-col gap-1">
                    <span className="text-xs text-zinc-500">
                      States this system is deployed/used in — only states with a tracked AI law are
                      listed here.
                    </span>
                    <div className="flex flex-wrap gap-3">
                      {trackedStates.map((state) => (
                        <label key={state} className="flex items-center gap-1.5 text-sm">
                          <input
                            type="checkbox"
                            name="statesDeployed"
                            value={state}
                            defaultChecked={system.statesDeployed.includes(state)}
                          />
                          {state}
                        </label>
                      ))}
                    </div>
                  </div>
                </div>
              )}

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

      <div role="tablist" className="mt-8 flex gap-1 border-b border-zinc-200 dark:border-zinc-800">
        {TAB_KEYS.map((key) => {
          const config = TAB_CONFIG[key];
          const Icon = config.icon;
          const active = tab === key;
          return (
            <Link
              key={key}
              href={`/systems/${system.id}?tab=${key}`}
              role="tab"
              aria-selected={active}
              className={`flex items-center gap-1.5 border-b-2 px-3 py-2 text-sm font-medium ${
                active
                  ? "border-zinc-900 text-zinc-900 dark:border-zinc-100 dark:text-zinc-100"
                  : "border-transparent text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300"
              }`}
            >
              <Icon size={16} />
              {config.label}
            </Link>
          );
        })}
      </div>

      {tab === "risk" && (
      <div role="tabpanel">
      {system.riskClassification ? (
        <div className="mt-4 rounded-lg border border-zinc-200 p-4 dark:border-zinc-800">
          <div className="flex flex-wrap items-center gap-3">
            <RiskTierBadge value={system.riskClassification.riskTier} />
            <span className="text-sm text-zinc-500">
              {USE_CASE_TEMPLATE_LABELS[system.riskClassification.useCaseTemplate]}
            </span>
          </div>
          {triggeredRegulations.length > 0 && (
            <div className="mt-3">
              <p className="text-xs text-zinc-500">
                Likely applies — verify with counsel, this is not a legal determination:
              </p>
              <ul className="mt-1 flex flex-wrap gap-2">
                {triggeredRegulations.map((reg) => (
                  <li
                    key={reg.id}
                    className="rounded bg-zinc-100 px-2 py-0.5 text-xs dark:bg-zinc-800"
                  >
                    {reg.label}
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
      </div>
      )}

      {tab === "workflow" && (
      <div role="tabpanel">
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
            {needsRecert && !isStageActionable(stage.status) && (
              <p className="mt-2 text-xs text-amber-600 dark:text-amber-400">
                Changed since this decision — recertify below.
              </p>
            )}
            {(isStageActionable(stage.status) || needsRecert) && !isArchived && canDecide ? (
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
      </div>
      )}

      {tab === "evidence" && (
      <div role="tabpanel">
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
      </div>
      )}

      {tab === "audit" && (
      <div role="tabpanel">
      <div className="mt-4 flex justify-end gap-3 text-sm">
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

      {canManage && (
        <div className="mt-4 rounded-lg border border-zinc-200 p-4 dark:border-zinc-800">
          <span className="text-xs uppercase tracking-wide text-zinc-500">Share with auditor</span>
          <ShareLinkForm aiSystemId={system.id} />
          {system.shareLinks.length > 0 && (
            <ul className="mt-4 flex flex-col gap-2 text-sm">
              {system.shareLinks.map((link) => {
                const isRevoked = !!link.revokedAt;
                const isExpired = !isRevoked && link.expiresAt < new Date();
                const status = isRevoked ? "Revoked" : isExpired ? "Expired" : "Active";
                return (
                  <li key={link.id} className="flex items-center justify-between gap-2">
                    <span className="text-zinc-600 dark:text-zinc-400">
                      {link.tokenPrefix}… · created {link.createdAt.toISOString().slice(0, 10)} ·
                      expires {link.expiresAt.toISOString().slice(0, 10)} · {link._count.views} view
                      {link._count.views === 1 ? "" : "s"} ·{" "}
                      <span
                        className={
                          status === "Active"
                            ? "text-emerald-600 dark:text-emerald-400"
                            : "text-zinc-500"
                        }
                      >
                        {status}
                      </span>
                    </span>
                    {status === "Active" && (
                      <RevokeShareLinkButton aiSystemId={system.id} shareLinkId={link.id} />
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}

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
      )}
    </div>
  );
}
