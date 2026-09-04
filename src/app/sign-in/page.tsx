import { signIn } from "@/auth";

export default function SignInPage() {
  return (
    <div className="mx-auto flex min-h-screen max-w-sm flex-col justify-center px-6">
      <h1 className="text-xl font-semibold tracking-tight">Sign in to GovernedAI</h1>
      <p className="mt-2 text-sm text-zinc-500">
        Enter your work email — we&apos;ll send a magic link.
      </p>
      <form
        action={async (formData) => {
          "use server";
          await signIn("resend", {
            email: formData.get("email"),
            redirectTo: "/systems",
          });
        }}
        className="mt-6 flex flex-col gap-3"
      >
        <input
          type="email"
          name="email"
          placeholder="you@company.com"
          required
          className="rounded border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
        />
        <button
          type="submit"
          className="rounded bg-black px-4 py-2 text-sm font-medium text-white dark:bg-white dark:text-black"
        >
          Send magic link
        </button>
      </form>
    </div>
  );
}
