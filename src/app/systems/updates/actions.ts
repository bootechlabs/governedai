"use server";

import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/lib/current-user";
import { canFlagRegulatoryRecertification, canReviewRegulatoryUpdate } from "@/lib/permissions";
import { flagAffectedForRecertification, recordRegulatoryReview } from "@/lib/regulatory-updates-db";
import { REVIEW_OUTCOMES } from "@/lib/regulatory-updates";
import type { RegulatoryReviewOutcome } from "@prisma/client";

function revalidate(updateId: string) {
  revalidatePath("/systems/updates");
  revalidatePath(`/systems/updates/${updateId}`);
  revalidatePath("/systems");
  revalidatePath("/systems/activity");
}

// ADMIN and REVIEWER. The organization always comes from the session, never
// from the form.
export async function submitRegulatoryReview(updateId: string, formData: FormData) {
  const actor = await getCurrentUser();
  if (!canReviewRegulatoryUpdate(actor.role)) {
    throw new Error("Your role can't record a regulatory update review");
  }
  const outcome = String(formData.get("outcome") ?? "");
  if (!(REVIEW_OUTCOMES as readonly string[]).includes(outcome)) {
    throw new Error("Choose a review outcome");
  }

  await recordRegulatoryReview({
    organizationId: actor.organizationId,
    actorId: actor.id,
    updateId,
    outcome: outcome as RegulatoryReviewOutcome,
    note: String(formData.get("note") ?? ""),
  });
  revalidate(updateId);
}

// ADMIN only, and only ever by an explicit click — never a side effect of a
// review or a publish.
export async function flagUpdateForRecertification(updateId: string) {
  const actor = await getCurrentUser();
  if (!canFlagRegulatoryRecertification(actor.role)) {
    throw new Error("Only admins can flag systems for recertification");
  }
  await flagAffectedForRecertification({
    organizationId: actor.organizationId,
    actorId: actor.id,
    updateId,
  });
  revalidate(updateId);
}
