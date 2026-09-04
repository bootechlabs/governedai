import { NextRequest, NextResponse } from "next/server";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { buildAuditCsv, buildAuditPdf, slugifyFileName } from "@/lib/audit-export";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const format = request.nextUrl.searchParams.get("format") === "pdf" ? "pdf" : "csv";

  const system = await prisma.aiSystem.findUnique({
    where: { id },
    include: {
      auditLog: { orderBy: { occurredAt: "asc" }, include: { actor: true } },
    },
  });
  if (!system) notFound();

  const fileBase = `${slugifyFileName(system.name)}-audit-log`;

  if (format === "csv") {
    const csv = buildAuditCsv(system.name, system.auditLog);
    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${fileBase}.csv"`,
      },
    });
  }

  const pdf = await buildAuditPdf(system.name, system.auditLog);
  return new NextResponse(new Uint8Array(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${fileBase}.pdf"`,
    },
  });
}
