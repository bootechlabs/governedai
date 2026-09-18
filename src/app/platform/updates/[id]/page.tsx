import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { KIND_LABELS, UPDATE_KINDS, USE_CASE_TEMPLATES, formatDate, updateStatus } from "@/lib/regulatory-updates";
import { USE_CASE_TEMPLATE_LABELS } from "@/lib/risk-classification";
import { archiveUpdate, publishUpdate, saveUpdate, unpublishUpdate } from "../actions";
import { UpdateForm } from "../update-form";

export const dynamic = "force-dynamic";

const buttonClass =
  "rounded border border-zinc-300 px-3 py-1.5 text-sm hover:bg-zinc-50 dark:border-zinc-700 dark:hover:bg-zinc-900";

export default async function EditUpdatePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const update = await prisma.regulatoryUpdate.findUnique({
    where: { id },
    include: { regulations: { select: { regulationId: true } } },
  });
  if (!update) notFound();

  const regulations = await prisma.regulationDefinition.findMany({
    where: { OR: [{ active: true }, { id: { in: update.regulations.map((r) => r.regulationId) } }] },
    orderBy: { sortOrder: "asc" },
    select: { id: true, label: true },
  });

  const status = updateStatus(update);
  const editable = status !== "archived";

  return (
    <div className="mx-auto max-w-5xl px-6 py-12">
      <Link href="/platform/updates" className="inline-flex items-center gap-1 text-sm text-zinc-500 hover:underline">
        <ArrowLeft size={14} />
        All updates
      </Link>
      <h1 className="mt-2 text-2xl font-semibold tracking-tight">{update.title}</h1>

      <div className="mt-3 flex flex-wrap items-center gap-3 text-sm">
        <span className="rounded-full border border-zinc-300 px-2 py-0.5 text-xs font-medium dark:border-zinc-700">
          {status === "published" ? "Published" : status === "draft" ? "Draft" : "Archived"}
        </span>
        <span className="text-zinc-500">slug: {update.slug}</span>
        {update.publishedAt && <span className="text-zinc-500">published {formatDate(update.publishedAt)}</span>}
        {update.revisedAt && <span className="text-zinc-500">revised {formatDate(update.revisedAt)}</span>}
        <span className="flex-1" />
        {status === "draft" && (
          <form action={publishUpdate.bind(null, update.id)}>
            <button type="submit" className={buttonClass}>Publish</button>
          </form>
        )}
        {status === "published" && (
          <form action={unpublishUpdate.bind(null, update.id)}>
            <button type="submit" className={buttonClass}>Unpublish (back to draft)</button>
          </form>
        )}
        {editable && (
          <form action={archiveUpdate.bind(null, update.id)}>
            <button type="submit" className={buttonClass}>Archive</button>
          </form>
        )}
      </div>

      {update.revisionNote && (
        <p className="mt-3 text-sm text-zinc-500">Last revision note: {update.revisionNote}</p>
      )}

      <div className="mt-6">
        {editable ? (
          <UpdateForm
            action={saveUpdate.bind(null, update.id)}
            initial={{
              title: update.title,
              summary: update.summary,
              whyItMatters: update.whyItMatters ?? "",
              kind: update.kind,
              sourceName: update.sourceName,
              sourceUrl: update.sourceUrl,
              eventDate: formatDate(update.eventDate),
              effectiveDate: update.effectiveDate ? formatDate(update.effectiveDate) : "",
              actionRequired: update.actionRequired,
              useCaseTemplates: update.useCaseTemplates,
              regulationIds: update.regulations.map((r) => r.regulationId),
            }}
            kinds={UPDATE_KINDS.map((value) => ({ value, label: KIND_LABELS[value] }))}
            templates={USE_CASE_TEMPLATES.map((value) => ({ value, label: USE_CASE_TEMPLATE_LABELS[value] }))}
            regulations={regulations}
            requireRevisionNote={status === "published"}
            submitLabel={status === "published" ? "Save revision" : "Save draft"}
          />
        ) : (
          <p className="text-sm text-zinc-500">Archived updates are read-only.</p>
        )}
      </div>
    </div>
  );
}
