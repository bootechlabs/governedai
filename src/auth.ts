import NextAuth from "next-auth";
import Resend from "next-auth/providers/resend";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "@/lib/prisma";

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),
  providers: [
    Resend({
      apiKey: process.env.AUTH_RESEND_KEY,
      from: process.env.EMAIL_FROM,
      async sendVerificationRequest({ identifier, url }) {
        if (!process.env.AUTH_RESEND_KEY) {
          // Dev fallback — no Resend key configured. Log the link instead
          // of sending an email so local sign-in still works end to end.
          console.log(`\n[dev] Magic link for ${identifier}:\n${url}\n`);
          return;
        }
        const { Resend: ResendClient } = await import("resend");
        const client = new ResendClient(process.env.AUTH_RESEND_KEY);
        const { error } = await client.emails.send({
          from: process.env.EMAIL_FROM ?? "GovernedAI <noreply@governedai.co>",
          to: identifier,
          subject: "Sign in to GovernedAI",
          html: `<p><a href="${url}">Sign in to GovernedAI</a></p><p>This link expires in 24 hours.</p>`,
        });
        if (error) throw new Error(`Resend error: ${JSON.stringify(error)}`);
      },
    }),
  ],
  session: { strategy: "database" },
  pages: {
    signIn: "/sign-in",
  },
  callbacks: {
    authorized({ auth, request }) {
      const isLoggedIn = !!auth?.user;
      const isProtected = request.nextUrl.pathname.startsWith("/systems");
      return isProtected ? isLoggedIn : true;
    },
  },
});
