import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { createAiSystem } from "./actions";
import { ClassificationBadge, DeploymentStatusBadge, StageStatusBadge } from "@/lib/badges";
import { inputClass, primaryButtonClass } from "@/lib/ui";

export const dynamic = "force-dynamic";

const gridCols = "grid-cols-[2fr_1fr_1fr_150px_150px_1.8fr]";
const cellClass = "px-3 py-2 flex items-center";
const cellInputClass = `w-full ${inputClass}`;

export default async function SystemsPage() {
  const systems = await prisma.aiSystem.findMany({
    orderBy: { createdAt: "desc" },
    include: { owner: true, stages: { orderBy: { sequence: "asc" } } },
  });

  return (
    <div className="mx-auto max-w-6xl px-6 py-12">
      <h1 className="text-2xl font-semibold tracking-tight">AI system inventory</h1>

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

        {systems.length === 0 && (
          <div role="row" className={`grid ${gridCols}`}>
            <span role="cell" className={`${cellClass} text-zinc-500`}>
              No AI systems registered yet.
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
            <span role="cell" className={`${cellClass} font-medium`}>
              {system.name}
            </span>
            <span role="cell" className={`${cellClass} text-zinc-600 dark:text-zinc-400`}>
              {system.businessUnit ?? "—"}
            </span>
            <span role="cell" className={`${cellClass} text-zinc-600 dark:text-zinc-400`}>
              {system.vendorName ?? "—"}
            </span>
            <span role="cell" className={cellClass}>
              <ClassificationBadge value={system.classification} />
            </span>
            <span role="cell" className={cellClass}>
              <DeploymentStatusBadge value={system.deploymentStatus} />
            </span>
            <span role="cell" className={`${cellClass} gap-1.5`}>
              {system.stages.map((stage, i) => (
                <span key={stage.id} className="flex items-center gap-1.5">
                  {i > 0 && <ChevronRight size={12} className="text-zinc-400" />}
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
