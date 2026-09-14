"use client";

import { deleteSsoConnection } from "./actions";

export function DeleteConnectionButton({
  connectionId,
  displayName,
}: {
  connectionId: string;
  displayName: string;
}) {
  return (
    <form
      action={deleteSsoConnection.bind(null, connectionId)}
      onSubmit={(e) => {
        if (!confirm(`Remove the "${displayName}" SSO connection? Members using it won't be able to sign in with SSO anymore.`)) {
          e.preventDefault();
        }
      }}
    >
      <button type="submit" className="text-sm text-red-600 hover:underline dark:text-red-400">
        Remove
      </button>
    </form>
  );
}
