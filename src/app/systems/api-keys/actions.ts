"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/current-user";
import { canManageApiKeys } from "@/lib/permissions";
import { generateApiKey } from "@/lib/api-keys";

async function requireAdmin() {
  const actor = await getCurrentUser();
  if (!canManageApiKeys(actor.role)) {
    throw new Error("Only admins can manage API keys");
  }
  return actor;
}

export interface CreateApiKeyResult {
  plaintext: string;
  name: string;
}

// Returns the plaintext key exactly once — nothing after this stores it,
// so if the caller loses it, only revoking and creating a new one helps.
export async function createApiKey(
  _prevState: CreateApiKeyResult | null,
  formData: FormData,
): Promise<CreateApiKeyResult> {
  const actor = await requireAdmin();
  const name = String(formData.get("name") ?? "").trim();
  if (!name) {
    throw new Error("Name is required");
  }

  const { plaintext, keyPrefix, keyHash } = generateApiKey();

  await prisma.apiKey.create({
    data: {
      name,
      keyPrefix,
      keyHash,
      organizationId: actor.organizationId,
      createdById: actor.id,
    },
  });

  revalidatePath("/systems/api-keys");
  return { plaintext, name };
}

export async function revokeApiKey(keyId: string) {
  const actor = await requireAdmin();
  const { count } = await prisma.apiKey.updateMany({
    where: { id: keyId, organizationId: actor.organizationId, revokedAt: null },
    data: { revokedAt: new Date() },
  });
  if (count === 0) {
    throw new Error("API key not found in your organization, or already revoked");
  }
  revalidatePath("/systems/api-keys");
}
