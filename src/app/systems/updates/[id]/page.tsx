import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ExternalLink } from "lucide-react";
import { getCurrentUser } from "@/lib/current-user";
import { loadOrgUpdate } from "@/lib/regulatory-updates-db";
import { UpdateFlagBadge, UpdateKindBadge, UpdateReviewBadge } from "@/lib/badges";
import { REGULATORY_DISCLAIMER, describeMatchReason, formatDate } from "@/lib/regulatory-updates";

export const dynamic = "force-dynamic";

export default async function RegulatoryUpdateDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const actor = await getCurrentUser();
  const loaded = await loadOrgUpdate(actor.organizationId, id);
  if (!loaded) notFound();
  const { item, unassessedCount } = loaded;

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6 sm:py-12">
      <Link href="/systems/updates" className="inline-flex items-center gap-1 text-sm text-zinc-500 hover:underline">
        <ArrowLeft size={14} />
        All updates
      </Link>

      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1">
        <UpdateKindBadge value={item.kind} />
        {item.actionRequired && <UpdateFlagBadge flag="actionRequired" />}
        {item.affected.length > 0 && <UpdateReviewBadge state={item.reviewState} />}
      </div>

      <h1 className="mt-2 text-2xl font-semibold tracking-tight">{item.title}</h1>

      <dl className="mt-3 flex flex-wrap gap-x-6 gap-y-1 text-sm text-zinc-500">
        <div className="flex gap-1.5">
          <dt>Event date</dt>
          <dd className="text-zinc-700 dark:text-zinc-300">{formatDate(item.eventDate)}</dd>
        </div>
        {item.effectiveDate && (
          <div className="flex gap-1.5">
            <dt>Effective</dt>
            <dd className="text-zinc-700 dark:text-zinc-300">{formatDate(item.effectiveDate)}</dd>
          </div>
        )}
        <div className="flex gap-1.5">
          <dt>Published</dt>
          <dd className="text-zinc-700 dark:text-zinc-300">{formatDate(item.publishedAt)}</dd>
        </div>
      </dl>

      {item.revisedAt && (
        <p className="mt-3 rounded-lg border border-zinc-200 px-3 py-2 text-sm text-zinc-600 dark:border-zinc-800 dark:text-zinc-400">
          <span className="font-medium">Revised {formatDate(item.revisedAt)}.</span> {item.revisionNote}
        </p>
      )}

      <p className="mt-5 text-sm leading-relaxed">{item.summary}</p>

      {item.whyItMatters && (
        <div className="mt-4">
          <h2 className="text-xs font-medium uppercase tracking-wide text-zinc-500">Why it may matter</h2>
          <p className="mt-1 text-sm leading-relaxed text-zinc-700 dark:text-zinc-300">{item.whyItMatters}</p>
        </div>
      )}

      <a
        href={item.sourceUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="mt-4 inline-flex items-center gap-1.5 text-sm text-zinc-600 underline hover:no-underline dark:text-zinc-400"
      >
        <ExternalLink size={14} />
        {item.sourceName}
      </a>

      {item.regulations.length > 0 && (
        <section className="mt-8">
          <h2 className="text-sm font-medium uppercase tracking-wide text-zinc-500">Linked regulations</h2>
          <ul className="mt-3 flex flex-col gap-2">
            {item.regulations.map((regulation) => (
              <li
                key={regulation.id}
                className="rounded-lg border border-zinc-200 px-3 py-2 text-sm dark:border-zinc-800"
              >
                <span className="font-medium">{regulation.label}</span>
                {regulation.citation && <span className="text-zinc-500"> · {regulation.citation}</span>}
                {regulation.effectiveDate && (
                  <span className="text-zinc-500"> · effective {formatDate(regulation.effectiveDate)}</span>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="mt-8">
        <h2 className="text-sm font-medium uppercase tracking-wide text-zinc-500">
          Your systems this may affect
          <span className="ml-2 normal-case tracking-normal text-zinc-500">{item.affected.length}</span>
        </h2>
        {item.affected.length === 0 ? (
          <p className="mt-3 text-sm text-zinc-500">
            None of your active systems currently match this update&apos;s regulations or use cases.
          </p>
        ) : (
          <ul className="mt-3 flex flex-col gap-2">
            {item.affected.map((system) => (
              <li
                key={system.id}
                className="rounded-lg border border-zinc-200 px-3 py-2 text-sm dark:border-zinc-800"
              >
                <Link href={`/systems/${system.id}?tab=risk`} className="font-medium underline hover:no-underline">
                  {system.name}
                </Link>
                <ul className="mt-1 text-zinc-500">
                  {system.reasons.map((reason) => (
                    <li key={describeMatchReason(reason)}>{describeMatchReason(reason)}</li>
                  ))}
                </ul>
              </li>
            ))}
          </ul>
        )}
        {unassessedCount > 0 && (
          <p className="mt-3 text-sm text-zinc-500">
            {unassessedCount} {unassessedCount === 1 ? "system has" : "systems have"} no completed risk
            assessment and can&apos;t be matched.{" "}
            <Link href="/systems/inventory?risk=UNASSESSED" className="underline hover:no-underline">
              View {unassessedCount === 1 ? "it" : "them"}
            </Link>
          </p>
        )}
      </section>

      <p className="mt-10 text-xs text-zinc-500">{REGULATORY_DISCLAIMER}</p>
    </div>
  );
}
