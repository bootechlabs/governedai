import type { RegulatoryReviewOutcome, RegulatoryUpdateKind, UseCaseTemplate } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import {
  computeAffectedSystems,
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
  return { item, unassessedCount: ctx.systems.filter((s) => s.riskClassification === null).length };
}
