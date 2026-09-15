import { notFound } from "next/navigation";
import { headers } from "next/headers";
import { FileText, ShieldAlert } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { resolveShareLink } from "@/lib/share-links";
import { ClassificationBadge, DeploymentStatusBadge, RiskTierBadge } from "@/lib/badges";
import { primaryButtonClass } from "@/lib/ui";

export const dynamic = "force-dynamic";

// Unauthenticated landing page for a share link — a summary + a download
// link to the real PDF (src/app/share/[token]/pdf/route.ts), rather than
// a second, driftable HTML re-implementation of every report section.
export default async function SharedAuditViewPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const headersList = await headers();
  const viewerIp = headersList.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null;

  const shareLink = await resolveShareLink(token, viewerIp);
  if (!shareLink) notFound();

  const system = await prisma.aiSystem.findUnique({
    where: { id: shareLink.aiSystemId },
    include: {
      owner: true,
      vendor: true,
      riskClassification: {
        include: { triggeredRegulationRows: { include: { regulation: true } } },
      },
    },
  });
  if (!system) notFound();

  const triggeredRegulations = system.riskClassification?.triggeredRegulationRows.map(
    (row) => row.regulation,
  ) ?? [];

  return (
    <div className="mx-auto max-w-2xl px-6 py-12">
      <div className="rounded-lg border border-blue-300 bg-blue-50 px-4 py-2 text-sm text-blue-800 dark:border-blue-900 dark:bg-blue-950/40 dark:text-blue-300">
        Shared audit view — read-only, expires {shareLink.expiresAt.toISOString().slice(0, 10)}.
      </div>

      <h1 className="mt-4 text-2xl font-semibold tracking-tight">{system.name}</h1>
      <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-zinc-500">
        <span>Owner: {system.owner.name ?? system.owner.email}</span>
        <DeploymentStatusBadge value={system.deploymentStatus} />
        <ClassificationBadge value={system.classification} />
        {system.vendor ? <span>Vendor: {system.vendor.name}</span> : system.vendorName && <span>Vendor: {system.vendorName}</span>}
      </div>
      {system.description && (
        <p className="mt-3 text-sm text-zinc-700 dark:text-zinc-300">{system.description}</p>
      )}

      <h2 className="mt-8 flex items-center gap-2 text-lg font-medium">
        <ShieldAlert size={18} />
        Risk classification
      </h2>
      {system.riskClassification ? (
        <div className="mt-3 rounded-lg border border-zinc-200 p-4 dark:border-zinc-800">
          <RiskTierBadge value={system.riskClassification.riskTier} />
          {triggeredRegulations.length > 0 && (
            <div className="mt-3">
              <p className="text-xs text-zinc-500">
                Likely applies — verify with counsel, this is not a legal determination:
              </p>
              <ul className="mt-1 flex flex-wrap gap-2">
                {triggeredRegulations.map((reg) => (
                  <li key={reg.id} className="rounded bg-zinc-100 px-2 py-0.5 text-xs dark:bg-zinc-800">
                    {reg.label}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      ) : (
        <div className="mt-3 rounded-lg border border-zinc-200 p-4 text-sm text-zinc-500 dark:border-zinc-800">
          No risk assessment has been completed for this system.
        </div>
      )}

      <a
        href={`/share/${token}/pdf`}
        className={`mt-8 inline-flex items-center gap-2 ${primaryButtonClass}`}
      >
        <FileText size={16} />
        Download full governance report (PDF)
      </a>
    </div>
  );
}
