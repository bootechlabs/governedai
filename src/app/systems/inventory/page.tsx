import Link from "next/link";
import { FileSpreadsheet, FileText } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { createAiSystem } from "../actions";
import { ClassificationBadge, DeploymentStatusBadge, StageStatusBadge, RiskTierBadge } from "@/lib/badges";
import { inputClass, primaryButtonClass, subtleLinkClass } from "@/lib/ui";
import { getCurrentUser } from "@/lib/current-user";
import { canCreateSystem } from "@/lib/permissions";
import type { DeploymentStatus, RiskTier, Prisma } from "@prisma/client";

export const dynamic = "force-dynamic";

const gridCols = "grid-cols-[2fr_1fr_1fr_150px_150px_150px_1.8fr]";
const cellClass = "px-3 py-2 flex items-center";
const cellInputClass = `w-full ${inputClass}`;

type SortKey = "name" | "businessUnit" | "vendorName" | "classification" | "deploymentStatus" | "riskTier";
type SortDir = "asc" | "desc";

const SORT_KEYS: SortKey[] = [
  "name",
  "businessUnit",
  "vendorName",
  "classification",
  "deploymentStatus",
  "riskTier",
];

const SORT_LABELS: Record<SortKey, string> = {
  name: "Name",
  businessUnit: "Business unit",
  vendorName: "Vendor",
  classification: "Classification",
  deploymentStatus: "Status",
  riskTier: "Risk",
};

// Each enum below is declared in Prisma in ramp order (e.g. PUBLIC → RESTRICTED,
// LOW → CRITICAL), so a plain asc/desc sort already reads as "least → most
// sensitive/advanced/risky" — no custom comparator needed.
function buildOrderBy(sort: SortKey | null, dir: SortDir): Prisma.AiSystemOrderByWithRelationInput {
  if (!sort) return { createdAt: "desc" };
  if (sort === "riskTier") return { riskClassification: { riskTier: dir } };
  return { [sort]: dir };
}

export default async function InventoryPage({
  searchParams,
}: {
  searchParams: Promise<{ archived?: string; status?: string; risk?: string; sort?: string; dir?: string }>;
}) {
  const { archived, status, risk, sort, dir } = await searchParams;
  const showArchived = archived === "1";
  const statusFilter = status as DeploymentStatus | undefined;
  // UNASSESSED = no risk classification yet (linked from the regulatory updates nudge).
  const riskFilter = risk as RiskTier | "UNASSESSED" | undefined;
  const sortField = SORT_KEYS.includes(sort as SortKey) ? (sort as SortKey) : null;
  const sortDir: SortDir = dir === "asc" ? "asc" : "desc";
  const actor = await getCurrentUser();
  const canCreate = canCreateSystem(actor.role);

  const orgId = actor.organizationId;
  const where: Prisma.AiSystemWhereInput = {
    organizationId: orgId,
    archivedAt: showArchived ? { not: null } : null,
    ...(statusFilter ? { deploymentStatus: statusFilter } : {}),
    ...(riskFilter === "UNASSESSED"
      ? { riskClassification: { is: null } }
      : riskFilter
        ? { riskClassification: { riskTier: riskFilter } }
        : {}),
  };

  // Preserves whichever filters/sort are active across the archived/active toggle.
  function toggleArchivedHref() {
    const params = new URLSearchParams();
    if (!showArchived) params.set("archived", "1");
    if (statusFilter) params.set("status", statusFilter);
    if (riskFilter) params.set("risk", riskFilter);
    if (sortField) {
      params.set("sort", sortField);
      params.set("dir", sortDir);
    }
    const qs = params.toString();
    return `/systems/inventory${qs ? `?${qs}` : ""}`;
  }

  // Clicking a header sorts by it ascending; clicking the already-active
  // column flips direction. Other filters/the archived toggle carry over.
  function sortHref(field: SortKey) {
    const params = new URLSearchParams();
    if (showArchived) params.set("archived", "1");
    if (statusFilter) params.set("status", statusFilter);
    if (riskFilter) params.set("risk", riskFilter);
    const nextDir: SortDir = sortField === field && sortDir === "asc" ? "desc" : "asc";
    params.set("sort", field);
    params.set("dir", nextDir);
    return `/systems/inventory?${params.toString()}`;
  }

  const [systems, activeCount, archivedCount, vendors] = await Promise.all([
    prisma.aiSystem.findMany({
      where,
      orderBy: buildOrderBy(sortField, sortDir),
      include: {
        owner: true,
        stages: { orderBy: { sequence: "asc" } },
        riskClassification: true,
      },
    }),
    prisma.aiSystem.count({ where: { organizationId: orgId, archivedAt: null } }),
    prisma.aiSystem.count({ where: { organizationId: orgId, archivedAt: { not: null } } }),
    prisma.vendor.findMany({ where: { organizationId: orgId }, select: { name: true } }),
  ]);

  return (
    <div className="mx-auto max-w-6xl px-6 py-12">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">
          {showArchived ? "Archived AI systems" : "AI system inventory"}
        </h1>
        <div className="flex items-center gap-4">
          {(statusFilter || riskFilter) && (
            <Link href={showArchived ? "/systems/inventory?archived=1" : "/systems/inventory"} className={subtleLinkClass}>
              Clear filter
            </Link>
          )}
          {canCreate && !showArchived && (
            <Link href="/systems/import" className={subtleLinkClass}>
              Bulk import
            </Link>
          )}
          {!showArchived && (
            <>
              {/* eslint-disable-next-line @next/next/no-html-link-for-pages -- file download, not a page navigation */}
              <a
                href="/systems/portfolio-report?format=csv"
                className={`flex items-center gap-1 ${subtleLinkClass}`}
              >
                <FileSpreadsheet size={14} />
                Portfolio report (CSV)
              </a>
              {/* eslint-disable-next-line @next/next/no-html-link-for-pages -- file download, not a page navigation */}
              <a
                href="/systems/portfolio-report?format=pdf"
                className={`flex items-center gap-1 ${subtleLinkClass}`}
              >
                <FileText size={14} />
                Portfolio report (PDF)
              </a>
            </>
          )}
          <Link href={toggleArchivedHref()} className={subtleLinkClass}>
            {showArchived ? `← Active (${activeCount})` : `Archived (${archivedCount})`}
          </Link>
        </div>
      </div>

      <form id="new-system-form" action={createAiSystem} />
      <datalist id="vendor-names">
        {vendors.map((v) => (
          <option key={v.name} value={v.name} />
        ))}
      </datalist>

      <div
        role="table"
        className="mt-6 min-w-[1000px] overflow-x-auto rounded-lg border border-zinc-200 dark:border-zinc-800"
      >
        <div
          role="row"
          className={`grid ${gridCols} border-b border-zinc-200 text-left text-xs uppercase tracking-wide text-zinc-500 dark:border-zinc-800`}
        >
          {SORT_KEYS.map((key) => (
            <Link
              key={key}
              href={sortHref(key)}
              role="columnheader"
              className={`${cellClass} hover:text-zinc-700 dark:hover:text-zinc-300`}
            >
              {SORT_LABELS[key]}
              {sortField === key && <span className="ml-1">{sortDir === "asc" ? "▲" : "▼"}</span>}
            </Link>
          ))}
          <span role="columnheader" className={cellClass}>
            Stages
          </span>
        </div>

        {!showArchived && canCreate && (
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
                list="vendor-names"
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
            <span role="cell" className={`${cellClass} text-xs text-zinc-400`}>
              —
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
            <span role="cell" className={cellClass}>
              {system.riskClassification ? (
                <RiskTierBadge value={system.riskClassification.riskTier} />
              ) : (
                <span className="text-xs text-zinc-400">Not assessed</span>
              )}
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
