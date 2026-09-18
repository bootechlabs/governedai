import type {
  RegulatoryReviewOutcome,
  RegulatoryUpdateKind,
  UseCaseTemplate,
} from "@prisma/client";
import { USE_CASE_TEMPLATE_LABELS } from "@/lib/risk-classification";

// Slice 17 — regulatory updates feed. Everything here is pure (types-only
// import from @prisma/client, no database), so the platform-admin form, the
// org-facing pages, and the tests share one implementation; the queries live in
// src/lib/regulatory-updates-db.ts.

export const UPDATE_KINDS = [
  "ENACTED",
  "EFFECTIVE_DATE_CHANGE",
  "GUIDANCE",
  "ENFORCEMENT",
  "PROPOSED",
  "ACCREDITATION",
  "OTHER",
] as const satisfies readonly RegulatoryUpdateKind[];

export const KIND_LABELS: Record<RegulatoryUpdateKind, string> = {
  ENACTED: "Enacted",
  EFFECTIVE_DATE_CHANGE: "Effective date change",
  GUIDANCE: "Guidance",
  ENFORCEMENT: "Enforcement",
  PROPOSED: "Proposed",
  ACCREDITATION: "Accreditation",
  OTHER: "Other",
};

export const REVIEW_OUTCOMES = [
  "NO_ACTION_NEEDED",
  "REASSESSMENT_FLAGGED",
] as const satisfies readonly RegulatoryReviewOutcome[];

export const OUTCOME_LABELS: Record<RegulatoryReviewOutcome, string> = {
  NO_ACTION_NEEDED: "No action needed",
  REASSESSMENT_FLAGGED: "Reassessment needed",
};

export const USE_CASE_TEMPLATES = Object.keys(USE_CASE_TEMPLATE_LABELS) as UseCaseTemplate[];

// Same advisory posture as the per-regulation checklists.
export const REGULATORY_DISCLAIMER =
  "Informational summary of a public development. This is not legal advice and not a determination that any requirement applies to your organization. Confirm with counsel.";

export const RECERT_CHANGE_FIELD = "regulatory_update";

const MAX_TITLE = 200;
const MAX_SUMMARY = 1000;
const MAX_WHY = 500;
const MAX_NOTE = 2000;

// ---------------------------------------------------------------------------
// Curation input
// ---------------------------------------------------------------------------

export interface UpdateInput {
  title: string;
  summary: string;
  whyItMatters: string | null;
  kind: RegulatoryUpdateKind;
  sourceName: string;
  sourceUrl: string;
  eventDate: Date;
  effectiveDate: Date | null;
  useCaseTemplates: UseCaseTemplate[];
  regulationIds: string[];
  vertical: string | null;
  actionRequired: boolean;
  revisionNote: string | null;
}

export type ParseResult<T> = { ok: true; value: T } | { ok: false; errors: string[] };

// https only: a source link is the trust anchor of an item, and it is rendered
// as an outbound link in a compliance product.
export function isHttpsUrl(raw: string): boolean {
  try {
    return new URL(raw).protocol === "https:";
  } catch {
    return false;
  }
}

function parseDate(raw: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(raw)) return null;
  const date = new Date(`${raw}T00:00:00.000Z`);
  return Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== raw ? null : date;
}

function clean(raw: string | undefined | null): string {
  return (raw ?? "").trim();
}

export interface RawUpdateInput {
  title?: string;
  summary?: string;
  whyItMatters?: string;
  kind?: string;
  sourceName?: string;
  sourceUrl?: string;
  eventDate?: string;
  effectiveDate?: string;
  useCaseTemplates?: string[];
  regulationIds?: string[];
  vertical?: string;
  actionRequired?: boolean;
  revisionNote?: string;
}

// `revisionRequired` is true when editing an already-published item: a visible
// correction needs a note, and the caller stamps revisedAt.
export function parseUpdateInput(
  raw: RawUpdateInput,
  options: { revisionRequired: boolean; knownRegulationIds?: ReadonlySet<string> },
): ParseResult<UpdateInput> {
  const errors: string[] = [];

  const title = clean(raw.title);
  if (!title) errors.push("Title is required");
  else if (title.length > MAX_TITLE) errors.push(`Title must be at most ${MAX_TITLE} characters`);

  const summary = clean(raw.summary);
  if (!summary) errors.push("Summary is required");
  else if (summary.length > MAX_SUMMARY) errors.push(`Summary must be at most ${MAX_SUMMARY} characters`);

  const whyItMatters = clean(raw.whyItMatters) || null;
  if (whyItMatters && whyItMatters.length > MAX_WHY) {
    errors.push(`"Why it may matter" must be at most ${MAX_WHY} characters`);
  }

  const kind = clean(raw.kind);
  if (!(UPDATE_KINDS as readonly string[]).includes(kind)) errors.push("Kind is required");

  const sourceName = clean(raw.sourceName);
  if (!sourceName) errors.push("Source name is required");

  const sourceUrl = clean(raw.sourceUrl);
  if (!sourceUrl) errors.push("Source link is required");
  else if (!isHttpsUrl(sourceUrl)) errors.push("Source link must be an https:// URL");

  const eventDate = parseDate(clean(raw.eventDate));
  if (!eventDate) errors.push("Event date is required (YYYY-MM-DD)");

  const effectiveRaw = clean(raw.effectiveDate);
  const effectiveDate = effectiveRaw ? parseDate(effectiveRaw) : null;
  if (effectiveRaw && !effectiveDate) errors.push("Effective date must be YYYY-MM-DD");

  const templates = [...new Set(raw.useCaseTemplates ?? [])];
  const badTemplates = templates.filter((t) => !USE_CASE_TEMPLATES.includes(t as UseCaseTemplate));
  if (badTemplates.length > 0) errors.push(`Unknown use-case template: ${badTemplates.join(", ")}`);

  const regulationIds = [...new Set(raw.regulationIds ?? [])];
  if (options.knownRegulationIds) {
    const unknown = regulationIds.filter((id) => !options.knownRegulationIds!.has(id));
    if (unknown.length > 0) errors.push("One or more linked regulations no longer exist");
  }

  const revisionNote = clean(raw.revisionNote) || null;
  if (options.revisionRequired && !revisionNote) {
    errors.push("A revision note is required when changing a published update");
  }
  if (revisionNote && revisionNote.length > MAX_NOTE) {
    errors.push(`Revision note must be at most ${MAX_NOTE} characters`);
  }

  if (errors.length > 0) return { ok: false, errors };

  return {
    ok: true,
    value: {
      title,
      summary,
      whyItMatters,
      kind: kind as RegulatoryUpdateKind,
      sourceName,
      sourceUrl,
      eventDate: eventDate!,
      effectiveDate,
      useCaseTemplates: templates as UseCaseTemplate[],
      regulationIds,
      vertical: clean(raw.vertical) || null,
      actionRequired: raw.actionRequired === true,
      revisionNote,
    },
  };
}

export function slugify(title: string): string {
  return title
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

// Belt and braces at publish time: stored rows are validated on write, but a
// seeded or hand-edited row could be incomplete.
export function publishBlockers(row: {
  summary: string;
  sourceUrl: string;
  sourceName: string;
  kind: string | null;
  eventDate: Date | null;
}): string[] {
  const blockers: string[] = [];
  if (!row.summary.trim()) blockers.push("a summary");
  if (!row.sourceName.trim()) blockers.push("a source name");
  if (!isHttpsUrl(row.sourceUrl)) blockers.push("an https source link");
  if (!row.kind) blockers.push("a kind");
  if (!row.eventDate) blockers.push("an event date");
  return blockers;
}

export type UpdateStatus = "draft" | "published" | "archived";

export function updateStatus(row: { publishedAt: Date | null; archivedAt: Date | null }): UpdateStatus {
  if (row.archivedAt) return "archived";
  return row.publishedAt ? "published" : "draft";
}

// ---------------------------------------------------------------------------
// Matching (computed at read time, never stored)
// ---------------------------------------------------------------------------

export interface MatchSystem {
  id: string;
  name: string;
  archivedAt: Date | null;
  riskClassification: { useCaseTemplate: UseCaseTemplate; regulationIds: string[] } | null;
}

export interface MatchUpdate {
  vertical: string | null;
  useCaseTemplates: UseCaseTemplate[];
  regulations: { id: string; label: string }[];
}

export type MatchReason =
  | { kind: "regulation"; regulationId: string; label: string }
  | { kind: "template"; template: UseCaseTemplate; label: string };

export interface AffectedSystem {
  id: string;
  name: string;
  reasons: MatchReason[];
}

export interface AffectedResult {
  // False when the update is scoped to another vertical: the org should not
  // see it at all.
  visible: boolean;
  affected: AffectedSystem[];
  // Active systems with no completed risk classification. They can't match by
  // either reason, so they are counted rather than silently ignored.
  unassessedCount: number;
}

// Organization.vertical is free text, so compare without regard to case/space.
export function updateAppliesToVertical(
  updateVertical: string | null,
  orgVertical: string | null,
): boolean {
  if (updateVertical === null) return true;
  return (orgVertical ?? "").trim().toLowerCase() === updateVertical.trim().toLowerCase();
}

// `systems` must already be the org's own systems — org scoping is the
// caller's query, not this function's job (see regulatory-updates-db.ts).
export function computeAffectedSystems(
  update: MatchUpdate,
  orgVertical: string | null,
  systems: MatchSystem[],
): AffectedResult {
  if (!updateAppliesToVertical(update.vertical, orgVertical)) {
    return { visible: false, affected: [], unassessedCount: 0 };
  }

  const active = systems.filter((s) => s.archivedAt === null);
  const affected: AffectedSystem[] = [];

  for (const system of active) {
    const classification = system.riskClassification;
    if (!classification) continue;

    const reasons: MatchReason[] = [];
    for (const regulation of update.regulations) {
      if (classification.regulationIds.includes(regulation.id)) {
        reasons.push({ kind: "regulation", regulationId: regulation.id, label: regulation.label });
      }
    }
    if (update.useCaseTemplates.includes(classification.useCaseTemplate)) {
      reasons.push({
        kind: "template",
        template: classification.useCaseTemplate,
        label: USE_CASE_TEMPLATE_LABELS[classification.useCaseTemplate],
      });
    }
    if (reasons.length > 0) affected.push({ id: system.id, name: system.name, reasons });
  }

  return {
    visible: true,
    affected,
    unassessedCount: active.filter((s) => s.riskClassification === null).length,
  };
}

// The wording stays "may": a match is a prompt to look, not a determination.
export function describeMatchReason(reason: MatchReason): string {
  return reason.kind === "regulation"
    ? `${reason.label} is triggered for this system`
    : `Use-case template: ${reason.label}`;
}

// ---------------------------------------------------------------------------
// Review state
// ---------------------------------------------------------------------------

export type ReviewState = "unreviewed" | "reviewed" | "stale";

// Stale when the update was revised after the org last reviewed it.
export function reviewState(
  update: { revisedAt: Date | null },
  review: { reviewedAt: Date } | null,
): ReviewState {
  if (!review) return "unreviewed";
  if (update.revisedAt && update.revisedAt.getTime() > review.reviewedAt.getTime()) return "stale";
  return "reviewed";
}

// "Needs review": affects at least one system and isn't currently reviewed.
export function needsReview(affectedCount: number, state: ReviewState): boolean {
  return affectedCount > 0 && state !== "reviewed";
}

export function formatDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}
