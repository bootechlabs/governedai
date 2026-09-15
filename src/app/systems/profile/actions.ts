"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/current-user";
import { uploadAvatarFile } from "@/lib/storage";

const MAX_AVATAR_BYTES = 5 * 1024 * 1024;

export async function updateAvatar(formData: FormData) {
  const actor = await getCurrentUser();
  const file = formData.get("file");

  if (!(file instanceof File) || file.size === 0) {
    throw new Error("Choose an image to upload");
  }
  if (!file.type.startsWith("image/")) {
    throw new Error("Profile pictures must be an image file");
  }
  if (file.size > MAX_AVATAR_BYTES) {
    throw new Error("Profile pictures must be 5MB or smaller");
  }

  const avatarUrl = await uploadAvatarFile(file);
  await prisma.user.update({ where: { id: actor.id }, data: { avatarUrl } });

  revalidatePath("/systems/profile");
  revalidatePath("/systems", "layout");
}
