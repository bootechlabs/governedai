import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ExternalLink } from "lucide-react";
import { getCurrentUser } from "@/lib/current-user";
import { loadOrgUpdate } from "@/lib/regulatory-updates-db";
import { UpdateFlagBadge, UpdateKindBadge, UpdateReviewBadge } from "@/lib/badges";
import {
  OUTCOME_LABELS,
  REGULATORY_DISCLAIMER,
  REVIEW_OUTCOMES,
  describeMatchReason,
  formatDate,
} from "@/lib/regulatory-updates";
import { canFlagRegulatoryRecertification, canReviewRegulatoryUpdate } from "@/lib/permissions";
import { inputClass, primaryButtonClass } from "@/lib/ui";
import { flagUpdateForRecertification, submitRegulatoryReview } from "../actions";

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
  const canReview = canReviewRegulatoryUpdate(actor.role);
  const canFlag = canFlagRegulatoryRecertification(actor.role);
  const affectedCount = item.affected.length;

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


      <section className="mt-8">
        <h2 className="text-sm font-medium uppercase tracking-wide text-zinc-500">Your organization&apos;s review</h2>

        {item.review ? (
          <div className="mt-3 rounded-lg border border-zinc-200 px-3 py-2 text-sm dark:border-zinc-800">
            <p>
              <span className="font-medium">{OUTCOME_LABELS[item.review.outcome]}</span>
              <span className="text-zinc-500">
                {" "}
                · {formatDate(item.review.reviewedAt)}
                {item.review.reviewedByName ? ` · ${item.review.reviewedByName}` : ""}
              </span>
            </p>
            {item.review.note && <p className="mt-1 text-zinc-600 dark:text-zinc-400">{item.review.note}</p>}
          </div>
        ) : (
          <p className="mt-3 text-sm text-zinc-500">No review recorded yet.</p>
        )}

        {item.reviewState === "stale" && (
          <p className="mt-3 rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-900 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-300">
            Revised since you reviewed{item.revisionNote ? `: ${item.revisionNote}` : "."} Consider reviewing again.
          </p>
        )}

        {canReview ? (
          <form action={submitRegulatoryReview.bind(null, item.id)} className="mt-4 flex flex-col gap-3">
            <fieldset className="flex flex-col gap-1.5">
              <legend className="text-xs font-medium text-zinc-500">Outcome</legend>
              {REVIEW_OUTCOMES.map((outcome) => (
                <label key={outcome} className="flex items-center gap-2 text-sm">
                  <input
                    type="radio"
                    name="outcome"
                    value={outcome}
                    required
                    defaultChecked={item.review?.outcome === outcome}
                  />
                  {OUTCOME_LABELS[outcome]}
                </label>
              ))}
            </fieldset>
            <label htmlFor="note" className="text-xs font-medium text-zinc-500">
              Note (optional)
            </label>
            <textarea
              id="note"
              name="note"
              rows={3}
              maxLength={2000}
              defaultValue={item.review?.note ?? ""}
              className={inputClass}
            />
            <p className="text-xs text-zinc-500">
              {affectedCount > 0
                ? `Recording this adds an entry to the audit trail of each of the ${affectedCount} ${affectedCount === 1 ? "system" : "systems"} this may affect.`
                : "No systems currently match, so nothing will be written to any system's audit trail."}
            </p>
            <button type="submit" className={`self-start ${primaryButtonClass}`}>
              {item.review ? "Update review" : "Record review"}
            </button>
          </form>
        ) : (
          <p className="mt-3 text-xs text-zinc-500">Admins and reviewers can record a review.</p>
        )}

        {canFlag && affectedCount > 0 && (
          <form action={flagUpdateForRecertification.bind(null, item.id)} className="mt-6 border-t border-zinc-200 pt-4 dark:border-zinc-800">
            <p className="text-sm">
              Flag the {affectedCount} affected {affectedCount === 1 ? "system" : "systems"} for recertification
            </p>
            <p className="mt-1 text-xs text-zinc-500">
              Re-opens the decision form on any of them that already have a decision. Never automatic — nothing
              is flagged unless you do this.
            </p>
            <button
              type="submit"
              className="mt-2 rounded border border-zinc-300 px-3 py-1.5 text-sm hover:bg-zinc-50 dark:border-zinc-700 dark:hover:bg-zinc-900"
            >
              Flag for recertification
            </button>
          </form>
        )}
      </section>

      <p className="mt-10 text-xs text-zinc-500">{REGULATORY_DISCLAIMER}</p>
    </div>
  );
}
