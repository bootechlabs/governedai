import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { createAiSystem } from "./actions";
import { ClassificationBadge, DeploymentStatusBadge, StageStatusBadge } from "@/lib/badges";
import { inputClass, primaryButtonClass, subtleLinkClass } from "@/lib/ui";

export const dynamic = "force-dynamic";

const gridCols = "grid-cols-[2fr_1fr_1fr_150px_150px_1.8fr]";
const cellClass = "px-3 py-2 flex items-center";
const cellInputClass = `w-full ${inputClass}`;

export default async function SystemsPage({
  searchParams,
}: {
  searchParams: Promise<{ archived?: string }>;
}) {
  const { archived } = await searchParams;
  const showArchived = archived === "1";

  const [systems, activeCount, archivedCount] = await Promise.all([
    prisma.aiSystem.findMany({
      where: showArchived ? { archivedAt: { not: null } } : { archivedAt: null },
      orderBy: { createdAt: "desc" },
      include: { owner: true, stages: { orderBy: { sequence: "asc" } } },
    }),
    prisma.aiSystem.count({ where: { archivedAt: null } }),
    prisma.aiSystem.count({ where: { archivedAt: { not: null } } }),
  ]);

  return (
    <div className="mx-auto max-w-6xl px-6 py-12">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">
          {showArchived ? "Archived AI systems" : "AI system inventory"}
        </h1>
        <Link
          href={showArchived ? "/systems" : "/systems?archived=1"}
          className={subtleLinkClass}
        >
          {showArchived ? `← Active (${activeCount})` : `Archived (${archivedCount})`}
        </Link>
      </div>

      <form id="new-system-form" action={createAiSystem} />

      <div
        role="table"
        className="mt-6 min-w-[1000px] overflow-x-auto rounded-lg border border-zinc-200 dark:border-zinc-800"
      >
        <div
          role="row"
          className={`grid ${gridCols} border-b border-zinc-200 text-left text-xs uppercase tracking-wide text-zinc-500 dark:border-zinc-800`}
        >
          <span role="columnheader" className={cellClass}>
            Name
          </span>
          <span role="columnheader" className={cellClass}>
            Business unit
          </span>
          <span role="columnheader" className={cellClass}>
            Vendor
          </span>
          <span role="columnheader" className={cellClass}>
            Classification
          </span>
          <span role="columnheader" className={cellClass}>
            Status
          </span>
          <span role="columnheader" className={cellClass}>
            Stages
          </span>
        </div>

        {!showArchived && (
          <div
            role="row"
            className={`grid ${gridCols} border-b border-zinc-200 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900/40`}
          >
            <span role="cell" className={cellClass}>
              <input
                form="new-system-form"
                name="name"
                placeholder="New system name"
                required
                className={cellInputClass}
              />
            </span>
            <span role="cell" className={cellClass}>
              <input
                form="new-system-form"
                name="businessUnit"
                placeholder="Business unit"
                className={cellInputClass}
              />
            </span>
            <span role="cell" className={cellClass}>
              <input
                form="new-system-form"
                name="vendorName"
                placeholder="Vendor"
                className={cellInputClass}
              />
            </span>
            <span role="cell" className={cellClass}>
              <select
                form="new-system-form"
                name="classification"
                defaultValue="INTERNAL"
                className={cellInputClass}
              >
                <option value="PUBLIC">Public</option>
                <option value="INTERNAL">Internal</option>
                <option value="CONFIDENTIAL">Confidential</option>
                <option value="RESTRICTED">Restricted</option>
              </select>
            </span>
            <span role="cell" className={cellClass}>
              <select
                form="new-system-form"
                name="deploymentStatus"
                defaultValue="PLANNED"
                className={cellInputClass}
              >
                <option value="PLANNED">Planned</option>
                <option value="PILOT">Pilot</option>
                <option value="PRODUCTION">Production</option>
                <option value="RETIRED">Retired</option>
              </select>
            </span>
            <span role="cell" className={cellClass}>
              <button form="new-system-form" type="submit" className={primaryButtonClass}>
                Add
              </button>
            </span>
          </div>
        )}

        {systems.length === 0 && (
          <div role="row" className={`grid ${gridCols}`}>
            <span role="cell" className={`${cellClass} text-zinc-500`}>
              {showArchived ? "No archived AI systems." : "No AI systems registered yet."}
            </span>
          </div>
        )}
        {systems.map((system) => (
          <Link
            key={system.id}
            href={`/systems/${system.id}`}
            role="row"
            className={`grid ${gridCols} border-b border-zinc-200 last:border-0 hover:bg-zinc-50 dark:border-zinc-800 dark:hover:bg-zinc-900/60`}
          >
            <span
              role="cell"
              className="flex flex-col justify-center px-3 py-2 text-xs font-medium"
            >
              {system.name}
              {system.archivedAt && (
                <span className="font-normal text-zinc-500">
                  Archived {system.archivedAt.toISOString().slice(0, 10)}
                </span>
              )}
            </span>
            <span
              role="cell"
              className={`${cellClass} text-xs text-zinc-600 dark:text-zinc-400`}
            >
              {system.businessUnit ?? "—"}
            </span>
            <span
              role="cell"
              className={`${cellClass} text-xs text-zinc-600 dark:text-zinc-400`}
            >
              {system.vendorName ?? "—"}
            </span>
            <span role="cell" className={cellClass}>
              <ClassificationBadge value={system.classification} />
            </span>
            <span role="cell" className={cellClass}>
              <DeploymentStatusBadge value={system.deploymentStatus} />
            </span>
            <span role="cell" className={`${cellClass} gap-3`}>
              {system.stages.map((stage, i) => (
                <span
                  key={stage.id}
                  className={`flex flex-col gap-0.5 ${i > 0 ? "border-l border-zinc-200 pl-3 dark:border-zinc-800" : ""}`}
                >
                  <span className="text-[10px] uppercase tracking-wide text-zinc-400">
                    {stage.stageName}
                  </span>
                  <StageStatusBadge value={stage.status} />
                </span>
              ))}
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}
