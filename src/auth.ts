import NextAuth from "next-auth";
import Resend from "next-auth/providers/resend";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

// Auth.js's Email/Resend flow calls adapter.createUser() automatically for
// any email with no existing User row — i.e. open self-registration. This
// app is provisioned by an admin (see /systems/users), so createUser is
// disabled entirely: signing in with an email nobody has provisioned fails
// here, before any User or Session row is created. (The signIn callback
// runs too late for this — Auth.js already creates the user/session for
// the email strategy before invoking it.)
const baseAdapter = PrismaAdapter(prisma);
const adapter = {
  ...baseAdapter,
  async createUser() {
    throw new Error(
      "This email hasn't been provisioned for GovernedAI. Ask an admin to add your account first.",
    );
  },
  // Signing in with a stale/invalid session cookie (e.g. after the DB was
  // reset while the browser kept an old cookie) makes Auth.js try to
  // delete a session row that's already gone — the default adapter throws
  // on that instead of treating it as already-done.
  async deleteSession(sessionToken: string) {
    try {
      await baseAdapter.deleteSession!(sessionToken);
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2025"
      ) {
        return;
      }
      throw error;
    }
  },
};

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter,
  providers: [
    Resend({
      apiKey: process.env.AUTH_RESEND_KEY,
      from: process.env.EMAIL_FROM,
      async sendVerificationRequest({ identifier, url }) {
        // Email link-safety scanners (Gmail, corporate gateways) prefetch
        // every URL in an email body, which silently burns a single-use
        // magic link before the human clicks it. Send a link to our own
        // confirm page instead — scanners fetch that harmlessly, but only
        // an actual click on its button reaches the real callback URL.
        const confirmUrl = `${new URL(url).origin}/auth/confirm?url=${encodeURIComponent(url)}`;

        if (!process.env.AUTH_RESEND_KEY) {
          // Dev fallback — no Resend key configured. Log the link instead
          // of sending an email so local sign-in still works end to end.
          console.log(`\n[dev] Magic link for ${identifier}:\n${confirmUrl}\n`);
          return;
        }
        const { Resend: ResendClient } = await import("resend");
        const client = new ResendClient(process.env.AUTH_RESEND_KEY);
        const { error } = await client.emails.send({
          from: process.env.EMAIL_FROM ?? "GovernedAI <noreply@governedai.co>",
          to: identifier,
          subject: "Sign in to GovernedAI",
          html: `<p><a href="${confirmUrl}">Sign in to GovernedAI</a></p><p>This link expires in 24 hours.</p>`,
        });
        if (error) throw new Error(`Resend error: ${JSON.stringify(error)}`);
      },
    }),
  ],
  session: { strategy: "database" },
  pages: {
    signIn: "/sign-in",
    error: "/auth/error",
  },
  callbacks: {
    authorized({ auth, request }) {
      const isLoggedIn = !!auth?.user;
      const isProtected = request.nextUrl.pathname.startsWith("/systems");
      return isProtected ? isLoggedIn : true;
    },
  },
});
