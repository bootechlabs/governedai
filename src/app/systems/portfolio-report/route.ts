import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/current-user";
import { buildPortfolioCsv, buildPortfolioReportPdf } from "@/lib/report-export";

export async function GET(request: NextRequest) {
  const format = request.nextUrl.searchParams.get("format") === "pdf" ? "pdf" : "csv";
  const actor = await getCurrentUser();

  const [organization, systems] = await Promise.all([
    prisma.organization.findUniqueOrThrow({ where: { id: actor.organizationId } }),
    prisma.aiSystem.findMany({
      where: { organizationId: actor.organizationId, archivedAt: null },
      orderBy: { name: "asc" },
      include: {
        owner: true,
        vendor: true,
        riskClassification: {
          include: { triggeredRegulationRows: { include: { regulation: { include: { artifacts: true } } } } },
        },
        evidence: { select: { category: true, label: true, fileUrl: true, linkUrl: true } },
      },
    }),
  ]);

  if (format === "csv") {
    const csv = buildPortfolioCsv(systems);
    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": 'attachment; filename="governedai-portfolio-report.csv"',
      },
    });
  }

  const pdf = await buildPortfolioReportPdf(organization.name, systems);
  return new NextResponse(new Uint8Array(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": 'attachment; filename="governedai-portfolio-report.pdf"',
    },
  });
}
