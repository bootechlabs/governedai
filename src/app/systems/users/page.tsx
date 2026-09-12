import { notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/current-user";
import { canManageUsers } from "@/lib/permissions";
import { inputClass, primaryButtonClass } from "@/lib/ui";
import { addUser, updateUserRole } from "./actions";

export const dynamic = "force-dynamic";

const gridCols = "grid-cols-[2fr_1.5fr_1fr_150px]";
const cellClass = "px-3 py-2 flex items-center text-xs";
const cellInputClass = `w-full ${inputClass}`;

const roleOptions = [
  { value: "ADMIN", label: "Admin" },
  { value: "REVIEWER", label: "Reviewer" },
  { value: "CONTRIBUTOR", label: "Contributor" },
];

export default async function UsersPage() {
  const actor = await getCurrentUser();
  if (!canManageUsers(actor.role)) notFound();

  const users = await prisma.user.findMany({
    where: { organizationId: actor.organizationId },
    orderBy: { createdAt: "asc" },
  });

  return (
    <div className="mx-auto max-w-4xl px-6 py-12">
      <Link href="/systems" className="text-sm text-zinc-500 hover:underline">
        ← All systems
      </Link>

      <h1 className="mt-2 text-2xl font-semibold tracking-tight">Manage users</h1>
      <p className="mt-1 text-sm text-zinc-500">
        Sign-in is admin-provisioned — add an email here before that person can sign in.
      </p>

      <form id="add-user-form" action={addUser} />

      <div
        role="table"
        className="mt-6 overflow-x-auto rounded-lg border border-zinc-200 dark:border-zinc-800"
      >
        <div
          role="row"
          className={`grid ${gridCols} border-b border-zinc-200 text-left text-xs uppercase tracking-wide text-zinc-500 dark:border-zinc-800`}
        >
          <span role="columnheader" className={cellClass}>
            Email
          </span>
          <span role="columnheader" className={cellClass}>
            Name
          </span>
          <span role="columnheader" className={cellClass}>
            Role
          </span>
          <span role="columnheader" className={cellClass}></span>
        </div>

        <div
          role="row"
          className={`grid ${gridCols} border-b border-zinc-200 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900/40`}
        >
          <span role="cell" className={cellClass}>
            <input
              form="add-user-form"
              name="email"
              type="email"
              placeholder="name@company.com"
              required
              className={cellInputClass}
            />
          </span>
          <span role="cell" className={cellClass}>
            <input
              form="add-user-form"
              name="name"
              type="text"
              placeholder="Name (optional)"
              className={cellInputClass}
            />
          </span>
          <span role="cell" className={cellClass}>
            <select
              form="add-user-form"
              name="role"
              defaultValue="CONTRIBUTOR"
              className={cellInputClass}
            >
              {roleOptions.map((r) => (
                <option key={r.value} value={r.value}>
                  {r.label}
                </option>
              ))}
            </select>
          </span>
          <span role="cell" className={cellClass}>
            <button form="add-user-form" type="submit" className={primaryButtonClass}>
              Add
            </button>
          </span>
        </div>

        {users.map((user) => {
          const isSelf = user.id === actor.id;
          const formId = `role-form-${user.id}`;
          return (
            <div
              key={user.id}
              role="row"
              className={`grid ${gridCols} border-b border-zinc-200 last:border-0 dark:border-zinc-800`}
            >
              <span role="cell" className={`${cellClass} font-medium`}>
                {user.email}
              </span>
              <span role="cell" className={`${cellClass} text-zinc-500`}>
                {user.name ?? "—"}
              </span>
              <span role="cell" className={cellClass}>
                {isSelf ? (
                  <span>{user.role} (you)</span>
                ) : (
                  <>
                    <form id={formId} action={updateUserRole.bind(null, user.id)} />
                    <select
                      form={formId}
                      name="role"
                      defaultValue={user.role}
                      className={cellInputClass}
                    >
                      {roleOptions.map((r) => (
                        <option key={r.value} value={r.value}>
                          {r.label}
                        </option>
                      ))}
                    </select>
                  </>
                )}
              </span>
              <span role="cell" className={cellClass}>
                {!isSelf && (
                  <button form={formId} type="submit" className={primaryButtonClass}>
                    Save
                  </button>
                )}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
