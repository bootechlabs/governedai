import { prisma } from "@/lib/prisma";

// TODO: replace with the real Auth.js session once sign-in UI exists.
// Until then every action attributes to the seeded dev/admin user
// (see prisma/seed.ts) so ownerId/actorId foreign keys have something real.
export async function getCurrentUser() {
  const user = await prisma.user.findFirst({ where: { role: "ADMIN" } });
  if (!user) {
    throw new Error(
      "No user found — run `pnpm run db:seed` before using the app.",
    );
  }
  return user;
}
