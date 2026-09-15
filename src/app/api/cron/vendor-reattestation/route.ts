import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendVendorReattestationDueEmail } from "@/lib/email";

// Triggered daily by Vercel Cron (see vercel.json) — no user session exists
// for a cron invocation, so this is protected by a shared secret instead
// of the usual getCurrentUser() gate. Vercel sends this header
// automatically for cron-triggered requests once CRON_SECRET is set.
export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // The overdue threshold (lastAttestedAt + attestationCadenceDays) is
  // per-vendor, which Prisma can't express as a single-column filter —
  // fetch candidates (already attested at least once, not already
  // notified this cycle) and compute in JS.
  const candidates = await prisma.vendor.findMany({
    where: { lastAttestedAt: { not: null }, lastReattestationNoticeAt: null },
    select: {
      id: true,
      name: true,
      lastAttestedAt: true,
      attestationCadenceDays: true,
      organizationId: true,
      organization: { select: { name: true } },
    },
  });

  const overdue = candidates.filter(
    (v) => v.lastAttestedAt!.getTime() + v.attestationCadenceDays * 24 * 60 * 60 * 1000 < Date.now(),
  );

  const byOrg = new Map<string, typeof overdue>();
  for (const vendor of overdue) {
    const existing = byOrg.get(vendor.organizationId) ?? [];
    existing.push(vendor);
    byOrg.set(vendor.organizationId, existing);
  }

  const host = request.headers.get("host");
  const proto = request.headers.get("x-forwarded-proto") ?? (process.env.NODE_ENV === "production" ? "https" : "http");
  const vendorsUrl = `${proto}://${host}/systems/vendors`;

  let orgsNotified = 0;
  for (const [organizationId, vendors] of byOrg) {
    const admins = await prisma.user.findMany({
      where: { organizationId, role: "ADMIN" },
      select: { email: true },
    });
    if (admins.length === 0) continue;

    await sendVendorReattestationDueEmail({
      to: admins.map((a) => a.email),
      organizationName: vendors[0].organization.name,
      vendorNames: vendors.map((v) => v.name),
      vendorsUrl,
    });

    await prisma.vendor.updateMany({
      where: { id: { in: vendors.map((v) => v.id) } },
      data: { lastReattestationNoticeAt: new Date() },
    });
    orgsNotified++;
  }

  return NextResponse.json({ orgsNotified, vendorsFlagged: overdue.length });
}
