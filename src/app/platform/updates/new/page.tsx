import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { KIND_LABELS, UPDATE_KINDS, USE_CASE_TEMPLATES } from "@/lib/regulatory-updates";
import { USE_CASE_TEMPLATE_LABELS } from "@/lib/risk-classification";
import { createUpdate } from "../actions";
import { UpdateForm } from "../update-form";

export const dynamic = "force-dynamic";

export default async function NewUpdatePage() {
  const regulations = await prisma.regulationDefinition.findMany({
    where: { active: true },
    orderBy: { sortOrder: "asc" },
    select: { id: true, label: true },
  });

  return (
    <div className="mx-auto max-w-5xl px-6 py-12">
      <Link href="/platform/updates" className="inline-flex items-center gap-1 text-sm text-zinc-500 hover:underline">
        <ArrowLeft size={14} />
        All updates
      </Link>
      <h1 className="mt-2 text-2xl font-semibold tracking-tight">New regulatory update</h1>
      <p className="mt-1 mb-6 text-sm text-zinc-500">
        Saved as a draft; nothing is visible to organizations until you publish. Link the primary source, and if
        this implies a new or changed regulation, update its RegulationDefinition in the same sitting.
      </p>
      <UpdateForm
        action={createUpdate}
        initial={{
          title: "",
          summary: "",
          whyItMatters: "",
          kind: "",
          sourceName: "",
          sourceUrl: "",
          eventDate: "",
          effectiveDate: "",
          actionRequired: false,
          useCaseTemplates: [],
          regulationIds: [],
        }}
        kinds={UPDATE_KINDS.map((value) => ({ value, label: KIND_LABELS[value] }))}
        templates={USE_CASE_TEMPLATES.map((value) => ({ value, label: USE_CASE_TEMPLATE_LABELS[value] }))}
        regulations={regulations}
        requireRevisionNote={false}
        submitLabel="Save draft"
      />
    </div>
  );
}
