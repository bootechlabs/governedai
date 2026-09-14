import { notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/current-user";
import { canManageApiKeys } from "@/lib/permissions";
import { CreateKeyForm } from "./create-key-form";
import { RevokeKeyButton } from "./revoke-key-button";

export const dynamic = "force-dynamic";

const gridCols = "grid-cols-[1.5fr_1fr_1fr_1fr_1fr_100px]";
const cellClass = "px-3 py-2 flex items-center text-xs";

export default async function ApiKeysPage() {
  const actor = await getCurrentUser();
  if (!canManageApiKeys(actor.role)) notFound();

  const keys = await prisma.apiKey.findMany({
    where: { organizationId: actor.organizationId },
    orderBy: { createdAt: "desc" },
    include: { createdBy: true },
  });

  return (
    <div className="mx-auto max-w-4xl px-6 py-12">
      <Link href="/systems" className="text-sm text-zinc-500 hover:underline">
        ← All systems
      </Link>

      <h1 className="mt-2 text-2xl font-semibold tracking-tight">API keys</h1>
      <p className="mt-1 text-sm text-zinc-500">
        Use a key to call the GovernedAI API from your own tools — list or register AI systems
        programmatically. See{" "}
        <Link href="/systems/api-keys/docs" className="underline hover:no-underline">
          API docs
        </Link>
        .
      </p>

      <CreateKeyForm />

      <div
        role="table"
        className="mt-6 overflow-x-auto rounded-lg border border-zinc-200 dark:border-zinc-800"
      >
        <div
          role="row"
          className={`grid ${gridCols} border-b border-zinc-200 text-left text-xs uppercase tracking-wide text-zinc-500 dark:border-zinc-800`}
        >
          <span role="columnheader" className={cellClass}>Name</span>
          <span role="columnheader" className={cellClass}>Key</span>
          <span role="columnheader" className={cellClass}>Created by</span>
          <span role="columnheader" className={cellClass}>Last used</span>
          <span role="columnheader" className={cellClass}>Status</span>
          <span role="columnheader" className={cellClass}></span>
        </div>

        {keys.length === 0 && (
          <div role="row" className={`grid ${gridCols}`}>
            <span role="cell" className={`${cellClass} text-zinc-500`}>No API keys yet.</span>
          </div>
        )}

        {keys.map((key) => (
          <div
            key={key.id}
            role="row"
            className={`grid ${gridCols} border-b border-zinc-200 last:border-0 dark:border-zinc-800`}
          >
            <span role="cell" className={`${cellClass} font-medium`}>{key.name}</span>
            <span role="cell" className={`${cellClass} font-mono text-zinc-500`}>{key.keyPrefix}…</span>
            <span role="cell" className={`${cellClass} text-zinc-500`}>
              {key.createdBy.name ?? key.createdBy.email}
            </span>
            <span role="cell" className={`${cellClass} text-zinc-500`}>
              {key.lastUsedAt ? key.lastUsedAt.toISOString().slice(0, 10) : "Never"}
            </span>
            <span role="cell" className={cellClass}>
              {key.revokedAt ? (
                <span className="text-zinc-500">Revoked</span>
              ) : (
                <span className="text-green-700 dark:text-green-400">Active</span>
              )}
            </span>
            <span role="cell" className={cellClass}>
              {!key.revokedAt && <RevokeKeyButton keyId={key.id} name={key.name} />}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
