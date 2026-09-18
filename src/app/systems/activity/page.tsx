import Link from "next/link";
import { Activity } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/current-user";
import {
  ACTIVITY_PAGE_SIZE,
  AUDIT_ACTION_LABELS,
  auditActionLabel,
  formatUtc,
  listActivity,
  parseActivityParams,
} from "@/lib/activity-log";
import { inputClass, primaryButtonClass, subtleLinkClass } from "@/lib/ui";

export const dynamic = "force-dynamic";

// Org-wide activity across every system — what used to be the dashboard's
// "Recent activity" list, now paginated and filterable. Visible to every
// signed-in role (as the dashboard panel was). detail JSON is deliberately not
// shown: it can carry decision rationale and other free text.
export default async function ActivityLogPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; action?: string; system?: string }>;
}) {
  const actor = await getCurrentUser();
  const params = parseActivityParams(await searchParams);

  const [{ entries, total, page, pageCount }, systems] = await Promise.all([
    listActivity(actor.organizationId, params),
    prisma.aiSystem.findMany({
      where: { organizationId: actor.organizationId },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
  ]);

  const filtered = params.action !== null || params.systemId !== null;
  const pageHref = (target: number) => {
    const query = new URLSearchParams();
    if (params.action) query.set("action", params.action);
    if (params.systemId) query.set("system", params.systemId);
    if (target > 1) query.set("page", String(target));
    const qs = query.toString();
    return `/systems/activity${qs ? `?${qs}` : ""}`;
  };
  const first = total === 0 ? 0 : (page - 1) * ACTIVITY_PAGE_SIZE + 1;
  const last = Math.min(page * ACTIVITY_PAGE_SIZE, total);

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 sm:py-12">
      <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight">
        <Activity size={22} />
        Activity log
      </h1>
      <p className="mt-1 text-sm text-zinc-500">
        Every change and decision across all systems in your organization, newest first. Times are
        UTC.
      </p>

      <form method="get" className="mt-6 flex flex-wrap items-end gap-3">
        <label className="flex min-w-0 flex-col gap-1 text-xs text-zinc-500">
          Action
          <select name="action" defaultValue={params.action ?? ""} className={inputClass}>
            <option value="">All actions</option>
            {Object.entries(AUDIT_ACTION_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>
        <label className="flex min-w-0 flex-col gap-1 text-xs text-zinc-500">
          System
          <select name="system" defaultValue={params.systemId ?? ""} className={inputClass}>
            <option value="">All systems</option>
            {systems.map((system) => (
              <option key={system.id} value={system.id}>
                {system.name}
              </option>
            ))}
          </select>
        </label>
        <button type="submit" className={primaryButtonClass}>
          Filter
        </button>
        {filtered && (
          <Link href="/systems/activity" className={`py-1.5 text-sm ${subtleLinkClass}`}>
            Clear
          </Link>
        )}
      </form>

      <ul className="mt-6 border-t border-zinc-200 dark:border-zinc-800">
        {entries.length === 0 && (
          <li className="py-6 text-sm text-zinc-500">
            {filtered ? "No activity matches these filters." : "No activity yet."}
          </li>
        )}
        {entries.map((entry) => (
          <li
            key={entry.id}
            className="flex flex-col gap-0.5 border-b border-zinc-200 py-3 text-sm dark:border-zinc-800 md:flex-row md:items-baseline md:gap-4"
          >
            <time
              dateTime={entry.occurredAt.toISOString()}
              className="shrink-0 text-xs tabular-nums text-zinc-500 md:w-40"
            >
              {formatUtc(entry.occurredAt)}
            </time>
            <span className="font-medium">{auditActionLabel(entry.action)}</span>
            <Link
              href={`/systems/${entry.aiSystem.id}`}
              className="min-w-0 truncate text-zinc-600 underline hover:no-underline dark:text-zinc-400"
            >
              {entry.aiSystem.name}
            </Link>
            <span className="text-xs text-zinc-500 md:ml-auto">
              {entry.actor.name ?? entry.actor.email}
            </span>
          </li>
        ))}
      </ul>

      {total > 0 && (
        <div className="mt-4 flex items-center justify-between text-sm text-zinc-500">
          <span>
            {first}–{last} of {total}
          </span>
          <span className="flex items-center gap-4">
            {page > 1 ? (
              <Link href={pageHref(page - 1)} className={subtleLinkClass}>
                ← Newer
              </Link>
            ) : (
              <span className="text-zinc-300 dark:text-zinc-700">← Newer</span>
            )}
            <span className="text-xs">
              Page {page} of {pageCount}
            </span>
            {page < pageCount ? (
              <Link href={pageHref(page + 1)} className={subtleLinkClass}>
                Older →
              </Link>
            ) : (
              <span className="text-zinc-300 dark:text-zinc-700">Older →</span>
            )}
          </span>
        </div>
      )}
    </div>
  );
}
