"use client";

import { UserCog } from "lucide-react";
import { startImpersonationAction } from "./actions";
import { primaryButtonClass } from "@/lib/ui";

export function ImpersonateButton({ userId, name }: { userId: string; name: string }) {
  return (
    <form
      action={startImpersonationAction.bind(null, userId)}
      onSubmit={(e) => {
        if (
          !confirm(
            `Impersonate "${name}"? They'll be emailed, and this is logged. The session expires in 1 hour.`,
          )
        ) {
          e.preventDefault();
        }
      }}
    >
      <button type="submit" className={`inline-flex items-center gap-1.5 text-xs ${primaryButtonClass}`}>
        <UserCog size={14} />
        Impersonate
      </button>
    </form>
  );
}
