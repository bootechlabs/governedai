import { signIn } from "@/auth";
import { inputClass, primaryButtonClass } from "@/lib/ui";

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
          className={inputClass}
        />
        <button type="submit" className={primaryButtonClass}>
          Send magic link
        </button>
      </form>
    </div>
  );
}
