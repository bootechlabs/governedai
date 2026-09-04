"use client";

import { deleteAiSystem } from "../actions";

export function DeleteSystemButton({
  aiSystemId,
  systemName,
}: {
  aiSystemId: string;
  systemName: string;
}) {
  return (
    <form
      action={deleteAiSystem.bind(null, aiSystemId)}
      onSubmit={(e) => {
        if (
          !confirm(
            `Delete "${systemName}"? This permanently removes its workflow, evidence, and audit history. This cannot be undone.`,
          )
        ) {
          e.preventDefault();
        }
      }}
    >
      <button type="submit" className="text-sm text-red-600 hover:underline dark:text-red-400">
        Delete this AI system
      </button>
    </form>
  );
}
