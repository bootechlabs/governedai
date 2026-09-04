import Link from "next/link";

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-zinc-50 px-6 text-center font-sans dark:bg-black">
      <h1 className="text-2xl font-semibold tracking-tight text-black dark:text-zinc-50">
        GovernedAI
      </h1>
      <p className="max-w-md text-zinc-600 dark:text-zinc-400">
        App scaffold in progress. Evidence uploads and sign-in land next —
        see <code>docs/mvp-scope.md</code>.
      </p>
      <div className="flex gap-3">
        <Link
          href="/systems"
          className="rounded bg-black px-4 py-2 text-sm font-medium text-white dark:bg-white dark:text-black"
        >
          View AI system inventory
        </Link>
        <Link
          href="/sign-in"
          className="rounded border border-zinc-300 px-4 py-2 text-sm font-medium dark:border-zinc-700"
        >
          Sign in
        </Link>
      </div>
    </div>
  );
}
