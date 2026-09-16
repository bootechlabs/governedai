import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/current-user";
import { canManageVendors } from "@/lib/permissions";
import { inputClass, primaryButtonClass, subtleLinkClass } from "@/lib/ui";
import { updateVendor, markVendorReattested } from "../actions";
import { DeleteVendorButton } from "../delete-vendor-button";

export const dynamic = "force-dynamic";

const baaStatusOptions = [
  { value: "REQUIRED_NOT_ON_FILE", label: "Required, not on file" },
  { value: "ON_FILE", label: "On file" },
  { value: "EXPIRED", label: "Expired" },
  { value: "NOT_APPLICABLE", label: "Not applicable" },
];

export default async function VendorDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const actor = await getCurrentUser();
  if (!canManageVendors(actor.role)) notFound();

  const vendor = await prisma.vendor.findUnique({
    where: { id, organizationId: actor.organizationId },
    include: { aiSystems: { select: { id: true, name: true } } },
  });
  if (!vendor) notFound();

  return (
    <div className="mx-auto max-w-2xl px-6 py-12">
      <Link href="/systems/vendors" className="inline-flex items-center gap-1 text-sm text-zinc-500 hover:underline">
        <ArrowLeft size={14} />
        All vendors
      </Link>

      <h1 className="mt-2 text-2xl font-semibold tracking-tight">{vendor.name}</h1>

      <form action={updateVendor.bind(null, vendor.id)} className="mt-6 flex flex-col gap-3">
        <label className="text-xs font-medium text-zinc-500">Name</label>
        <input name="name" defaultValue={vendor.name} required className={inputClass} />

        <label className="text-xs font-medium text-zinc-500">BAA status</label>
        <select name="baaStatus" defaultValue={vendor.baaStatus} className={inputClass}>
          {baaStatusOptions.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>

        <label className="text-xs font-medium text-zinc-500">Subprocessors (one per line)</label>
        <textarea
          name="subprocessors"
          defaultValue={vendor.subprocessors.join("\n")}
          rows={4}
          className={inputClass}
        />

        <label className="text-xs font-medium text-zinc-500">SOC 2 report URL</label>
        <input
          name="soc2ReportUrl"
          type="url"
          defaultValue={vendor.soc2ReportUrl ?? ""}
          placeholder="https://..."
          className={inputClass}
        />

        <label className="text-xs font-medium text-zinc-500">Model card URL</label>
        <input
          name="modelCardUrl"
          type="url"
          defaultValue={vendor.modelCardUrl ?? ""}
          placeholder="https://..."
          className={inputClass}
        />

        <label className="text-xs font-medium text-zinc-500">Security evaluation URL</label>
        <input
          name="securityEvalUrl"
          type="url"
          defaultValue={vendor.securityEvalUrl ?? ""}
          placeholder="https://..."
          className={inputClass}
        />

        <label className="text-xs font-medium text-zinc-500">Notes</label>
        <textarea name="notes" defaultValue={vendor.notes ?? ""} rows={3} className={inputClass} />

        <label className="text-xs font-medium text-zinc-500">Re-attestation cadence (days)</label>
        <input
          name="attestationCadenceDays"
          type="number"
          min={1}
          defaultValue={vendor.attestationCadenceDays}
          className={inputClass}
        />

        <button type="submit" className={`self-start ${primaryButtonClass}`}>
          Save changes
        </button>
      </form>

      <div className="mt-6 flex items-center justify-between rounded-lg border border-zinc-200 p-4 text-sm dark:border-zinc-800">
        <span className="text-zinc-600 dark:text-zinc-400">
          {vendor.lastAttestedAt
            ? `Last re-attested ${vendor.lastAttestedAt.toISOString().slice(0, 10)}`
            : "Not yet tracked"}
        </span>
        <form action={markVendorReattested.bind(null, vendor.id)}>
          <button type="submit" className={subtleLinkClass}>
            Mark re-attested today
          </button>
        </form>
      </div>

      <h2 className="mt-10 text-lg font-medium">Linked AI systems</h2>
      <ul className="mt-3 flex flex-col gap-1 text-sm">
        {vendor.aiSystems.length === 0 && (
          <li className="text-zinc-500">
            No systems linked yet — a system links automatically when its vendor name matches
            &quot;{vendor.name}&quot; exactly.
          </li>
        )}
        {vendor.aiSystems.map((system) => (
          <li key={system.id}>
            <Link href={`/systems/${system.id}`} className="underline hover:no-underline">
              {system.name}
            </Link>
          </li>
        ))}
      </ul>

      <div className="mt-6 border-t border-zinc-200 pt-4 dark:border-zinc-800">
        <DeleteVendorButton vendorId={vendor.id} name={vendor.name} />
      </div>
    </div>
  );
}
