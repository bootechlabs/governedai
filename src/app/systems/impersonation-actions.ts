"use server";

import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/current-user";
import { endImpersonation, clearImpersonationCookie } from "@/lib/impersonation";

export async function stopImpersonation() {
  const actor = await getCurrentUser();
  if (!actor.impersonation) {
    return;
  }

  await endImpersonation(actor.impersonation.impersonationId);
  await clearImpersonationCookie();
  redirect("/platform");
}
