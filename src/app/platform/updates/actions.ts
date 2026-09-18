"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/current-user";
import {
  parseUpdateInput,
  publishBlockers,
  slugify,
  type RawUpdateInput,
  type UpdateInput,
} from "@/lib/regulatory-updates";

// Curation is platform-admin only. Reaching /platform at all means "not
// currently impersonating" (see src/app/platform/layout.tsx), so this is always
// the real admin.
async function requirePlatformAdmin() {
  const actor = await getCurrentUser();
  if (!actor.isPlatformAdmin) {
    throw new Error("Only platform admins can manage regulatory updates");
  }
  return actor;
}

function rawFromForm(formData: FormData, vertical: string): RawUpdateInput {
  const text = (name: string) => String(formData.get(name) ?? "");
  return {
    title: text("title"),
    summary: text("summary"),
    whyItMatters: text("whyItMatters"),
    kind: text("kind"),
    sourceName: text("sourceName"),
    sourceUrl: text("sourceUrl"),
    eventDate: text("eventDate"),
    effectiveDate: text("effectiveDate"),
    useCaseTemplates: formData.getAll("useCaseTemplates").map(String),
    regulationIds: formData.getAll("regulationIds").map(String),
    // No UI for vertical until a second vertical exists; an existing value is
    // carried through unchanged.
    vertical,
    actionRequired: formData.get("actionRequired") === "on",
    revisionNote: text("revisionNote"),
  };
}

async function parseOrThrow(raw: RawUpdateInput, revisionRequired: boolean): Promise<UpdateInput> {
  const known = await prisma.regulationDefinition.findMany({ select: { id: true } });
  const result = parseUpdateInput(raw, {
    revisionRequired,
    knownRegulationIds: new Set(known.map((r) => r.id)),
  });
  if (!result.ok) throw new Error(result.errors.join(". "));
  return result.value;
}

async function uniqueSlug(title: string): Promise<string> {
  const base = slugify(title) || "update";
  for (let n = 1; n < 100; n++) {
    const slug = n === 1 ? base : `${base}-${n}`;
    if (!(await prisma.regulatoryUpdate.findUnique({ where: { slug }, select: { id: true } }))) return slug;
  }
  throw new Error("Couldn't generate a unique slug for this title");
}

function revalidateFeed(id?: string) {
  revalidatePath("/platform/updates");
  if (id) revalidatePath(`/platform/updates/${id}`);
  revalidatePath("/systems/updates");
  revalidatePath("/systems");
}

export async function createUpdate(formData: FormData) {
  const actor = await requirePlatformAdmin();
  const input = await parseOrThrow(rawFromForm(formData, ""), false);

  const created = await prisma.regulatoryUpdate.create({
    data: {
      slug: await uniqueSlug(input.title),
      title: input.title,
      summary: input.summary,
      whyItMatters: input.whyItMatters,
      kind: input.kind,
      sourceName: input.sourceName,
      sourceUrl: input.sourceUrl,
      eventDate: input.eventDate,
      effectiveDate: input.effectiveDate,
      useCaseTemplates: input.useCaseTemplates,
      vertical: input.vertical,
      actionRequired: input.actionRequired,
      createdById: actor.id,
      regulations: { create: input.regulationIds.map((regulationId) => ({ regulationId })) },
    },
  });

  revalidateFeed();
  redirect(`/platform/updates/${created.id}`);
}

// Editing a draft is free-form. Editing a published update is a visible
// correction: it needs a revision note and stamps revisedAt, which is what makes
// every org's earlier review read as stale. Never silently rewrite.
export async function saveUpdate(id: string, formData: FormData) {
  await requirePlatformAdmin();
  const existing = await prisma.regulatoryUpdate.findUniqueOrThrow({ where: { id } });
  if (existing.archivedAt) throw new Error("Archived updates can't be edited");

  const published = existing.publishedAt !== null;
  const input = await parseOrThrow(rawFromForm(formData, existing.vertical ?? ""), published);

  await prisma.$transaction([
    prisma.regulatoryUpdateRegulation.deleteMany({ where: { updateId: id } }),
    prisma.regulatoryUpdate.update({
      where: { id },
      data: {
        title: input.title,
        summary: input.summary,
        whyItMatters: input.whyItMatters,
        kind: input.kind,
        sourceName: input.sourceName,
        sourceUrl: input.sourceUrl,
        eventDate: input.eventDate,
        effectiveDate: input.effectiveDate,
        useCaseTemplates: input.useCaseTemplates,
        actionRequired: input.actionRequired,
        ...(published ? { revisedAt: new Date(), revisionNote: input.revisionNote } : {}),
        regulations: { create: input.regulationIds.map((regulationId) => ({ regulationId })) },
      },
    }),
  ]);

  revalidateFeed(id);
}

export async function publishUpdate(id: string) {
  await requirePlatformAdmin();
  const existing = await prisma.regulatoryUpdate.findUniqueOrThrow({ where: { id } });
  if (existing.archivedAt) throw new Error("Archived updates can't be published");
  if (existing.publishedAt) return;

  const blockers = publishBlockers(existing);
  if (blockers.length > 0) throw new Error(`Can't publish without ${blockers.join(", ")}`);

  await prisma.regulatoryUpdate.update({ where: { id }, data: { publishedAt: new Date() } });
  revalidateFeed(id);
}

// Back to draft: orgs stop seeing it. Existing org reviews are kept.
export async function unpublishUpdate(id: string) {
  await requirePlatformAdmin();
  await prisma.regulatoryUpdate.update({ where: { id }, data: { publishedAt: null } });
  revalidateFeed(id);
}

export async function archiveUpdate(id: string) {
  await requirePlatformAdmin();
  await prisma.regulatoryUpdate.update({ where: { id }, data: { archivedAt: new Date() } });
  revalidateFeed(id);
}
