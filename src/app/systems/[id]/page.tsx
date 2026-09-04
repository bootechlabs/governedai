import { notFound } from "next/navigation";
import Link from "next/link";
import { FileSpreadsheet, FileText } from "lucide-react";
import { prisma } from "@/lib/prisma";
import {
  decideStage,
  attachEvidence,
  updateAiSystem,
  archiveAiSystem,
  unarchiveAiSystem,
} from "../actions";
import { ClassificationBadge, DeploymentStatusBadge, StageStatusBadge } from "@/lib/badges";
import { isStageActionable } from "@/lib/workflow";
import { inputClass, primaryButtonClass, subtleLinkClass } from "@/lib/ui";
import { DeleteSystemButton } from "./delete-button";

export const dynamic = "force-dynamic";

export default async function SystemDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const system = await prisma.aiSystem.findUnique({
    where: { id },
    include: {
      owner: true,
      stages: { orderBy: { sequence: "asc" }, include: { owner: true } },
      evidence: { orderBy: { uploadedAt: "desc" }, include: { uploadedBy: true } },
      auditLog: { orderBy: { occurredAt: "desc" }, include: { actor: true } },
    },
  });

  if (!system) notFound();

  const isArchived = !!system.archivedAt;

  return (
    <div className="mx-auto max-w-3xl px-6 py-12">
      <Link href="/systems" className="text-sm text-zinc-500 hover:underline">
        ← All systems
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
        {system.vendorName && <span>Vendor: {system.vendorName}</span>}
      </div>
      {system.description && (
        <p className="mt-3 text-sm text-zinc-700 dark:text-zinc-300">
          {system.description}
        </p>
      )}

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

      <h2 className="mt-10 text-lg font-medium">Workflow</h2>
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
            {isStageActionable(stage.status) && !isArchived ? (
              <form
                action={decideStage.bind(null, stage.id)}
                className="mt-3 flex flex-col gap-2 sm:flex-row"
              >
                <select name="status" defaultValue="APPROVED" className={inputClass}>
                  <option value="IN_REVIEW">Move to in review</option>
                  <option value="APPROVED">Approve</option>
                  <option value="CONDITIONALLY_APPROVED">
                    Conditionally approve
                  </option>
                  <option value="REJECTED">Reject</option>
                </select>
                <input
                  name="rationale"
                  placeholder="Decision rationale"
                  className={`flex-1 ${inputClass}`}
                />
                <button type="submit" className={primaryButtonClass}>
                  Record decision
                </button>
              </form>
            ) : null}
          </li>
        ))}
      </ol>

      <h2 className="mt-10 text-lg font-medium">Evidence</h2>
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
            <span className="text-xs text-zinc-500">
              ({item.type.toLowerCase()}) — {item.uploadedBy.name ?? item.uploadedBy.email}
            </span>
          </li>
        ))}
      </ul>

      <div className="mt-10 flex items-center justify-between">
        <h2 className="text-lg font-medium">Audit log</h2>
        <div className="flex gap-3 text-sm">
          <a
            href={`/systems/${system.id}/audit?format=csv`}
            className={`inline-flex items-center gap-1.5 ${subtleLinkClass}`}
          >
            <FileSpreadsheet size={14} />
            Export CSV
          </a>
          <a
            href={`/systems/${system.id}/audit?format=pdf`}
            className={`inline-flex items-center gap-1.5 ${subtleLinkClass}`}
          >
            <FileText size={14} />
            Export PDF
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
