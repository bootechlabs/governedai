"use client";

import { revokeApiKey } from "./actions";

export function RevokeKeyButton({ keyId, name }: { keyId: string; name: string }) {
  return (
    <form
      action={revokeApiKey.bind(null, keyId)}
      onSubmit={(e) => {
        if (!confirm(`Revoke "${name}"? Any integration using this key will stop working immediately.`)) {
          e.preventDefault();
        }
      }}
    >
      <button type="submit" className="text-sm text-red-600 hover:underline dark:text-red-400">
        Revoke
      </button>
    </form>
  );
}
