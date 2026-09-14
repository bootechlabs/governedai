import Link from "next/link";
import { Boxes, Users as UsersIcon, Building2, ShieldAlert, Tags } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { riskTierConfig } from "@/lib/badges";
import type { RiskTier } from "@prisma/client";

export const dynamic = "force-dynamic";

const tileClass = "rounded-lg border border-zinc-200 p-4 dark:border-zinc-800";

export default async function PlatformDashboardPage() {
  const [orgCount, activeSystemCount, userCount, riskGroups, verticalGroups, organizations] =
    await Promise.all([
      prisma.organization.count(),
      prisma.aiSystem.count({ where: { archivedAt: null } }),
      prisma.user.count(),
      prisma.riskClassification.groupBy({
        by: ["riskTier"],
        where: { aiSystem: { archivedAt: null } },
        _count: true,
      }),
      prisma.organization.groupBy({ by: ["vertical"], _count: true }),
      prisma.organization.findMany({
        orderBy: { name: "asc" },
        include: {
          _count: {
            select: { users: true, aiSystems: { where: { archivedAt: null } } },
          },
        },
      }),
    ]);

  const riskCounts = Object.fromEntries(riskGroups.map((g) => [g.riskTier, g._count])) as Record<
    RiskTier,
    number
  >;

  return (
    <div className="mx-auto max-w-5xl px-6 py-12">
      <h1 className="text-2xl font-semibold tracking-tight">Global dashboard</h1>
      <p className="mt-1 text-sm text-zinc-500">Across every organization on the platform.</p>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className={tileClass}>
          <div className="flex items-center gap-2 text-zinc-500">
            <Building2 size={16} />
            <span className="text-xs uppercase tracking-wide">Organizations</span>
          </div>
          <p className="mt-2 text-2xl font-semibold">{orgCount}</p>
        </div>

        <div className={tileClass}>
          <div className="flex items-center gap-2 text-zinc-500">
            <Boxes size={16} />
            <span className="text-xs uppercase tracking-wide">Active AI systems</span>
          </div>
          <p className="mt-2 text-2xl font-semibold">{activeSystemCount}</p>
        </div>

        <div className={tileClass}>
          <div className="flex items-center gap-2 text-zinc-500">
            <UsersIcon size={16} />
            <span className="text-xs uppercase tracking-wide">Users</span>
          </div>
          <p className="mt-2 text-2xl font-semibold">{userCount}</p>
        </div>

        <div className={tileClass}>
          <div className="flex items-center gap-2 text-zinc-500">
            <ShieldAlert size={16} />
            <span className="text-xs uppercase tracking-wide">By risk tier</span>
          </div>
          <ul className="mt-2 flex flex-col gap-1 text-sm">
            {(Object.keys(riskTierConfig) as RiskTier[]).map((tier) => (
              <li key={tier} className="flex items-center justify-between">
                <span className="text-zinc-600 dark:text-zinc-400">{riskTierConfig[tier].label}</span>
                <span className="font-medium">{riskCounts[tier] ?? 0}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <h2 className="mt-10 flex items-center gap-2 text-lg font-medium">
        <Tags size={18} />
        By vertical
      </h2>
      <ul className="mt-4 flex flex-col gap-2 text-sm">
        {verticalGroups.map((g) => (
          <li key={g.vertical ?? "unset"} className="flex items-center justify-between">
            <span className="text-zinc-600 dark:text-zinc-400">{g.vertical ?? "Not set"}</span>
            <span className="font-medium">{g._count}</span>
          </li>
        ))}
      </ul>

      <h2 className="mt-10 text-lg font-medium">Organizations</h2>
      <div
        role="table"
        className="mt-4 overflow-x-auto rounded-lg border border-zinc-200 dark:border-zinc-800"
      >
        <div
          role="row"
          className="grid grid-cols-[2fr_1.5fr_1fr_1fr] border-b border-zinc-200 px-3 py-2 text-left text-xs uppercase tracking-wide text-zinc-500 dark:border-zinc-800"
        >
          <span role="columnheader">Name</span>
          <span role="columnheader">Vertical</span>
          <span role="columnheader">Users</span>
          <span role="columnheader">Active systems</span>
        </div>
        {organizations.map((org) => (
          <Link
            key={org.id}
            href={`/platform/organizations/${org.id}`}
            role="row"
            className="grid grid-cols-[2fr_1.5fr_1fr_1fr] border-b border-zinc-200 px-3 py-2 text-sm last:border-0 hover:bg-zinc-50 dark:border-zinc-800 dark:hover:bg-zinc-900/60"
          >
            <span className="font-medium">{org.name}</span>
            <span className="text-zinc-500">{org.vertical ?? "—"}</span>
            <span>{org._count.users}</span>
            <span>{org._count.aiSystems}</span>
          </Link>
        ))}
      </div>
    </div>
  );
}
