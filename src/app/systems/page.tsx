import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { createAiSystem } from "./actions";

export const dynamic = "force-dynamic";

export default async function SystemsPage() {
  const systems = await prisma.aiSystem.findMany({
    orderBy: { createdAt: "desc" },
    include: { owner: true, stages: { orderBy: { sequence: "asc" } } },
  });

  return (
    <div className="mx-auto max-w-3xl px-6 py-12">
      <h1 className="text-2xl font-semibold tracking-tight">AI system inventory</h1>

      <form
        action={createAiSystem}
        className="mt-8 flex flex-col gap-3 rounded-lg border border-zinc-200 p-5 dark:border-zinc-800"
      >
        <h2 className="text-sm font-medium text-zinc-600 dark:text-zinc-400">
          Register a new AI system
        </h2>
        <input
          name="name"
          placeholder="Name"
          required
          className="rounded border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
        />
        <textarea
          name="description"
          placeholder="Description"
          className="rounded border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
        />
        <div className="grid grid-cols-2 gap-3">
          <input
            name="businessUnit"
            placeholder="Business unit"
            className="rounded border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
          />
          <input
            name="vendorName"
            placeholder="Vendor (if third-party)"
            className="rounded border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <select
            name="dataSensitivity"
            defaultValue="NONE"
            className="rounded border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
          >
            <option value="NONE">No sensitive data</option>
            <option value="PII">PII</option>
            <option value="PHI">PHI</option>
          </select>
          <select
            name="deploymentStatus"
            defaultValue="PLANNED"
            className="rounded border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
          >
            <option value="PLANNED">Planned</option>
            <option value="PILOT">Pilot</option>
            <option value="PRODUCTION">Production</option>
            <option value="RETIRED">Retired</option>
          </select>
        </div>
        <button
          type="submit"
          className="mt-1 self-start rounded bg-black px-4 py-2 text-sm font-medium text-white dark:bg-white dark:text-black"
        >
          Add system
        </button>
      </form>

      <ul className="mt-10 flex flex-col gap-3">
        {systems.length === 0 && (
          <li className="text-sm text-zinc-500">No AI systems registered yet.</li>
        )}
        {systems.map((system) => (
          <li key={system.id}>
            <Link
              href={`/systems/${system.id}`}
              className="block rounded-lg border border-zinc-200 p-4 hover:border-zinc-400 dark:border-zinc-800 dark:hover:border-zinc-600"
            >
              <div className="flex items-center justify-between">
                <span className="font-medium">{system.name}</span>
                <span className="text-xs uppercase tracking-wide text-zinc-500">
                  {system.deploymentStatus}
                </span>
              </div>
              <div className="mt-1 text-sm text-zinc-500">
                Owner: {system.owner.name ?? system.owner.email} · Stages:{" "}
                {system.stages.map((s) => s.status).join(" → ")}
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
