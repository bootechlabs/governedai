import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { createAiSystem } from "./actions";

export const dynamic = "force-dynamic";

const gridCols = "grid-cols-[2fr_1fr_1fr_110px_120px_1.5fr]";
const cellClass = "px-3 py-2 flex items-center";
const inputClass =
  "w-full rounded border border-zinc-300 bg-transparent px-2 py-1 text-sm dark:border-zinc-700";

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
        className="mt-6 min-w-[900px] overflow-x-auto rounded-lg border border-zinc-200 dark:border-zinc-800"
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
            Sensitivity
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
              className={inputClass}
            />
          </span>
          <span role="cell" className={cellClass}>
            <input
              form="new-system-form"
              name="businessUnit"
              placeholder="Business unit"
              className={inputClass}
            />
          </span>
          <span role="cell" className={cellClass}>
            <input
              form="new-system-form"
              name="vendorName"
              placeholder="Vendor"
              className={inputClass}
            />
          </span>
          <span role="cell" className={cellClass}>
            <select
              form="new-system-form"
              name="dataSensitivity"
              defaultValue="NONE"
              className={inputClass}
            >
              <option value="NONE">None</option>
              <option value="PII">PII</option>
              <option value="PHI">PHI</option>
            </select>
          </span>
          <span role="cell" className={cellClass}>
            <select
              form="new-system-form"
              name="deploymentStatus"
              defaultValue="PLANNED"
              className={inputClass}
            >
              <option value="PLANNED">Planned</option>
              <option value="PILOT">Pilot</option>
              <option value="PRODUCTION">Production</option>
              <option value="RETIRED">Retired</option>
            </select>
          </span>
          <span role="cell" className={cellClass}>
            <button
              form="new-system-form"
              type="submit"
              className="rounded bg-black px-3 py-1.5 text-sm font-medium text-white dark:bg-white dark:text-black"
            >
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
              {system.dataSensitivity}
            </span>
            <span role="cell" className={cellClass}>
              {system.deploymentStatus}
            </span>
            <span role="cell" className={`${cellClass} text-zinc-500`}>
              {system.stages.map((s) => s.status).join(" → ")}
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}
