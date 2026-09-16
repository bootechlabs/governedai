import PDFDocument from "pdfkit";
import { readFileSync } from "fs";
import { join } from "path";
import type {
  AiSystem,
  AuditLogEntry,
  DataClassification,
  DeploymentStatus,
  EvidenceCategory,
  EvidenceType,
  RiskClassification,
  RiskTier,
  StageStatus,
  User,
  Vendor,
  WorkflowStage,
} from "@prisma/client";
import { USE_CASE_TEMPLATE_LABELS } from "@/lib/risk-classification";
import { computeRegulationSectionStatuses } from "@/lib/regulation-sections";

type AuditEntryWithActor = AuditLogEntry & { actor: User };

// A RiskClassification's triggered regulations come through this join
// shape (see prisma/schema.prisma RiskClassificationRegulation) rather
// than the old enum array — callers' Prisma queries include exactly this.
export interface TriggeredRegulationRow {
  regulation: {
    id: string;
    code: string;
    label: string;
    citation: string | null;
    summary: string | null;
    artifacts: { id: string; label: string; description: string; evidenceCategory: EvidenceCategory }[];
  };
}

function mapTriggeredRegulations(rows: TriggeredRegulationRow[]) {
  return rows.map((row) => row.regulation);
}

export function slugifyFileName(name: string) {
  return name.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}

function csvEscape(value: string) {
  if (/[",\n]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

export function buildAuditCsv(entries: AuditEntryWithActor[]) {
  const header = ["Timestamp", "Actor", "Action", "Detail"].join(",");
  const rows = entries.map((entry) =>
    [
      entry.occurredAt.toISOString(),
      entry.actor.name ?? entry.actor.email,
      entry.action,
      JSON.stringify(entry.detail ?? {}),
    ]
      .map(csvEscape)
      .join(","),
  );
  return [header, ...rows].join("\n") + "\n";
}

export interface PortfolioSystemInput {
  name: string;
  businessUnit: string | null;
  vendorName: string | null;
  vendor: Vendor | null;
  classification: DataClassification;
  deploymentStatus: DeploymentStatus;
  owner: User;
  riskClassification: (RiskClassification & { triggeredRegulationRows: TriggeredRegulationRow[] }) | null;
  evidence: {
    category: EvidenceCategory;
    label: string | null;
    fileUrl: string | null;
    linkUrl: string | null;
  }[];
}

function missingComplianceCount(system: PortfolioSystemInput): number {
  return computeRegulationSectionStatuses(
    mapTriggeredRegulations(system.riskClassification?.triggeredRegulationRows ?? []),
    system.evidence,
  ).flatMap((section) => section.artifacts.filter((a) => !a.onFile)).length;
}

export function buildPortfolioCsv(systems: PortfolioSystemInput[]) {
  const header = [
    "Name",
    "Owner",
    "Business Unit",
    "Vendor",
    "Classification",
    "Deployment Status",
    "Risk Tier",
    "Triggered Regulations",
    "Missing Compliance Items",
  ].join(",");

  const rows = systems.map((system) => {
    const vendorName = system.vendor?.name ?? system.vendorName ?? "";
    const riskTier = system.riskClassification?.riskTier ?? "Not assessed";
    const regulations = mapTriggeredRegulations(system.riskClassification?.triggeredRegulationRows ?? [])
      .map((reg) => reg.label)
      .join("; ");

    return [
      system.name,
      system.owner.name ?? system.owner.email,
      system.businessUnit ?? "",
      vendorName,
      system.classification,
      system.deploymentStatus,
      riskTier,
      regulations,
      String(missingComplianceCount(system)),
    ]
      .map(csvEscape)
      .join(",");
  });

  return [header, ...rows].join("\n") + "\n";
}

export interface GovernanceReportInput {
  system: AiSystem & { owner: User; vendor: Vendor | null };
  riskClassification:
    | (RiskClassification & { completedBy: User; triggeredRegulationRows: TriggeredRegulationRow[] })
    | null;
  stages: (WorkflowStage & { owner: User | null })[];
  evidence: {
    category: EvidenceCategory;
    type: EvidenceType;
    label: string | null;
    fileUrl: string | null;
    linkUrl: string | null;
    uploadedBy: User;
    uploadedAt: Date;
  }[];
  auditLog: AuditEntryWithActor[];
}

const stageStatusLabels: Record<StageStatus, string> = {
  PENDING: "Pending",
  IN_REVIEW: "In review",
  APPROVED: "Approved",
  CONDITIONALLY_APPROVED: "Conditionally approved",
  REJECTED: "Rejected",
};

function heading(doc: PDFKit.PDFDocument, text: string) {
  doc.moveDown(0.75).fontSize(14).fillColor("#000").text(text);
  doc.moveDown(0.25);
}

// Read once per warm serverless instance, not once per report — the
// actual robot-head mark (public/brand/governedai-mark-1024.png),
// embedded as a raster rather than hand-vectored so it always matches
// the real logo.
let logoImage: Buffer | null = null;
function getLogoImage(): Buffer {
  if (!logoImage) {
    logoImage = readFileSync(join(process.cwd(), "public", "brand", "governedai-mark-1024.png"));
  }
  return logoImage;
}

function drawLogo(doc: PDFKit.PDFDocument, x: number, y: number, size: number) {
  doc.image(getLogoImage(), x, y, { width: size, height: size });
}

export async function buildGovernanceReportPdf(input: GovernanceReportInput) {
  const { system, riskClassification, stages, evidence, auditLog } = input;
  const doc = new PDFDocument({ margin: 50 });
  const chunks: Buffer[] = [];
  doc.on("data", (chunk) => chunks.push(chunk));
  const done = new Promise<Buffer>((resolve) => {
    doc.on("end", () => resolve(Buffer.concat(chunks)));
  });

  // --- Header / system record ---
  const logoSize = 28;
  const logoTop = doc.y;
  drawLogo(doc, doc.page.margins.left, logoTop, logoSize);
  doc.y = logoTop + logoSize + 10;

  doc.fontSize(9).fillColor("#666").text("GOVERNEDAI", { characterSpacing: 1 });
  doc.moveDown(0.5);
  doc.fontSize(18).fillColor("#000").text(`${system.name} — Governance Report`);
  doc.fontSize(9).fillColor("#666").text(`Exported ${new Date().toISOString()}`);
  doc.moveDown();

  doc.fontSize(11).fillColor("#000");
  doc.text(`Owner: ${system.owner.name ?? system.owner.email}`);
  if (system.businessUnit) doc.text(`Business unit: ${system.businessUnit}`);
  doc.text(`Classification: ${system.classification}`);
  doc.text(`Deployment status: ${system.deploymentStatus}`);
  if (system.vendor) {
    doc.text(`Vendor: ${system.vendor.name} (BAA: ${system.vendor.baaStatus})`);
  } else if (system.vendorName) {
    doc.text(`Vendor: ${system.vendorName}`);
  }
  if (system.description) {
    doc.moveDown(0.25).fontSize(10).fillColor("#333").text(system.description);
  }

  // --- Risk classification ---
  heading(doc, "Risk Classification");
  if (!riskClassification) {
    doc.fontSize(10).fillColor("#666").text("No risk assessment has been completed for this system.");
  } else {
    doc
      .fontSize(11)
      .fillColor("#000")
      .text(
        `${USE_CASE_TEMPLATE_LABELS[riskClassification.useCaseTemplate]} — Risk tier: ${riskClassification.riskTier}`,
      );
    doc
      .fontSize(9)
      .fillColor("#666")
      .text(
        `Assessed by ${riskClassification.completedBy.name ?? riskClassification.completedBy.email} on ${riskClassification.completedAt.toISOString().slice(0, 10)}`,
      );

    const triggeredRegulations = mapTriggeredRegulations(riskClassification.triggeredRegulationRows);
    if (triggeredRegulations.length > 0) {
      doc.moveDown(0.25).fontSize(10).fillColor("#000").text("Regulations likely triggered:");
      triggeredRegulations.forEach((reg) => {
        doc.fontSize(10).fillColor("#333").text(`• ${reg.label}`, { indent: 12 });
      });
      doc
        .moveDown(0.25)
        .fontSize(8)
        .fillColor("#999")
        .text("This is an advisory self-assessment, not a legal determination — verify applicability with counsel.");
    }

    // Self-reported on the intake questionnaire (prior-auth/UM and
    // RCM/billing templates only) — the exact fact several 2026 state
    // payer/UM laws' human-review requirement turns on. Shown once here
    // rather than duplicated per state-law section below: it's one
    // answer, not a per-regulation evidence check.
    const humanReviewAnswer = (riskClassification.answers as Record<string, unknown> | null)?.[
      "humanReviewBeforeFinalization"
    ];
    if (typeof humanReviewAnswer === "number") {
      doc
        .moveDown(0.25)
        .fontSize(10)
        .fillColor("#000")
        .text(`Human review before finalization: ${humanReviewAnswer === 0 ? "Yes" : "No"}`);
    }

    // --- Supplementary risk assessment (slice 8) — GovernedAI's own
    // secondary lens, independent of the main risk tier above. Only
    // rendered when present, since rows from before this shipped have
    // neither field. ---
    if (riskClassification.lifeSafetyTier || riskClassification.techDataTier) {
      heading(doc, "Supplementary Risk Assessment");
      if (riskClassification.lifeSafetyTier) {
        doc.fontSize(10).fillColor("#333").text(`Life & patient safety: ${riskClassification.lifeSafetyTier}`);
      }
      if (riskClassification.techDataTier) {
        doc.fontSize(10).fillColor("#333").text(`Technology & data: ${riskClassification.techDataTier}`);
      }
      doc
        .moveDown(0.25)
        .fontSize(8)
        .fillColor("#999")
        .text("GovernedAI's own risk lens — not derived from or aligned to any external certification or proprietary framework.");
    }

    // --- Law-specific sections (only ones with a checkable artifact —
    // broad frameworks like NIST AI RMF/ISO 42001 have none) ---
    const sections = computeRegulationSectionStatuses(triggeredRegulations, evidence).filter(
      (section) => section.artifacts.length > 0,
    );
    sections.forEach((section) => {
      heading(doc, section.label);
      if (section.citation) doc.fontSize(9).fillColor("#666").text(section.citation);
      if (section.summary) doc.fontSize(10).fillColor("#333").text(section.summary);
      doc.moveDown(0.25);
      section.artifacts.forEach((artifact) => {
        const status = artifact.onFile ? "On file" : "Not on file";
        doc
          .fontSize(10)
          .fillColor(artifact.onFile ? "#0a7a0a" : "#a83232")
          .text(`[${status}] ${artifact.label}`, { indent: 12 });
        doc.fontSize(9).fillColor("#666").text(artifact.description, { indent: 24 });
        if (artifact.evidenceLabel) {
          doc.fontSize(9).fillColor("#666").text(`Evidence: ${artifact.evidenceLabel}`, { indent: 24 });
        }
        doc.moveDown(0.15);
      });
      doc
        .fontSize(8)
        .fillColor("#999")
        .text("Checklist based on evidence attached in this app — not a legal determination.");
    });
  }

  // --- Workflow / approval history ---
  heading(doc, "Workflow & Approval History");
  if (stages.length === 0) {
    doc.fontSize(10).fillColor("#666").text("No workflow stages recorded.");
  }
  stages.forEach((stage) => {
    doc
      .fontSize(10)
      .fillColor("#000")
      .text(`${stage.sequence}. ${stage.stageName} — ${stageStatusLabels[stage.status]}`);
    if (stage.decisionRationale) {
      doc.fontSize(9).fillColor("#666").text(stage.decisionRationale, { indent: 12 });
    }
    if (stage.decidedAt && stage.owner) {
      doc
        .fontSize(8)
        .fillColor("#999")
        .text(
          `Decided by ${stage.owner.name ?? stage.owner.email} on ${stage.decidedAt.toISOString().slice(0, 10)}`,
          { indent: 12 },
        );
    }
    doc.moveDown(0.25);
  });

  // --- Evidence ---
  heading(doc, "Evidence");
  if (evidence.length === 0) {
    doc.fontSize(10).fillColor("#666").text("No evidence attached.");
  }
  evidence.forEach((item) => {
    doc
      .fontSize(10)
      .fillColor("#000")
      .text(`[${item.category}] ${item.label ?? item.fileUrl ?? item.linkUrl}`);
    doc
      .fontSize(8)
      .fillColor("#999")
      .text(
        `${item.type.toLowerCase()} — uploaded by ${item.uploadedBy.name ?? item.uploadedBy.email} on ${item.uploadedAt.toISOString().slice(0, 10)}`,
        { indent: 12 },
      );
    doc.moveDown(0.15);
  });

  // --- Audit trail ---
  heading(doc, "Audit Trail");
  if (auditLog.length === 0) {
    doc.fontSize(10).fillColor("#666").text("No activity recorded.");
  }
  auditLog.forEach((entry) => {
    doc
      .fontSize(10)
      .fillColor("#000")
      .text(`${entry.occurredAt.toISOString()}  —  ${entry.actor.name ?? entry.actor.email}  —  ${entry.action}`);
    if (entry.detail) {
      doc.fontSize(8).fillColor("#999").text(JSON.stringify(entry.detail), { indent: 12 });
    }
    doc.moveDown(0.25);
  });

  doc.end();
  return done;
}

// One compact block per system, not a full per-system report each — for
// more than a handful of systems the latter would be enormous and
// unscannable. The system-level report (above) stays the place for full
// depth on one system; this is "where does everything stand."
export async function buildPortfolioReportPdf(
  organizationName: string,
  systems: PortfolioSystemInput[],
) {
  const doc = new PDFDocument({ margin: 50 });
  const chunks: Buffer[] = [];
  doc.on("data", (chunk) => chunks.push(chunk));
  const done = new Promise<Buffer>((resolve) => {
    doc.on("end", () => resolve(Buffer.concat(chunks)));
  });

  const logoSize = 28;
  const logoTop = doc.y;
  drawLogo(doc, doc.page.margins.left, logoTop, logoSize);
  doc.y = logoTop + logoSize + 10;

  doc.fontSize(9).fillColor("#666").text("GOVERNEDAI", { characterSpacing: 1 });
  doc.moveDown(0.5);
  doc.fontSize(18).fillColor("#000").text(`${organizationName} — Portfolio Governance Summary`);
  doc
    .fontSize(9)
    .fillColor("#666")
    .text(
      `Exported ${new Date().toISOString()} — ${systems.length} active system${systems.length === 1 ? "" : "s"}`,
    );
  doc.moveDown();

  // --- Aggregate summary ---
  const riskCounts: Partial<Record<RiskTier, number>> = {};
  let unassessed = 0;
  systems.forEach((system) => {
    if (system.riskClassification) {
      const tier = system.riskClassification.riskTier;
      riskCounts[tier] = (riskCounts[tier] ?? 0) + 1;
    } else {
      unassessed++;
    }
  });

  heading(doc, "Portfolio at a glance");
  (["LOW", "MODERATE", "HIGH", "CRITICAL"] as const).forEach((tier) => {
    doc.fontSize(10).fillColor("#333").text(`${tier}: ${riskCounts[tier] ?? 0}`, { indent: 12 });
  });
  if (unassessed > 0) {
    doc.fontSize(10).fillColor("#a83232").text(`Not yet assessed: ${unassessed}`, { indent: 12 });
  }

  // --- Per-system summary blocks ---
  heading(doc, "Systems");
  if (systems.length === 0) {
    doc.fontSize(10).fillColor("#666").text("No active AI systems.");
  }
  systems.forEach((system) => {
    const vendorName = system.vendor?.name ?? system.vendorName;
    const regulations = mapTriggeredRegulations(system.riskClassification?.triggeredRegulationRows ?? [])
      .map((reg) => reg.label)
      .join(", ");
    const missingCount = missingComplianceCount(system);

    doc.fontSize(11).fillColor("#000").text(system.name);
    doc
      .fontSize(9)
      .fillColor("#666")
      .text(
        `${system.classification} · ${system.deploymentStatus}` +
          (vendorName ? ` · ${vendorName}` : "") +
          ` · Risk: ${system.riskClassification?.riskTier ?? "Not assessed"}`,
        { indent: 12 },
      );
    if (regulations) {
      doc.fontSize(9).fillColor("#666").text(`Regulations: ${regulations}`, { indent: 12 });
    }
    if (missingCount > 0) {
      doc
        .fontSize(9)
        .fillColor("#a83232")
        .text(
          `${missingCount} compliance item${missingCount === 1 ? "" : "s"} missing evidence`,
          { indent: 12 },
        );
    }
    doc.moveDown(0.4);
  });

  doc.end();
  return done;
}
