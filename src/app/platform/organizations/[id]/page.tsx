import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Users as UsersIcon } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { inputClass, primaryButtonClass } from "@/lib/ui";
import { updateOrganizationVertical } from "./actions";
import { ImpersonateButton } from "./impersonate-button";

export const dynamic = "force-dynamic";

export default async function PlatformOrganizationPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const organization = await prisma.organization.findUnique({
    where: { id },
    include: {
      users: { orderBy: { email: "asc" } },
      _count: { select: { aiSystems: { where: { archivedAt: null } } } },
    },
  });
  if (!organization) notFound();

  return (
    <div className="mx-auto max-w-3xl px-6 py-12">
      <Link href="/platform" className="inline-flex items-center gap-1 text-sm text-zinc-500 hover:underline">
        <ArrowLeft size={14} />
        Global dashboard
      </Link>

      <h1 className="mt-2 text-2xl font-semibold tracking-tight">{organization.name}</h1>
      <p className="mt-1 text-sm text-zinc-500">
        {organization._count.aiSystems} active AI system
        {organization._count.aiSystems === 1 ? "" : "s"} · {organization.users.length} user
        {organization.users.length === 1 ? "" : "s"}
      </p>

      <form
        action={updateOrganizationVertical.bind(null, organization.id)}
        className="mt-4 flex items-center gap-2"
      >
        <input
          name="vertical"
          defaultValue={organization.vertical ?? ""}
          placeholder="Vertical (e.g. Health system, Digital health vendor, Payer/RCM)"
          className={`flex-1 ${inputClass}`}
        />
        <button type="submit" className={primaryButtonClass}>
          Save
        </button>
      </form>

      <h2 className="mt-10 flex items-center gap-2 text-lg font-medium">
        <UsersIcon size={18} />
        Users
      </h2>
      <p className="mt-1 text-xs text-zinc-500">
        Impersonating opens a time-boxed (1 hour) session viewing this app as that user. The user
        is emailed, and the session is logged.
      </p>
      <ul className="mt-4 flex flex-col gap-2 text-sm">
        {organization.users.map((user) => (
          <li
            key={user.id}
            className="flex items-center justify-between rounded-lg border border-zinc-200 px-4 py-2.5 dark:border-zinc-800"
          >
            <span>
              {user.name ?? user.email} <span className="text-zinc-500">· {user.role}</span>
            </span>
            {user.isPlatformAdmin ? (
              <span className="text-xs text-zinc-500">Platform admin</span>
            ) : (
              <ImpersonateButton userId={user.id} name={user.name ?? user.email} />
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
