import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Building2 } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/current-user";
import { canManageVendors } from "@/lib/permissions";
import { inputClass, primaryButtonClass } from "@/lib/ui";
import { BaaStatusBadge } from "@/lib/badges";
import { createVendor } from "./actions";

export const dynamic = "force-dynamic";

const gridCols = "grid-cols-[2fr_1.5fr_1fr_100px]";
const cellClass = "px-3 py-2 flex items-center text-xs";

const baaStatusOptions = [
  { value: "REQUIRED_NOT_ON_FILE", label: "Required, not on file" },
  { value: "ON_FILE", label: "On file" },
  { value: "EXPIRED", label: "Expired" },
  { value: "NOT_APPLICABLE", label: "Not applicable" },
];

export default async function VendorsPage() {
  const actor = await getCurrentUser();
  if (!canManageVendors(actor.role)) notFound();

  const vendors = await prisma.vendor.findMany({
    where: { organizationId: actor.organizationId },
    orderBy: { name: "asc" },
    include: { _count: { select: { aiSystems: true } } },
  });

  return (
    <div className="mx-auto max-w-4xl px-6 py-12">
      <Link href="/systems/inventory" className="inline-flex items-center gap-1 text-sm text-zinc-500 hover:underline">
        <ArrowLeft size={14} />
        All systems
      </Link>

      <h1 className="mt-2 flex items-center gap-2 text-2xl font-semibold tracking-tight">
        <Building2 size={22} />
        Vendors
      </h1>
      <p className="mt-1 text-sm text-zinc-500">
        A registered vendor auto-links to any AI system whose vendor name matches exactly —
        no need to change how systems are created or imported.
      </p>

      <form id="add-vendor-form" action={createVendor} />

      <div
        role="table"
        className="mt-6 overflow-x-auto rounded-lg border border-zinc-200 dark:border-zinc-800"
      >
        <div
          role="row"
          className={`grid ${gridCols} border-b border-zinc-200 text-left text-xs uppercase tracking-wide text-zinc-500 dark:border-zinc-800`}
        >
          <span role="columnheader" className={cellClass}>Name</span>
          <span role="columnheader" className={cellClass}>BAA status</span>
          <span role="columnheader" className={cellClass}>Linked systems</span>
          <span role="columnheader" className={cellClass}></span>
        </div>

        <div
          role="row"
          className={`grid ${gridCols} border-b border-zinc-200 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900/40`}
        >
          <span role="cell" className={cellClass}>
            <input
              form="add-vendor-form"
              name="name"
              placeholder="Vendor name"
              required
              className={`w-full ${inputClass}`}
            />
          </span>
          <span role="cell" className={cellClass}>
            <select form="add-vendor-form" name="baaStatus" defaultValue="REQUIRED_NOT_ON_FILE" className={`w-full ${inputClass}`}>
              {baaStatusOptions.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </span>
          <span role="cell" className={cellClass}></span>
          <span role="cell" className={cellClass}>
            <button form="add-vendor-form" type="submit" className={primaryButtonClass}>
              Add
            </button>
          </span>
        </div>

        {vendors.length === 0 && (
          <div role="row" className={`grid ${gridCols}`}>
            <span role="cell" className={`${cellClass} text-zinc-500`}>No vendors registered yet.</span>
          </div>
        )}

        {vendors.map((vendor) => (
          <Link
            key={vendor.id}
            href={`/systems/vendors/${vendor.id}`}
            role="row"
            className={`grid ${gridCols} border-b border-zinc-200 last:border-0 hover:bg-zinc-50 dark:border-zinc-800 dark:hover:bg-zinc-900/60`}
          >
            <span role="cell" className={`${cellClass} font-medium`}>{vendor.name}</span>
            <span role="cell" className={cellClass}>
              <BaaStatusBadge value={vendor.baaStatus} />
            </span>
            <span role="cell" className={`${cellClass} text-zinc-500`}>{vendor._count.aiSystems}</span>
            <span role="cell" className={cellClass}></span>
          </Link>
        ))}
      </div>
    </div>
  );
}
