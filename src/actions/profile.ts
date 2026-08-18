"use server";

import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { saveProfileImage } from "@/lib/storage";
import { revalidatePath } from "next/cache";

export async function updateProfile(formData: FormData) {
  const session = await getSession();
  if (!session?.user?.id) throw new Error("Please sign in.");
  const name = String(formData.get("name") || "").trim();
  const bio = String(formData.get("bio") || "").trim();
  const cityId = String(formData.get("cityId") || "") || null;
  const photo = formData.get("photo");
  let image: string | undefined;
  if (photo instanceof File && photo.size > 0) {
    image = await saveProfileImage(photo);
  }
  await prisma.user.update({
    where: { id: session.user.id },
    data: { name, bio, cityId, ...(image ? { image } : {}) },
  });
  revalidatePath("/profile");
}
