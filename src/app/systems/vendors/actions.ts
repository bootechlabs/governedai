"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/current-user";
import { canManageVendors } from "@/lib/permissions";
import type { BaaStatus } from "@prisma/client";

async function requireAdmin() {
  const actor = await getCurrentUser();
  if (!canManageVendors(actor.role)) {
    throw new Error("Only admins can manage vendors");
  }
  return actor;
}

function parseSubprocessors(raw: string): string[] {
  return raw
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
}

export async function createVendor(formData: FormData) {
  const actor = await requireAdmin();
  const name = String(formData.get("name") ?? "").trim();
  const baaStatus = String(formData.get("baaStatus") ?? "REQUIRED_NOT_ON_FILE") as BaaStatus;
  if (!name) {
    throw new Error("Name is required");
  }

  await prisma.vendor.create({
    data: { name, baaStatus, organizationId: actor.organizationId },
  });

  revalidatePath("/systems/vendors");
}

export async function updateVendor(vendorId: string, formData: FormData) {
  const actor = await requireAdmin();
  const name = String(formData.get("name") ?? "").trim();
  const baaStatus = String(formData.get("baaStatus") ?? "REQUIRED_NOT_ON_FILE") as BaaStatus;
  const subprocessors = parseSubprocessors(String(formData.get("subprocessors") ?? ""));
  const soc2ReportUrl = String(formData.get("soc2ReportUrl") ?? "").trim() || null;
  const modelCardUrl = String(formData.get("modelCardUrl") ?? "").trim() || null;
  const notes = String(formData.get("notes") ?? "").trim() || null;
  if (!name) {
    throw new Error("Name is required");
  }

  const { count } = await prisma.vendor.updateMany({
    where: { id: vendorId, organizationId: actor.organizationId },
    data: { name, baaStatus, subprocessors, soc2ReportUrl, modelCardUrl, notes },
  });
  if (count === 0) {
    throw new Error("Vendor not found in your organization");
  }

  revalidatePath("/systems/vendors");
  revalidatePath(`/systems/vendors/${vendorId}`);
}

export async function deleteVendor(vendorId: string) {
  const actor = await requireAdmin();
  const vendor = await prisma.vendor.findUniqueOrThrow({ where: { id: vendorId } });
  if (vendor.organizationId !== actor.organizationId) {
    throw new Error("Not found");
  }

  const systemCount = await prisma.aiSystem.count({ where: { vendorId } });
  if (systemCount > 0) {
    throw new Error(
      `Can't delete — ${systemCount} AI system${systemCount === 1 ? " is" : "s are"} still linked to this vendor.`,
    );
  }

  await prisma.vendor.delete({ where: { id: vendorId } });
  revalidatePath("/systems/vendors");
}
