import { NextRequest, NextResponse } from "next/server";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { resolveShareLink } from "@/lib/share-links";
import { buildGovernanceReportPdf, slugifyFileName } from "@/lib/report-export";
import { verifyAuditChain } from "@/lib/audit-log";

// Unauthenticated by design — the token itself is the access control (see
// src/lib/share-links.ts). Not found/revoked/expired all read the same
// way to a caller: a plain 404, nothing to distinguish or leak.
export async function GET(request: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const viewerIp = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null;

  const shareLink = await resolveShareLink(token, viewerIp);
  if (!shareLink) notFound();

  const system = await prisma.aiSystem.findUnique({
    where: { id: shareLink.aiSystemId },
    include: {
      owner: true,
      vendor: true,
      riskClassification: {
        include: {
          completedBy: true,
          triggeredRegulationRows: { include: { regulation: { include: { artifacts: true } } } },
        },
      },
      stages: { orderBy: { sequence: "asc" }, include: { owner: true } },
      evidence: { orderBy: { uploadedAt: "desc" }, include: { uploadedBy: true } },
      auditLog: { orderBy: { occurredAt: "asc" }, include: { actor: true } },
      incidents: {
        orderBy: { occurredAt: "desc" },
        include: { reportedBy: true, resolvedBy: true },
      },
    },
  });
  if (!system) notFound();

  const { verified, entryCount } = await verifyAuditChain(system.id);
  const pdf = await buildGovernanceReportPdf({
    system,
    riskClassification: system.riskClassification,
    stages: system.stages,
    evidence: system.evidence,
    auditLog: system.auditLog,
    incidents: system.incidents,
    auditIntegrity: { verified, entryCount },
  });

  return new NextResponse(new Uint8Array(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${slugifyFileName(system.name)}-governance-report.pdf"`,
    },
  });
}
