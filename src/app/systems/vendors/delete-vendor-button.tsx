"use client";

import { deleteVendor } from "./actions";

export function DeleteVendorButton({ vendorId, name }: { vendorId: string; name: string }) {
  return (
    <form
      action={deleteVendor.bind(null, vendorId)}
      onSubmit={(e) => {
        if (!confirm(`Delete "${name}"? This can't be undone.`)) {
          e.preventDefault();
        }
      }}
    >
      <button type="submit" className="text-sm text-red-600 hover:underline dark:text-red-400">
        Delete this vendor
      </button>
    </form>
  );
}
