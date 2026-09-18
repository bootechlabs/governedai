import Link from "next/link";
import { ExternalLink } from "lucide-react";
import { UpdateFlagBadge, UpdateKindBadge, UpdateReviewBadge } from "@/lib/badges";
import { formatDate, type ReviewState } from "@/lib/regulatory-updates";
import type { RegulatoryUpdateKind } from "@prisma/client";

// One update as an org sees it. Shared by the feed and by the platform-admin
// form's live preview, so what a curator previews is what orgs get — hence no
// server-only imports here (the preview renders it in a client component).
export interface UpdateCardData {
  title: string;
  summary: string;
  kind: RegulatoryUpdateKind;
  eventDate: Date | null;
  actionRequired: boolean;
  sourceName: string;
  sourceUrl: string;
}

export function UpdateCard({
  update,
  href,
  affectedCount,
  reviewState,
}: {
  update: UpdateCardData;
  // Link target for the title; null in the preview.
  href: string | null;
  // null in the preview (no org, so nothing to match).
  affectedCount: number | null;
  reviewState?: ReviewState;
}) {
  return (
    <article className="rounded-lg border border-zinc-200 p-4 dark:border-zinc-800">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
        <UpdateKindBadge value={update.kind} />
        {update.actionRequired && <UpdateFlagBadge flag="actionRequired" />}
        {update.eventDate && <span className="text-xs text-zinc-500">{formatDate(update.eventDate)}</span>}
      </div>

      <h2 className="mt-2 text-base font-medium">
        {href ? (
          <Link href={href} className="hover:underline">
            {update.title || "Untitled"}
          </Link>
        ) : (
          update.title || "Untitled"
        )}
      </h2>
      <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">{update.summary}</p>

      <div className="mt-3 flex flex-wrap items-center justify-between gap-x-4 gap-y-2 text-sm">
        <span className="flex flex-wrap items-center gap-x-4 gap-y-1">
          {affectedCount === null ? (
            <span className="text-zinc-500">Matched to each organization&apos;s own systems</span>
          ) : affectedCount > 0 ? (
            <>
              <span className="font-medium">
                May affect {affectedCount} of your {affectedCount === 1 ? "system" : "systems"}
              </span>
              {reviewState && <UpdateReviewBadge state={reviewState} />}
            </>
          ) : (
            <span className="text-zinc-500">None of your systems currently match</span>
          )}
        </span>
        {update.sourceUrl && (
          <a
            href={update.sourceUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-zinc-500 underline hover:no-underline"
          >
            <ExternalLink size={13} />
            {update.sourceName || "Source"}
          </a>
        )}
      </div>
    </article>
  );
}
