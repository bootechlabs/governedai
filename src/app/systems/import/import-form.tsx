"use client";

import { useActionState } from "react";
import { importAiSystems, type ImportResult } from "./actions";
import { primaryButtonClass } from "@/lib/ui";

export function ImportForm() {
  const [result, formAction, isPending] = useActionState<ImportResult | null, FormData>(
    importAiSystems,
    null,
  );

  return (
    <form action={formAction} className="mt-4 flex flex-col gap-3">
      <input
        type="file"
        name="file"
        accept=".csv,.xlsx,.xls"
        required
        className="text-sm file:mr-2 file:rounded file:border-0 file:bg-zinc-200 file:px-2 file:py-1 file:text-xs dark:file:bg-zinc-800"
      />
      <button type="submit" disabled={isPending} className={`self-start ${primaryButtonClass}`}>
        {isPending ? "Importing…" : "Import"}
      </button>

      {result && (
        <div className="mt-2 rounded-lg border border-zinc-200 p-3 text-sm dark:border-zinc-800">
          <p>
            {result.created} system{result.created === 1 ? "" : "s"} imported
            {result.errors.length > 0 ? `, ${result.errors.length} row${result.errors.length === 1 ? "" : "s"} skipped` : ""}.
          </p>
          {result.errors.length > 0 && (
            <ul className="mt-2 list-disc pl-5 text-red-600 dark:text-red-400">
              {result.errors.map((e, i) => (
                <li key={i}>
                  Row {e.row}: {e.message}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </form>
  );
}
