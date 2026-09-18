import { prisma } from "@/lib/prisma";

// Human labels for every action string logAuditEntry is called with. The
// Activity log page's filter dropdown is built from this map, and
// activity-log.test.ts fails if a new action is logged without a label here.
export const AUDIT_ACTION_LABELS: Record<string, string> = {
  system_created: "System registered",
  system_updated: "System details edited",
  system_archived: "System archived",
  system_unarchived: "System unarchived",
  risk_classified: "Risk assessment completed",
  stage_transitioned: "Workflow decision recorded",
  evidence_attached: "Evidence attached",
  incident_reported: "Incident reported",
  incident_resolved: "Incident resolved",
  share_link_created: "Auditor share link created",
  share_link_revoked: "Auditor share link revoked",
  regulatory_update_reviewed: "Regulatory update reviewed",
  regulatory_update_flagged: "Flagged for recertification (regulatory update)",
};

// Falls back to a readable version of the raw string for an action that
// somehow has no label (e.g. from before a rename), rather than showing nothing.
export function auditActionLabel(action: string): string {
  // Own-property check: a plain `in`/index lookup would also hit inherited
  // Object.prototype members like "toString".
  if (Object.hasOwn(AUDIT_ACTION_LABELS, action)) return AUDIT_ACTION_LABELS[action];
  const spaced = action.replace(/_/g, " ").trim();
  return spaced ? spaced.charAt(0).toUpperCase() + spaced.slice(1) : action;
}

export const ACTIVITY_PAGE_SIZE = 50;

export interface ActivityParams {
  page: number;
  action: string | null;
  systemId: string | null;
}

// Query-string input is untrusted: an unknown action is ignored (the filter
// only offers known ones) and a bad page number falls back to page 1.
export function parseActivityParams(searchParams: {
  page?: string;
  action?: string;
  system?: string;
}): ActivityParams {
  const page = Number.parseInt(searchParams.page ?? "", 10);
  const action = searchParams.action && Object.hasOwn(AUDIT_ACTION_LABELS, searchParams.action) ? searchParams.action : null;
  const systemId = searchParams.system?.trim() || null;
  return { page: Number.isInteger(page) && page >= 1 ? page : 1, action, systemId };
}

export function pageCount(total: number, pageSize = ACTIVITY_PAGE_SIZE): number {
  return Math.max(1, Math.ceil(total / pageSize));
}

export function clampPage(page: number, total: number, pageSize = ACTIVITY_PAGE_SIZE): number {
  return Math.min(Math.max(1, page), pageCount(total, pageSize));
}

// Server time zone is UTC, so say so rather than imply the reader's local time.
export function formatUtc(date: Date): string {
  return `${date.toISOString().slice(0, 16).replace("T", " ")} UTC`;
}

// Always scoped through aiSystem.organizationId — a system id from another
// organization in ?system= simply matches nothing.
export async function listActivity(organizationId: string, params: ActivityParams) {
  const where = {
    aiSystem: { organizationId },
    ...(params.action ? { action: params.action } : {}),
    ...(params.systemId ? { aiSystemId: params.systemId } : {}),
  };

  const total = await prisma.auditLogEntry.count({ where });
  const page = clampPage(params.page, total);
  const entries = await prisma.auditLogEntry.findMany({
    where,
    include: { actor: true, aiSystem: { select: { id: true, name: true } } },
    orderBy: [{ occurredAt: "desc" }, { id: "desc" }],
    skip: (page - 1) * ACTIVITY_PAGE_SIZE,
    take: ACTIVITY_PAGE_SIZE,
  });

  return { entries, total, page, pageCount: pageCount(total) };
}
