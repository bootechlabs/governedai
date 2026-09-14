"use client";

import { useActionState } from "react";
import { createApiKey, type CreateApiKeyResult } from "./actions";
import { inputClass, primaryButtonClass } from "@/lib/ui";

export function CreateKeyForm() {
  const [result, formAction, isPending] = useActionState<CreateApiKeyResult | null, FormData>(
    createApiKey,
    null,
  );

  return (
    <div className="mt-4 rounded-lg border border-zinc-200 p-4 dark:border-zinc-800">
      <form action={formAction} className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <input name="name" placeholder="Key name (e.g. 'Vendor risk sync')" required className={`flex-1 ${inputClass}`} />
        <button type="submit" disabled={isPending} className={primaryButtonClass}>
          {isPending ? "Creating…" : "Create key"}
        </button>
      </form>

      {result && (
        <div className="mt-3 rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm dark:border-amber-900 dark:bg-amber-950/40">
          <p className="font-medium text-amber-800 dark:text-amber-300">
            &quot;{result.name}&quot; created — copy this now, it won&apos;t be shown again:
          </p>
          <div className="mt-2 select-all rounded border border-zinc-200 bg-white px-2 py-1.5 font-mono text-xs dark:border-zinc-800 dark:bg-zinc-900">
            {result.plaintext}
          </div>
        </div>
      )}
    </div>
  );
}
