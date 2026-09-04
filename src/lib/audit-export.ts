import PDFDocument from "pdfkit";
import type { AuditLogEntry, User } from "@prisma/client";

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

export function buildAuditCsv(systemName: string, entries: AuditEntryWithActor[]) {
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

export async function buildAuditPdf(systemName: string, entries: AuditEntryWithActor[]) {
  const doc = new PDFDocument({ margin: 50 });
  const chunks: Buffer[] = [];
  doc.on("data", (chunk) => chunks.push(chunk));
  const done = new Promise<Buffer>((resolve) => {
    doc.on("end", () => resolve(Buffer.concat(chunks)));
  });

  doc.fontSize(18).text(`${systemName} — Audit Log`);
  doc.fontSize(9).fillColor("#666").text(`Exported ${new Date().toISOString()}`);
  doc.moveDown();

  if (entries.length === 0) {
    doc.fontSize(11).fillColor("#000").text("No activity recorded.");
  }

  entries.forEach((entry) => {
    doc
      .fontSize(11)
      .fillColor("#000")
      .text(`${entry.occurredAt.toISOString()}  —  ${entry.actor.name ?? entry.actor.email}  —  ${entry.action}`);
    if (entry.detail) {
      doc
        .fontSize(9)
        .fillColor("#666")
        .text(JSON.stringify(entry.detail), { indent: 12 });
    }
    doc.moveDown(0.5);
  });

  doc.end();
  return done;
}
