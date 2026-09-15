import { ArrowLeft, UserCircle } from "lucide-react";
import Link from "next/link";
import { getCurrentUser } from "@/lib/current-user";
import { Avatar } from "@/lib/avatar";
import { primaryButtonClass } from "@/lib/ui";
import { updateAvatar } from "./actions";

export const dynamic = "force-dynamic";

export default async function ProfilePage() {
  const actor = await getCurrentUser();

  return (
    <div className="mx-auto max-w-md px-6 py-12">
      <Link href="/systems" className="inline-flex items-center gap-1 text-sm text-zinc-500 hover:underline">
        <ArrowLeft size={14} />
        Dashboard
      </Link>

      <h1 className="mt-2 flex items-center gap-2 text-2xl font-semibold tracking-tight">
        <UserCircle size={22} />
        Your profile
      </h1>
      <p className="mt-1 text-sm text-zinc-500">
        {actor.name ?? actor.email} · {actor.role}
      </p>

      <div className="mt-6 flex items-center gap-4">
        <Avatar user={actor} size="lg" />
        <form action={updateAvatar} className="flex items-center gap-2">
          <input
            type="file"
            name="file"
            accept="image/*"
            required
            className="text-sm file:mr-2 file:rounded file:border-0 file:bg-zinc-200 file:px-2 file:py-1 file:text-xs dark:file:bg-zinc-800"
          />
          <button type="submit" className={primaryButtonClass}>
            Upload
          </button>
        </form>
      </div>
      <p className="mt-2 text-xs text-zinc-500">Image files only, 5MB max.</p>
    </div>
  );
}
