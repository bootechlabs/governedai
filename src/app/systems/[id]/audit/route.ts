import { NextRequest, NextResponse } from "next/server";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/current-user";
import { buildAuditCsv, buildGovernanceReportPdf, slugifyFileName } from "@/lib/report-export";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const format = request.nextUrl.searchParams.get("format") === "pdf" ? "pdf" : "csv";

  const actor = await getCurrentUser();
  const system = await prisma.aiSystem.findUnique({
    where: { id, organizationId: actor.organizationId },
    include: {
      owner: true,
      vendor: true,
      riskClassification: { include: { completedBy: true } },
      stages: { orderBy: { sequence: "asc" }, include: { owner: true } },
      evidence: { orderBy: { uploadedAt: "desc" }, include: { uploadedBy: true } },
      auditLog: { orderBy: { occurredAt: "asc" }, include: { actor: true } },
    },
  });
  if (!system) notFound();

  const fileBase = slugifyFileName(system.name);

  if (format === "csv") {
    const csv = buildAuditCsv(system.auditLog);
    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${fileBase}-audit-log.csv"`,
      },
    });
  }

  const pdf = await buildGovernanceReportPdf({
    system,
    riskClassification: system.riskClassification,
    stages: system.stages,
    evidence: system.evidence,
    auditLog: system.auditLog,
  });
  return new NextResponse(new Uint8Array(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${fileBase}-governance-report.pdf"`,
    },
  });
}
