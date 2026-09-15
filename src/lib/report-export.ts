import PDFDocument from "pdfkit";
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
import { USE_CASE_TEMPLATE_LABELS, REGULATION_LABELS } from "@/lib/risk-classification";
import { computeRegulationSectionStatuses } from "@/lib/regulation-sections";

type AuditEntryWithActor = AuditLogEntry & { actor: User };

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
  riskClassification: RiskClassification | null;
  evidence: {
    category: EvidenceCategory;
    label: string | null;
    fileUrl: string | null;
    linkUrl: string | null;
  }[];
}

function missingComplianceCount(system: PortfolioSystemInput): number {
  return computeRegulationSectionStatuses(
    system.riskClassification?.triggeredRegulations ?? [],
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
    const regulations = (system.riskClassification?.triggeredRegulations ?? [])
      .map((reg) => REGULATION_LABELS[reg])
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
  riskClassification: (RiskClassification & { completedBy: User }) | null;
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

// Same shield-and-checkmark mark as the governedai.co favicon, drawn as
// native PDF vectors (not an embedded raster) so it stays crisp at any
// size with no image asset or extra dependency. Shield = governance/
// protection, checkmark = audit-passed — the mark already represents
// what this report is for.
const BRAND_GREEN = "#1F6F63";
const BRAND_OFFWHITE = "#F6FAF9";

function drawLogo(doc: PDFKit.PDFDocument, x: number, y: number, size: number) {
  const scale = size / 32;
  doc.save();
  doc.translate(x, y).scale(scale);
  doc.roundedRect(0, 0, 32, 32, 6).fill(BRAND_GREEN);
  doc
    .path("M16 6l9 3.4v6.2c0 6.2-3.9 10.9-9 12.4-5.1-1.5-9-6.2-9-12.4V9.4L16 6z")
    .lineWidth(2)
    .lineJoin("round")
    .stroke(BRAND_OFFWHITE);
  doc
    .path("M12 16.2l3 3 5.5-6")
    .lineWidth(2)
    .lineCap("round")
    .lineJoin("round")
    .stroke(BRAND_OFFWHITE);
  doc.restore();
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

    if (riskClassification.triggeredRegulations.length > 0) {
      doc.moveDown(0.25).fontSize(10).fillColor("#000").text("Regulations likely triggered:");
      riskClassification.triggeredRegulations.forEach((reg) => {
        doc.fontSize(10).fillColor("#333").text(`• ${REGULATION_LABELS[reg]}`, { indent: 12 });
      });
      doc
        .moveDown(0.25)
        .fontSize(8)
        .fillColor("#999")
        .text("This is an advisory self-assessment, not a legal determination — verify applicability with counsel.");
    }

    // --- Law-specific sections ---
    const sections = computeRegulationSectionStatuses(riskClassification.triggeredRegulations, evidence);
    sections.forEach((section) => {
      heading(doc, section.title);
      doc.fontSize(9).fillColor("#666").text(section.citation);
      doc.fontSize(10).fillColor("#333").text(section.summary);
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
    const regulations = (system.riskClassification?.triggeredRegulations ?? [])
      .map((reg) => REGULATION_LABELS[reg])
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
