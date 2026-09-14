import { notFound } from "next/navigation";
import Link from "next/link";
import { getCurrentUser } from "@/lib/current-user";
import { canCreateSystem } from "@/lib/permissions";
import { subtleLinkClass } from "@/lib/ui";
import { ImportForm } from "./import-form";

export const dynamic = "force-dynamic";

export default async function ImportPage() {
  const actor = await getCurrentUser();
  if (!canCreateSystem(actor.role)) notFound();

  return (
    <div className="mx-auto max-w-2xl px-6 py-12">
      <Link href="/systems" className="text-sm text-zinc-500 hover:underline">
        ← All systems
      </Link>

      <h1 className="mt-2 text-2xl font-semibold tracking-tight">Bulk import</h1>
      <p className="mt-1 text-sm text-zinc-500">
        Upload a CSV or Excel file to register multiple AI systems at once. Each row becomes a
        new system, owned by you, with the default workflow stages attached — the same as adding
        one by hand.
      </p>

      <Link href="/systems/import/template" className={`mt-4 inline-block ${subtleLinkClass}`}>
        Download template (.csv)
      </Link>

      <div className="mt-4 rounded-lg border border-zinc-200 p-3 text-xs text-zinc-500 dark:border-zinc-800">
        <p className="font-medium text-zinc-700 dark:text-zinc-300">Columns</p>
        <p className="mt-1">
          <strong>Name</strong> (required). Optional: Description, Business Unit, Vendor Name.
        </p>
        <p className="mt-1">
          <strong>Classification</strong>: PUBLIC, INTERNAL (default), CONFIDENTIAL, or RESTRICTED.
        </p>
        <p className="mt-1">
          <strong>Deployment Status</strong>: PLANNED (default), PILOT, PRODUCTION, or RETIRED.
        </p>
      </div>

      <ImportForm />
    </div>
  );
}
