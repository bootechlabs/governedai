"use client";

import { useState } from "react";
import type { RegulatoryUpdateKind } from "@prisma/client";
import { inputClass, primaryButtonClass } from "@/lib/ui";
import { UpdateCard } from "@/app/systems/updates/update-card";

export interface UpdateFormValues {
  title: string;
  summary: string;
  whyItMatters: string;
  kind: RegulatoryUpdateKind | "";
  sourceName: string;
  sourceUrl: string;
  eventDate: string;
  effectiveDate: string;
  actionRequired: boolean;
  useCaseTemplates: string[];
  regulationIds: string[];
}

function toDate(value: string): Date | null {
  const date = new Date(`${value}T00:00:00.000Z`);
  return /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(date.getTime()) ? date : null;
}

const labelClass = "text-xs font-medium text-zinc-500";

// The fields the preview card shows are controlled so the card updates as the
// curator types; everything else is uncontrolled and just posts with the form.
export function UpdateForm({
  action,
  initial,
  kinds,
  templates,
  regulations,
  requireRevisionNote,
  submitLabel,
}: {
  action: (formData: FormData) => void | Promise<void>;
  initial: UpdateFormValues;
  kinds: { value: RegulatoryUpdateKind; label: string }[];
  templates: { value: string; label: string }[];
  regulations: { id: string; label: string }[];
  // Editing a published update: a visible correction needs a note.
  requireRevisionNote: boolean;
  submitLabel: string;
}) {
  const [title, setTitle] = useState(initial.title);
  const [summary, setSummary] = useState(initial.summary);
  const [kind, setKind] = useState<RegulatoryUpdateKind | "">(initial.kind);
  const [eventDate, setEventDate] = useState(initial.eventDate);
  const [sourceName, setSourceName] = useState(initial.sourceName);
  const [sourceUrl, setSourceUrl] = useState(initial.sourceUrl);
  const [actionRequired, setActionRequired] = useState(initial.actionRequired);

  return (
    <div className="grid gap-8 lg:grid-cols-2">
      <form action={action} className="flex flex-col gap-3">
        <label htmlFor="title" className={labelClass}>Title</label>
        <input id="title" name="title" required value={title} onChange={(e) => setTitle(e.target.value)} className={inputClass} />

        <label htmlFor="summary" className={labelClass}>Summary (1-2 factual sentences, no interpretation)</label>
        <textarea id="summary" name="summary" required rows={3} value={summary} onChange={(e) => setSummary(e.target.value)} className={inputClass} />

        <label htmlFor="whyItMatters" className={labelClass}>Why it may matter (one advisory sentence, framed as &ldquo;may&rdquo;)</label>
        <textarea id="whyItMatters" name="whyItMatters" rows={2} defaultValue={initial.whyItMatters} className={inputClass} />

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="flex flex-col gap-1">
            <label htmlFor="kind" className={labelClass}>Kind</label>
            <select id="kind" name="kind" required value={kind} onChange={(e) => setKind(e.target.value as RegulatoryUpdateKind | "")} className={inputClass}>
              <option value="">Choose…</option>
              {kinds.map((k) => (
                <option key={k.value} value={k.value}>{k.label}</option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <label htmlFor="eventDate" className={labelClass}>Event date</label>
            <input id="eventDate" name="eventDate" type="date" required value={eventDate} onChange={(e) => setEventDate(e.target.value)} className={inputClass} />
          </div>
          <div className="flex flex-col gap-1">
            <label htmlFor="effectiveDate" className={labelClass}>Effective date (optional)</label>
            <input id="effectiveDate" name="effectiveDate" type="date" defaultValue={initial.effectiveDate} className={inputClass} />
          </div>
        </div>

        <label htmlFor="sourceName" className={labelClass}>Source name (legislature, agency, accreditor)</label>
        <input id="sourceName" name="sourceName" required value={sourceName} onChange={(e) => setSourceName(e.target.value)} className={inputClass} />

        <label htmlFor="sourceUrl" className={labelClass}>Primary source link (https)</label>
        <input id="sourceUrl" name="sourceUrl" type="url" required placeholder="https://..." value={sourceUrl} onChange={(e) => setSourceUrl(e.target.value)} className={inputClass} />

        <fieldset className="flex flex-col gap-1">
          <legend className={labelClass}>Linked regulations</legend>
          {regulations.map((r) => (
            <label key={r.id} className="flex items-center gap-2 text-sm">
              <input type="checkbox" name="regulationIds" value={r.id} defaultChecked={initial.regulationIds.includes(r.id)} />
              {r.label}
            </label>
          ))}
        </fieldset>

        <fieldset className="flex flex-col gap-1">
          <legend className={labelClass}>Use-case templates it applies to</legend>
          {templates.map((t) => (
            <label key={t.value} className="flex items-center gap-2 text-sm">
              <input type="checkbox" name="useCaseTemplates" value={t.value} defaultChecked={initial.useCaseTemplates.includes(t.value)} />
              {t.label}
            </label>
          ))}
        </fieldset>

        <label className="flex items-start gap-2 text-sm">
          <input type="checkbox" name="actionRequired" checked={actionRequired} onChange={(e) => setActionRequired(e.target.checked)} className="mt-1" />
          <span>
            Action may be needed
            <span className="block text-xs text-zinc-500">
              Rare: an enacted law for a use case the product models, an effective-date change, or accreditation
              criteria that change what an auditor expects.
            </span>
          </span>
        </label>

        {requireRevisionNote && (
          <>
            <label htmlFor="revisionNote" className={labelClass}>Revision note (required — shown to organizations)</label>
            <textarea id="revisionNote" name="revisionNote" required rows={2} className={inputClass} />
          </>
        )}

        <button type="submit" className={`self-start ${primaryButtonClass}`}>{submitLabel}</button>
      </form>

      <div>
        <h2 className="text-xs font-medium uppercase tracking-wide text-zinc-500">Preview (as organizations see it)</h2>
        <div className="mt-3">
          <UpdateCard
            update={{
              title,
              summary,
              kind: kind || "OTHER",
              eventDate: toDate(eventDate),
              actionRequired,
              sourceName,
              sourceUrl,
            }}
            href={null}
            affectedCount={null}
          />
        </div>
      </div>
    </div>
  );
}
