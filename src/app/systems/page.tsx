import Link from "next/link";
import {
  Boxes,
  ShieldAlert,
  Building2,
  ClipboardList,
  Activity,
  Siren,
} from "lucide-react";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/current-user";
import { deploymentStatusConfig, riskTierConfig } from "@/lib/badges";
import { subtleLinkClass } from "@/lib/ui";
import type { DeploymentStatus, RiskTier, StageStatus } from "@prisma/client";

export const dynamic = "force-dynamic";

const tileClass = "rounded-lg border border-zinc-200 p-4 dark:border-zinc-800";

// A system's review status isn't a stored field — it's derived from its
// workflow stages, since that's the only place lifecycle progress lives.
type ProjectStatus = "NOT_STARTED" | "IN_PROGRESS" | "IN_REVIEW" | "COMPLETED" | "REJECTED";

function deriveProjectStatus(stages: { status: StageStatus }[]): ProjectStatus {
  if (stages.length === 0) return "NOT_STARTED";
  if (stages.some((s) => s.status === "REJECTED")) return "REJECTED";
  if (stages.every((s) => s.status === "APPROVED" || s.status === "CONDITIONALLY_APPROVED")) {
    return "COMPLETED";
  }
  if (stages.some((s) => s.status === "IN_REVIEW")) return "IN_REVIEW";
  if (stages.every((s) => s.status === "PENDING")) return "NOT_STARTED";
  return "IN_PROGRESS";
}

function RiskDonut({
  segments,
  total,
}: {
  segments: { key: string; label: string; value: number; strokeClass: string }[];
  total: number;
}) {
  const size = 120;
  const strokeWidth = 16;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  let cumulative = 0;

  return (
    <div className="relative flex h-[120px] w-[120px] shrink-0 items-center justify-center">
      <svg viewBox={`0 0 ${size} ${size}`} width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          strokeWidth={strokeWidth}
          fill="none"
          className="stroke-zinc-100 dark:stroke-zinc-800"
        />
        {total > 0 &&
          segments
            .filter((s) => s.value > 0)
            .map((s) => {
              const fraction = s.value / total;
              const dash = fraction * circumference;
              const dashOffset = -cumulative;
              cumulative += dash;
              return (
                <circle
                  key={s.key}
                  cx={size / 2}
                  cy={size / 2}
                  r={radius}
                  strokeWidth={strokeWidth}
                  fill="none"
                  strokeDasharray={`${dash} ${circumference - dash}`}
                  strokeDashoffset={dashOffset}
                  className={s.strokeClass}
                >
                  <title>
                    {s.label}: {s.value} ({Math.round(fraction * 100)}%)
                  </title>
                </circle>
              );
            })}
      </svg>
      <div className="absolute flex flex-col items-center">
        <span className="text-xl font-semibold">{total}</span>
        <span className="text-[10px] uppercase tracking-wide text-zinc-500">systems</span>
      </div>
    </div>
  );
}

function StatusBar({
  label,
  value,
  max,
  fillClass,
}: {
  label: string;
  value: number;
  max: number;
  fillClass: string;
}) {
  const pct = max === 0 ? 0 : Math.round((value / max) * 100);
  return (
    <li title={`${label}: ${value}`} className="flex items-center gap-3">
      <span className="w-28 shrink-0 text-sm text-zinc-600 dark:text-zinc-400">{label}</span>
      <span className="h-2 flex-1 overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-900">
        <span className={`block h-full rounded-full ${fillClass}`} style={{ width: `${pct}%` }} />
      </span>
      <span className="w-6 shrink-0 text-right text-sm font-medium">{value}</span>
    </li>
  );
}

export default async function DashboardPage() {
  const actor = await getCurrentUser();
  const orgId = actor.organizationId;
  const activeFilter = { organizationId: orgId, archivedAt: null } as const;

  const [
    totalActive,
    deploymentGroups,
    riskGroups,
    vendorTotal,
    vendorAttentionRows,
    pendingStagesTotal,
    stageSystems,
    archivedCount,
    openIncidentCount,
    recentActivity,
  ] = await Promise.all([
    prisma.aiSystem.count({ where: activeFilter }),
    prisma.aiSystem.groupBy({ by: ["deploymentStatus"], where: activeFilter, _count: true }),
    prisma.riskClassification.groupBy({
      by: ["riskTier"],
      where: { aiSystem: activeFilter },
      _count: true,
    }),
    prisma.vendor.count({ where: { organizationId: orgId } }),
    // "Needs attention" has two independent reasons — BAA status, or
    // re-attestation overdue — and the overdue threshold is per-vendor
    // (lastAttestedAt + attestationCadenceDays), which Prisma can't express
    // as a single-column filter. Small per-org vendor counts, so fetch and
    // compute in JS rather than reach for raw SQL.
    prisma.vendor.findMany({
      where: { organizationId: orgId },
      select: { baaStatus: true, lastAttestedAt: true, attestationCadenceDays: true },
    }),
    prisma.workflowStage.count({
      where: { status: { in: ["PENDING", "IN_REVIEW"] }, aiSystem: activeFilter },
    }),
    // Feeds the "review status" chart below — review status isn't stored, it's
    // derived per system from its stages (see deriveProjectStatus).
    prisma.aiSystem.findMany({
      where: activeFilter,
      select: { stages: { select: { status: true } } },
    }),
    prisma.aiSystem.count({ where: { organizationId: orgId, archivedAt: { not: null } } }),
    prisma.incident.count({ where: { resolvedAt: null, aiSystem: activeFilter } }),
    prisma.auditLogEntry.findMany({
      where: { aiSystem: { organizationId: orgId } },
      include: { actor: true, aiSystem: { select: { id: true, name: true } } },
      orderBy: { occurredAt: "desc" },
      take: 5,
    }),
  ]);

  const deploymentCounts = Object.fromEntries(
    deploymentGroups.map((g) => [g.deploymentStatus, g._count]),
  ) as Record<DeploymentStatus, number>;
  const riskCounts = Object.fromEntries(riskGroups.map((g) => [g.riskTier, g._count])) as Record<
    RiskTier,
    number
  >;
  const unclassifiedCount = totalActive - riskGroups.reduce((sum, g) => sum + g._count, 0);
  const now = new Date();
  const vendorsNeedingAttention = vendorAttentionRows.filter((v) => {
    const baaNeedsAttention = v.baaStatus === "REQUIRED_NOT_ON_FILE" || v.baaStatus === "EXPIRED";
    const reattestationOverdue =
      v.lastAttestedAt !== null &&
      v.lastAttestedAt.getTime() + v.attestationCadenceDays * 24 * 60 * 60 * 1000 < now.getTime();
    return baaNeedsAttention || reattestationOverdue;
  }).length;

  const projectStatusCounts: Record<ProjectStatus, number> = {
    NOT_STARTED: 0,
    IN_PROGRESS: 0,
    IN_REVIEW: 0,
    COMPLETED: 0,
    REJECTED: 0,
  };
  for (const system of stageSystems) {
    projectStatusCounts[deriveProjectStatus(system.stages)]++;
  }
  const projectStatusRows = [
    { label: "Not started", value: projectStatusCounts.NOT_STARTED, fillClass: "bg-zinc-500" },
    {
      label: "In progress",
      value: projectStatusCounts.IN_PROGRESS,
      fillClass: "bg-amber-600 dark:bg-amber-400",
    },
    {
      label: "In review",
      value: projectStatusCounts.IN_REVIEW,
      fillClass: "bg-orange-600 dark:bg-orange-400",
    },
    {
      label: "Completed",
      value: projectStatusCounts.COMPLETED,
      fillClass: "bg-emerald-600 dark:bg-emerald-400",
    },
    { label: "Rejected", value: projectStatusCounts.REJECTED, fillClass: "bg-red-600 dark:bg-red-400" },
    { label: "Archived", value: archivedCount, fillClass: "bg-zinc-500 opacity-60" },
  ];
  const maxProjectStatus = Math.max(1, ...projectStatusRows.map((r) => r.value));

  const riskDonutSegments = [
    {
      key: "LOW",
      label: riskTierConfig.LOW.label,
      value: riskCounts.LOW ?? 0,
      strokeClass: "stroke-zinc-500",
      dotClass: "bg-zinc-500",
      href: "/systems/inventory?risk=LOW",
    },
    {
      key: "MODERATE",
      label: riskTierConfig.MODERATE.label,
      value: riskCounts.MODERATE ?? 0,
      strokeClass: "stroke-amber-600 dark:stroke-amber-400",
      dotClass: "bg-amber-600 dark:bg-amber-400",
      href: "/systems/inventory?risk=MODERATE",
    },
    {
      key: "HIGH",
      label: riskTierConfig.HIGH.label,
      value: riskCounts.HIGH ?? 0,
      strokeClass: "stroke-orange-600 dark:stroke-orange-400",
      dotClass: "bg-orange-600 dark:bg-orange-400",
      href: "/systems/inventory?risk=HIGH",
    },
    {
      key: "CRITICAL",
      label: riskTierConfig.CRITICAL.label,
      value: riskCounts.CRITICAL ?? 0,
      strokeClass: "stroke-red-600 dark:stroke-red-400",
      dotClass: "bg-red-600 dark:bg-red-400",
      href: "/systems/inventory?risk=CRITICAL",
    },
    {
      key: "UNCLASSIFIED",
      label: "Not yet assessed",
      value: unclassifiedCount,
      strokeClass: "stroke-amber-600 dark:stroke-amber-400",
      dotClass: "bg-amber-600 dark:bg-amber-400",
      href: null,
    },
  ];

  return (
    <div className="mx-auto max-w-5xl px-6 py-12">
      <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <div className={tileClass}>
          <h2 className="flex items-center gap-2 text-sm font-medium text-zinc-700 dark:text-zinc-300">
            <ShieldAlert size={16} className="text-zinc-500" />
            Systems by risk tier
          </h2>
          <div className="mt-4 flex items-center gap-6">
            <RiskDonut segments={riskDonutSegments} total={totalActive} />
            <ul className="flex flex-1 flex-col gap-1 text-sm">
              {riskDonutSegments.map((s) => {
                const row = (
                  <span className="flex items-center justify-between gap-2">
                    <span className="flex items-center gap-2 text-zinc-600 dark:text-zinc-400">
                      <span className={`h-2 w-2 shrink-0 rounded-full ${s.dotClass}`} />
                      {s.label}
                    </span>
                    <span className="font-medium">{s.value}</span>
                  </span>
                );
                return (
                  <li key={s.key}>
                    {s.href ? (
                      <Link
                        href={s.href}
                        className="block rounded hover:bg-zinc-50 dark:hover:bg-zinc-900/60"
                      >
                        {row}
                      </Link>
                    ) : (
                      row
                    )}
                  </li>
                );
              })}
            </ul>
          </div>
        </div>

        <div className={tileClass}>
          <h2 className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
            Systems by review status
          </h2>
          <ul className="mt-4 flex flex-col gap-2.5">
            {projectStatusRows.map((row) => (
              <StatusBar
                key={row.label}
                label={row.label}
                value={row.value}
                max={maxProjectStatus}
                fillClass={row.fillClass}
              />
            ))}
          </ul>
        </div>

        <div className="flex flex-col gap-4">
          <div className={tileClass}>
            <div className="flex items-center gap-2 text-zinc-500">
              <ClipboardList size={16} />
              <span className="text-xs uppercase tracking-wide">Pending review</span>
            </div>
            <p className="mt-2 text-2xl font-semibold">{pendingStagesTotal}</p>
            <p
              className={
                pendingStagesTotal > 0
                  ? "mt-1 text-xs text-amber-600 dark:text-amber-400"
                  : "mt-1 text-xs text-zinc-500"
              }
            >
              {pendingStagesTotal > 0 ? "needs review" : "none pending"}
            </p>
          </div>

          <div className={tileClass}>
            <div className="flex items-center gap-2 text-zinc-500">
              <Siren size={16} />
              <span className="text-xs uppercase tracking-wide">Incidents</span>
            </div>
            <p className="mt-2 text-2xl font-semibold">{openIncidentCount}</p>
            <p
              className={
                openIncidentCount > 0
                  ? "mt-1 text-xs text-amber-600 dark:text-amber-400"
                  : "mt-1 text-xs text-zinc-500"
              }
            >
              {openIncidentCount > 0 ? "open, needs review" : "none open"}
            </p>
          </div>
        </div>
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <div className={tileClass}>
          <div className="flex items-center gap-2 text-zinc-500">
            <Boxes size={16} />
            <span className="text-xs uppercase tracking-wide">AI systems</span>
          </div>
          <p className="mt-2 text-2xl font-semibold">{totalActive}</p>
          <Link href="/systems/inventory" className={`mt-1 inline-block text-xs ${subtleLinkClass}`}>
            View inventory
          </Link>
        </div>

        <div className={tileClass}>
          <div className="flex items-center gap-2 text-zinc-500">
            <ClipboardList size={16} />
            <span className="text-xs uppercase tracking-wide">By deployment status</span>
          </div>
          <ul className="mt-2 flex flex-col gap-1 text-sm">
            {(Object.keys(deploymentStatusConfig) as DeploymentStatus[]).map((status) => {
              const Icon = deploymentStatusConfig[status].icon;
              return (
                <li key={status}>
                  <Link
                    href={`/systems/inventory?status=${status}`}
                    className="flex items-center justify-between rounded hover:bg-zinc-50 dark:hover:bg-zinc-900/60"
                  >
                    <span className="flex items-center gap-1.5 text-zinc-600 dark:text-zinc-400">
                      <Icon size={14} />
                      {deploymentStatusConfig[status].label}
                    </span>
                    <span className="font-medium">{deploymentCounts[status] ?? 0}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>

        <div className={tileClass}>
          <div className="flex items-center gap-2 text-zinc-500">
            <Building2 size={16} />
            <span className="text-xs uppercase tracking-wide">Vendors</span>
          </div>
          <p className="mt-2 text-2xl font-semibold">{vendorTotal}</p>
          {vendorsNeedingAttention > 0 && (
            <p className="mt-1 text-xs text-amber-600 dark:text-amber-400">
              {vendorsNeedingAttention} need attention
            </p>
          )}
          <Link href="/systems/vendors" className={`mt-1 inline-block text-xs ${subtleLinkClass}`}>
            View vendors
          </Link>
        </div>
      </div>

      <h2 className="mt-10 flex items-center gap-2 text-lg font-medium">
        <Activity size={18} />
        Recent activity
      </h2>
      <ul className="mt-4 flex flex-col gap-2 text-sm">
        {recentActivity.length === 0 && <li className="text-zinc-500">No activity yet.</li>}
        {recentActivity.map((entry) => (
          <li key={entry.id} className="text-zinc-600 dark:text-zinc-400">
            {entry.occurredAt.toISOString()} —{" "}
            <Link href={`/systems/${entry.aiSystem.id}`} className="underline hover:no-underline">
              {entry.aiSystem.name}
            </Link>{" "}
            — {entry.actor.name ?? entry.actor.email} — {entry.action}
          </li>
        ))}
      </ul>
    </div>
  );
}
