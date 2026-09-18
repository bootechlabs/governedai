import type { RegulatoryReviewOutcome, RegulatoryUpdateKind, UseCaseTemplate } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { logAuditEntry } from "@/lib/audit-log";
import {
  RECERT_CHANGE_FIELD,
  REVIEW_OUTCOMES,
  computeAffectedSystems,
  describeMatchReason,
  needsReview,
  reviewState,
  type AffectedSystem,
  type MatchSystem,
  type ReviewState,
} from "@/lib/regulatory-updates";

// Org-facing reads for the regulatory updates feed. RegulatoryUpdate is the
// only global table here; everything touching systems or reviews is filtered by
// the caller's organizationId in the query itself, and matching happens in
// memory over that org's own rows (see computeAffectedSystems).

export interface FeedRegulation {
  id: string;
  code: string;
  label: string;
  citation: string | null;
  effectiveDate: Date | null;
}

export interface FeedReview {
  outcome: RegulatoryReviewOutcome;
  note: string | null;
  reviewedAt: Date;
  reviewedById: string;
  // Only filled by loadOrgUpdate (the detail page shows who).
  reviewedByName?: string | null;
}

export interface FeedItem {
  id: string;
  slug: string;
  title: string;
  summary: string;
  whyItMatters: string | null;
  kind: RegulatoryUpdateKind;
  sourceName: string;
  sourceUrl: string;
  eventDate: Date;
  effectiveDate: Date | null;
  actionRequired: boolean;
  publishedAt: Date;
  revisedAt: Date | null;
  revisionNote: string | null;
  useCaseTemplates: UseCaseTemplate[];
  regulations: FeedRegulation[];
  affected: AffectedSystem[];
  review: FeedReview | null;
  reviewState: ReviewState;
  needsReview: boolean;
}

interface OrgContext {
  vertical: string | null;
  systems: MatchSystem[];
  reviews: Map<string, FeedReview>;
}

async function loadOrgContext(organizationId: string): Promise<OrgContext> {
  const [org, systems, reviews] = await Promise.all([
    prisma.organization.findUniqueOrThrow({ where: { id: organizationId }, select: { vertical: true } }),
    prisma.aiSystem.findMany({
      where: { organizationId, archivedAt: null },
      select: {
        id: true,
        name: true,
        archivedAt: true,
        riskClassification: {
          select: {
            useCaseTemplate: true,
            triggeredRegulationRows: { select: { regulationId: true } },
          },
        },
      },
      orderBy: { name: "asc" },
    }),
    prisma.regulatoryUpdateReview.findMany({ where: { organizationId } }),
  ]);

  return {
    vertical: org.vertical,
    systems: systems.map((s) => ({
      id: s.id,
      name: s.name,
      archivedAt: s.archivedAt,
      riskClassification: s.riskClassification && {
        useCaseTemplate: s.riskClassification.useCaseTemplate,
        regulationIds: s.riskClassification.triggeredRegulationRows.map((r) => r.regulationId),
      },
    })),
    reviews: new Map(
      reviews.map((r) => [
        r.updateId,
        { outcome: r.outcome, note: r.note, reviewedAt: r.reviewedAt, reviewedById: r.reviewedById },
      ]),
    ),
  };
}

// Only what orgs may ever see: published and not archived.
const PUBLIC_UPDATE = { publishedAt: { not: null }, archivedAt: null } as const;

const updateInclude = {
  regulations: {
    include: {
      regulation: { select: { id: true, code: true, label: true, citation: true, effectiveDate: true } },
    },
  },
} as const;

type UpdateRow = Awaited<ReturnType<typeof prisma.regulatoryUpdate.findMany<{ include: typeof updateInclude }>>>[number];

// Returns null when the update is scoped to a vertical the org isn't in.
function toFeedItem(row: UpdateRow, ctx: OrgContext): FeedItem | null {
  const regulations = row.regulations.map((r) => r.regulation);
  const result = computeAffectedSystems(
    { vertical: row.vertical, useCaseTemplates: row.useCaseTemplates, regulations },
    ctx.vertical,
    ctx.systems,
  );
  if (!result.visible) return null;

  const review = ctx.reviews.get(row.id) ?? null;
  const state = reviewState(row, review);

  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    summary: row.summary,
    whyItMatters: row.whyItMatters,
    kind: row.kind,
    sourceName: row.sourceName,
    sourceUrl: row.sourceUrl,
    eventDate: row.eventDate,
    effectiveDate: row.effectiveDate,
    actionRequired: row.actionRequired,
    publishedAt: row.publishedAt!,
    revisedAt: row.revisedAt,
    revisionNote: row.revisionNote,
    useCaseTemplates: row.useCaseTemplates,
    regulations,
    affected: result.affected,
    review,
    reviewState: state,
    needsReview: needsReview(result.affected.length, state),
  };
}

export async function loadOrgFeed(
  organizationId: string,
): Promise<{ items: FeedItem[]; unassessedCount: number }> {
  const [ctx, rows] = await Promise.all([
    loadOrgContext(organizationId),
    prisma.regulatoryUpdate.findMany({
      where: PUBLIC_UPDATE,
      include: updateInclude,
      orderBy: [{ publishedAt: "desc" }, { id: "desc" }],
    }),
  ]);

  const items = rows.map((row) => toFeedItem(row, ctx)).filter((item): item is FeedItem => item !== null);
  return { items, unassessedCount: ctx.systems.filter((s) => s.riskClassification === null).length };
}

export async function loadOrgUpdate(
  organizationId: string,
  id: string,
): Promise<{ item: FeedItem; unassessedCount: number } | null> {
  const [ctx, row] = await Promise.all([
    loadOrgContext(organizationId),
    prisma.regulatoryUpdate.findFirst({ where: { id, ...PUBLIC_UPDATE }, include: updateInclude }),
  ]);
  if (!row) return null;

  const item = toFeedItem(row, ctx);
  if (!item) return null;

  if (item.review) {
    // Scoped to the org too, so a review can never surface another org's user.
    const reviewer = await prisma.user.findFirst({
      where: { id: item.review.reviewedById, organizationId },
      select: { name: true, email: true },
    });
    item.review = { ...item.review, reviewedByName: reviewer ? (reviewer.name ?? reviewer.email) : null };
  }
  return { item, unassessedCount: ctx.systems.filter((s) => s.riskClassification === null).length };
}

export const MAX_REVIEW_NOTE = 2000;

// Records that this org looked at an update.
//
// One AuditLogEntry per affected active system AT THIS MOMENT, through the
// shared helper so each system's hash chain stays intact. That freezes "which
// systems this org considered affected at review time" — matching is computed
// live and can change later. With no affected systems nothing is written to any
// audit trail and the review row stands alone.
//
// The RegulatoryUpdateReview row is NOT hash-chained; only the per-system
// entries are tamper-evident. Entries are written first and the review row
// after: a failure halfway leaves extra evidence rather than a "reviewed" mark
// with no evidence behind it, and a retry is idempotent for the review row.
export async function recordRegulatoryReview(input: {
  organizationId: string;
  actorId: string;
  updateId: string;
  outcome: RegulatoryReviewOutcome;
  note: string | null;
}): Promise<{ auditedSystemCount: number }> {
  if (!(REVIEW_OUTCOMES as readonly string[]).includes(input.outcome)) {
    throw new Error("Choose a review outcome");
  }
  const note = input.note?.trim() || null;
  if (note && note.length > MAX_REVIEW_NOTE) {
    throw new Error(`Note must be at most ${MAX_REVIEW_NOTE} characters`);
  }

  const loaded = await loadOrgUpdate(input.organizationId, input.updateId);
  if (!loaded) throw new Error("Regulatory update not found");
  const { item } = loaded;

  // Sequential: each system has its own chain, and a chain is read-then-write.
  for (const system of item.affected) {
    await logAuditEntry({
      aiSystemId: system.id,
      actorId: input.actorId,
      action: "regulatory_update_reviewed",
      detail: {
        updateId: item.id,
        slug: item.slug,
        title: item.title,
        outcome: input.outcome,
        matchReasons: system.reasons.map(describeMatchReason),
      },
    });
  }

  const reviewedAt = new Date();
  await prisma.regulatoryUpdateReview.upsert({
    where: { updateId_organizationId: { updateId: item.id, organizationId: input.organizationId } },
    create: {
      updateId: item.id,
      organizationId: input.organizationId,
      reviewedById: input.actorId,
      outcome: input.outcome,
      note,
      reviewedAt,
    },
    update: { reviewedById: input.actorId, outcome: input.outcome, note, reviewedAt },
  });

  return { auditedSystemCount: item.affected.length };
}

// Explicit, admin-only, never automatic. Writes a ChangeEvent per affected
// system, which the existing computed recertification logic reads by timestamp
// alone (see needsRecertification in src/lib/workflow.ts) to re-open the
// decision form — it does not go through keyChangeValues on purpose — plus an
// audit entry so the action itself is on the record.
export async function flagAffectedForRecertification(input: {
  organizationId: string;
  actorId: string;
  updateId: string;
}): Promise<{ flaggedSystemCount: number }> {
  const loaded = await loadOrgUpdate(input.organizationId, input.updateId);
  if (!loaded) throw new Error("Regulatory update not found");
  const { item } = loaded;

  for (const system of item.affected) {
    await prisma.changeEvent.create({
      data: {
        aiSystemId: system.id,
        actorId: input.actorId,
        field: RECERT_CHANGE_FIELD,
        beforeValue: null,
        afterValue: item.slug,
      },
    });
    await logAuditEntry({
      aiSystemId: system.id,
      actorId: input.actorId,
      action: "regulatory_update_flagged",
      detail: {
        updateId: item.id,
        slug: item.slug,
        title: item.title,
        matchReasons: system.reasons.map(describeMatchReason),
      },
    });
  }
  return { flaggedSystemCount: item.affected.length };
}
