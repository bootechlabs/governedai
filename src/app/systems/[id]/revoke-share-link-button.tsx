"use client";

import { revokeShareLink } from "../actions";

export function RevokeShareLinkButton({
  aiSystemId,
  shareLinkId,
}: {
  aiSystemId: string;
  shareLinkId: string;
}) {
  return (
    <form
      action={revokeShareLink.bind(null, aiSystemId, shareLinkId)}
      onSubmit={(e) => {
        if (!confirm("Revoke this share link? It will stop working immediately.")) {
          e.preventDefault();
        }
      }}
    >
      <button type="submit" className="text-xs text-red-600 hover:underline dark:text-red-400">
        Revoke
      </button>
    </form>
  );
}
