import { notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { decideStage, attachEvidence } from "../actions";

export const dynamic = "force-dynamic";

export default async function SystemDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const system = await prisma.aiSystem.findUnique({
    where: { id },
    include: {
      owner: true,
      stages: { orderBy: { sequence: "asc" }, include: { owner: true } },
      evidence: { orderBy: { uploadedAt: "desc" }, include: { uploadedBy: true } },
      auditLog: { orderBy: { occurredAt: "desc" }, include: { actor: true } },
    },
  });

  if (!system) notFound();

  return (
    <div className="mx-auto max-w-3xl px-6 py-12">
      <Link href="/systems" className="text-sm text-zinc-500 hover:underline">
        ← All systems
      </Link>

      <h1 className="mt-2 text-2xl font-semibold tracking-tight">{system.name}</h1>
      <p className="mt-1 text-sm text-zinc-500">
        Owner: {system.owner.name ?? system.owner.email} · {system.deploymentStatus}
        {system.vendorName ? ` · Vendor: ${system.vendorName}` : ""}
      </p>
      {system.description && (
        <p className="mt-3 text-sm text-zinc-700 dark:text-zinc-300">
          {system.description}
        </p>
      )}

      <h2 className="mt-10 text-lg font-medium">Workflow</h2>
      <ol className="mt-4 flex flex-col gap-4">
        {system.stages.map((stage) => (
          <li
            key={stage.id}
            className="rounded-lg border border-zinc-200 p-4 dark:border-zinc-800"
          >
            <div className="flex items-center justify-between">
              <span className="font-medium">
                {stage.sequence}. {stage.stageName}
              </span>
              <span className="text-xs uppercase tracking-wide text-zinc-500">
                {stage.status}
              </span>
            </div>
            {stage.decisionRationale && (
              <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
                {stage.decisionRationale}
              </p>
            )}
            {stage.status === "PENDING" || stage.status === "IN_REVIEW" ? (
              <form
                action={decideStage.bind(null, stage.id)}
                className="mt-3 flex flex-col gap-2 sm:flex-row"
              >
                <select
                  name="status"
                  defaultValue="APPROVED"
                  className="rounded border border-zinc-300 px-2 py-1.5 text-sm dark:border-zinc-700 dark:bg-zinc-900"
                >
                  <option value="IN_REVIEW">Move to in review</option>
                  <option value="APPROVED">Approve</option>
                  <option value="CONDITIONALLY_APPROVED">
                    Conditionally approve
                  </option>
                  <option value="REJECTED">Reject</option>
                </select>
                <input
                  name="rationale"
                  placeholder="Decision rationale"
                  className="flex-1 rounded border border-zinc-300 px-2 py-1.5 text-sm dark:border-zinc-700 dark:bg-zinc-900"
                />
                <button
                  type="submit"
                  className="rounded bg-black px-3 py-1.5 text-sm font-medium text-white dark:bg-white dark:text-black"
                >
                  Record decision
                </button>
              </form>
            ) : null}
          </li>
        ))}
      </ol>

      <h2 className="mt-10 text-lg font-medium">Evidence</h2>
      <form
        action={attachEvidence.bind(null, system.id)}
        className="mt-4 flex flex-col gap-2 rounded-lg border border-zinc-200 p-4 dark:border-zinc-800 sm:flex-row sm:items-center"
      >
        <input
          type="file"
          name="file"
          className="text-sm file:mr-2 file:rounded file:border-0 file:bg-zinc-200 file:px-2 file:py-1 file:text-xs dark:file:bg-zinc-800"
        />
        <input
          name="linkUrl"
          placeholder="or paste a link"
          className="flex-1 rounded border border-zinc-300 px-2 py-1.5 text-sm dark:border-zinc-700 dark:bg-zinc-900"
        />
        <input
          name="label"
          placeholder="Label (optional)"
          className="rounded border border-zinc-300 px-2 py-1.5 text-sm dark:border-zinc-700 dark:bg-zinc-900"
        />
        <button
          type="submit"
          className="rounded bg-black px-3 py-1.5 text-sm font-medium text-white dark:bg-white dark:text-black"
        >
          Attach
        </button>
      </form>
      <ul className="mt-4 flex flex-col gap-2 text-sm">
        {system.evidence.length === 0 && (
          <li className="text-zinc-500">No evidence attached yet.</li>
        )}
        {system.evidence.map((item) => (
          <li key={item.id} className="flex items-center gap-2">
            <a
              href={item.fileUrl ?? item.linkUrl ?? "#"}
              target="_blank"
              rel="noopener noreferrer"
              className="text-zinc-700 underline hover:no-underline dark:text-zinc-300"
            >
              {item.label ?? item.fileUrl ?? item.linkUrl}
            </a>
            <span className="text-xs text-zinc-500">
              ({item.type.toLowerCase()}) — {item.uploadedBy.name ?? item.uploadedBy.email}
            </span>
          </li>
        ))}
      </ul>

      <h2 className="mt-10 text-lg font-medium">Audit log</h2>
      <ul className="mt-4 flex flex-col gap-2 text-sm">
        {system.auditLog.length === 0 && (
          <li className="text-zinc-500">No activity yet.</li>
        )}
        {system.auditLog.map((entry) => (
          <li key={entry.id} className="text-zinc-600 dark:text-zinc-400">
            {entry.occurredAt.toISOString()} — {entry.actor.name ?? entry.actor.email}{" "}
            — {entry.action}
          </li>
        ))}
      </ul>
    </div>
  );
}
