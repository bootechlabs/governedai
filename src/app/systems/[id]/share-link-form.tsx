"use client";

import { useActionState } from "react";
import { createShareLink, type CreateShareLinkResult } from "../actions";
import { inputClass, primaryButtonClass } from "@/lib/ui";
import { SHARE_LINK_DURATIONS_DAYS } from "@/lib/share-links";

export function ShareLinkForm({ aiSystemId }: { aiSystemId: string }) {
  const [result, formAction, isPending] = useActionState<CreateShareLinkResult | null, FormData>(
    createShareLink.bind(null, aiSystemId),
    null,
  );

  return (
    <div className="mt-2">
      <form action={formAction} className="flex flex-wrap items-center gap-2">
        <select name="expiresInDays" defaultValue={30} className={inputClass}>
          {SHARE_LINK_DURATIONS_DAYS.map((days) => (
            <option key={days} value={days}>
              Expires in {days} days
            </option>
          ))}
        </select>
        <button type="submit" disabled={isPending} className={primaryButtonClass}>
          {isPending ? "Creating…" : "Create share link"}
        </button>
      </form>

      {result && (
        <div className="mt-3 rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm dark:border-amber-900 dark:bg-amber-950/40">
          <p className="font-medium text-amber-800 dark:text-amber-300">
            Copy this now — it won&apos;t be shown again:
          </p>
          <div className="mt-2 select-all break-all rounded border border-zinc-200 bg-white px-2 py-1.5 font-mono text-xs dark:border-zinc-800 dark:bg-zinc-900">
            {result.url}
          </div>
        </div>
      )}
    </div>
  );
}
