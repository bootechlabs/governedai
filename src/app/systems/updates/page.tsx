import Link from "next/link";
import { Scale } from "lucide-react";
import { getCurrentUser } from "@/lib/current-user";
import { loadOrgFeed } from "@/lib/regulatory-updates-db";
import { REGULATORY_DISCLAIMER } from "@/lib/regulatory-updates";
import { subtleLinkClass } from "@/lib/ui";
import { UpdateCard } from "./update-card";

export const dynamic = "force-dynamic";

const TABS = [
  { key: "all", label: "All" },
  { key: "affects", label: "Affects my systems" },
  { key: "review", label: "Needs review" },
] as const;
type TabKey = (typeof TABS)[number]["key"];

// Curated by platform admins, matched per org at read time. "May affect", never
// "affects": a match is a prompt to look, not a legal determination.
export default async function RegulatoryUpdatesPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const actor = await getCurrentUser();
  const { tab } = await searchParams;
  const activeTab: TabKey = TABS.some((t) => t.key === tab) ? (tab as TabKey) : "all";

  const { items, unassessedCount } = await loadOrgFeed(actor.organizationId);
  const counts: Record<TabKey, number> = {
    all: items.length,
    affects: items.filter((i) => i.affected.length > 0).length,
    review: items.filter((i) => i.needsReview).length,
  };
  const shown =
    activeTab === "affects"
      ? items.filter((i) => i.affected.length > 0)
      : activeTab === "review"
        ? items.filter((i) => i.needsReview)
        : items;

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6 sm:py-12">
      <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight">
        <Scale size={22} />
        Regulatory updates
      </h1>
      <p className="mt-1 text-sm text-zinc-500">
        Curated regulatory developments, matched to the systems you&apos;ve registered.
      </p>

      {unassessedCount > 0 && (
        <p className="mt-4 rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-900 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-300">
          {unassessedCount} {unassessedCount === 1 ? "system has" : "systems have"} no completed risk
          assessment and can&apos;t be matched to updates.{" "}
          <Link href="/systems/inventory?risk=UNASSESSED" className="underline hover:no-underline">
            View {unassessedCount === 1 ? "it" : "them"}
          </Link>
        </p>
      )}

      <nav aria-label="Filter updates" className="mt-6 flex gap-1 border-b border-zinc-200 dark:border-zinc-800">
        {TABS.map((t) => (
          <Link
            key={t.key}
            href={t.key === "all" ? "/systems/updates" : `/systems/updates?tab=${t.key}`}
            aria-current={activeTab === t.key ? "page" : undefined}
            className={`-mb-px border-b-2 px-3 py-2 text-sm ${
              activeTab === t.key
                ? "border-zinc-900 font-medium dark:border-zinc-100"
                : "border-transparent text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100"
            }`}
          >
            {t.label} <span className="text-xs text-zinc-500">{counts[t.key]}</span>
          </Link>
        ))}
      </nav>

      <ul className="mt-6 flex flex-col gap-3">
        {shown.length === 0 && (
          <li className="py-6 text-sm text-zinc-500">
            {items.length === 0
              ? "No regulatory updates have been published yet."
              : activeTab === "review"
                ? "Nothing needs review right now."
                : "No updates match your systems right now."}{" "}
            {activeTab !== "all" && items.length > 0 && (
              <Link href="/systems/updates" className={subtleLinkClass}>
                See all updates
              </Link>
            )}
          </li>
        )}
        {shown.map((item) => (
          <li key={item.id}>
            <UpdateCard
              update={item}
              href={`/systems/updates/${item.id}`}
              affectedCount={item.affected.length}
              reviewState={item.affected.length > 0 ? item.reviewState : undefined}
            />
          </li>
        ))}
      </ul>

      <p className="mt-8 text-xs text-zinc-500">{REGULATORY_DISCLAIMER}</p>
    </div>
  );
}
