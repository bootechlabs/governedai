import Link from "next/link";
import {
  Boxes,
  ShieldAlert,
  Building2,
  ClipboardList,
  Activity,
} from "lucide-react";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/current-user";
import {
  deploymentStatusConfig,
  riskTierConfig,
  StageStatusBadge,
} from "@/lib/badges";
import { subtleLinkClass } from "@/lib/ui";
import type { DeploymentStatus, RiskTier } from "@prisma/client";

export const dynamic = "force-dynamic";

const tileClass = "rounded-lg border border-zinc-200 p-4 dark:border-zinc-800";

export default async function DashboardPage() {
  const actor = await getCurrentUser();
  const orgId = actor.organizationId;
  const activeFilter = { organizationId: orgId, archivedAt: null } as const;

  const [
    totalActive,
    deploymentGroups,
    riskGroups,
    vendorTotal,
    vendorsNeedingAttention,
    pendingStages,
    pendingStagesTotal,
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
    prisma.vendor.count({
      where: { organizationId: orgId, baaStatus: { in: ["REQUIRED_NOT_ON_FILE", "EXPIRED"] } },
    }),
    prisma.workflowStage.findMany({
      where: { status: { in: ["PENDING", "IN_REVIEW"] }, aiSystem: activeFilter },
      include: { aiSystem: { select: { id: true, name: true } } },
      orderBy: { aiSystem: { createdAt: "desc" } },
      take: 10,
    }),
    prisma.workflowStage.count({
      where: { status: { in: ["PENDING", "IN_REVIEW"] }, aiSystem: activeFilter },
    }),
    prisma.auditLogEntry.findMany({
      where: { aiSystem: { organizationId: orgId } },
      include: { actor: true, aiSystem: { select: { id: true, name: true } } },
      orderBy: { occurredAt: "desc" },
      take: 10,
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

  return (
    <div className="mx-auto max-w-5xl px-6 py-12">
      <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
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
                <li key={status} className="flex items-center justify-between">
                  <span className="flex items-center gap-1.5 text-zinc-600 dark:text-zinc-400">
                    <Icon size={14} />
                    {deploymentStatusConfig[status].label}
                  </span>
                  <span className="font-medium">{deploymentCounts[status] ?? 0}</span>
                </li>
              );
            })}
          </ul>
        </div>

        <div className={tileClass}>
          <div className="flex items-center gap-2 text-zinc-500">
            <ShieldAlert size={16} />
            <span className="text-xs uppercase tracking-wide">By risk tier</span>
          </div>
          <ul className="mt-2 flex flex-col gap-1 text-sm">
            {(Object.keys(riskTierConfig) as RiskTier[]).map((tier) => {
              const Icon = riskTierConfig[tier].icon;
              return (
                <li key={tier} className="flex items-center justify-between">
                  <span className="flex items-center gap-1.5 text-zinc-600 dark:text-zinc-400">
                    <Icon size={14} />
                    {riskTierConfig[tier].label}
                  </span>
                  <span className="font-medium">{riskCounts[tier] ?? 0}</span>
                </li>
              );
            })}
            {unclassifiedCount > 0 && (
              <li className="flex items-center justify-between border-t border-zinc-200 pt-1 text-amber-600 dark:border-zinc-800 dark:text-amber-400">
                <span>Not yet assessed</span>
                <span className="font-medium">{unclassifiedCount}</span>
              </li>
            )}
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
              {vendorsNeedingAttention} need BAA attention
            </p>
          )}
          <Link href="/systems/vendors" className={`mt-1 inline-block text-xs ${subtleLinkClass}`}>
            View vendors
          </Link>
        </div>
      </div>

      <h2 className="mt-10 flex items-center gap-2 text-lg font-medium">
        <ClipboardList size={18} />
        Pending review
      </h2>
      <ul className="mt-4 flex flex-col gap-2 text-sm">
        {pendingStages.length === 0 && <li className="text-zinc-500">Nothing pending review.</li>}
        {pendingStages.map((stage) => (
          <li
            key={stage.id}
            className="flex items-center justify-between rounded-lg border border-zinc-200 px-4 py-2.5 dark:border-zinc-800"
          >
            <Link href={`/systems/${stage.aiSystem.id}`} className="underline hover:no-underline">
              {stage.aiSystem.name}
            </Link>
            <span className="flex items-center gap-3 text-zinc-500">
              {stage.stageName}
              <StageStatusBadge value={stage.status} />
            </span>
          </li>
        ))}
        {pendingStagesTotal > pendingStages.length && (
          <li className="text-xs text-zinc-500">
            +{pendingStagesTotal - pendingStages.length} more
          </li>
        )}
      </ul>

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
