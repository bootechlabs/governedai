import Link from "next/link";
import { Scale, Plus } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { UpdateKindBadge } from "@/lib/badges";
import { formatDate, updateStatus } from "@/lib/regulatory-updates";
import { primaryButtonClass } from "@/lib/ui";

export const dynamic = "force-dynamic";

const STATUS_LABEL = { draft: "Draft", published: "Published", archived: "Archived" } as const;

export default async function PlatformUpdatesPage() {
  const updates = await prisma.regulatoryUpdate.findMany({
    orderBy: [{ createdAt: "desc" }],
    include: { _count: { select: { reviews: true } } },
  });

  return (
    <div className="mx-auto max-w-5xl px-6 py-12">
      <div className="flex items-center justify-between gap-4">
        <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight">
          <Scale size={22} />
          Regulatory updates
        </h1>
        <Link href="/platform/updates/new" className={`inline-flex items-center gap-1.5 ${primaryButtonClass}`}>
          <Plus size={14} />
          New update
        </Link>
      </div>
      <p className="mt-1 text-sm text-zinc-500">
        Curated, global content shown to every organization (matched to their systems at read time). One weekly
        pass; publish only what is material.
      </p>

      <div className="mt-6 overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="text-xs uppercase tracking-wide text-zinc-500">
            <tr>
              <th className="py-2 pr-4 font-medium">Title</th>
              <th className="py-2 pr-4 font-medium">Kind</th>
              <th className="py-2 pr-4 font-medium">Event</th>
              <th className="py-2 pr-4 font-medium">Status</th>
              <th className="py-2 font-medium">Org reviews</th>
            </tr>
          </thead>
          <tbody>
            {updates.length === 0 && (
              <tr>
                <td colSpan={5} className="py-6 text-zinc-500">
                  No updates yet.
                </td>
              </tr>
            )}
            {updates.map((update) => {
              const status = updateStatus(update);
              return (
                <tr key={update.id} className="border-t border-zinc-200 dark:border-zinc-800">
                  <td className="py-2 pr-4">
                    <Link href={`/platform/updates/${update.id}`} className="font-medium hover:underline">
                      {update.title}
                    </Link>
                    {update.revisedAt && <span className="ml-2 text-xs text-zinc-500">revised</span>}
                  </td>
                  <td className="py-2 pr-4">
                    <UpdateKindBadge value={update.kind} />
                  </td>
                  <td className="py-2 pr-4 tabular-nums text-zinc-500">{formatDate(update.eventDate)}</td>
                  <td className="py-2 pr-4">{STATUS_LABEL[status]}</td>
                  <td className="py-2 tabular-nums">{update._count.reviews}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
