"use server";

import { getSession } from "@/lib/auth";
import { beginSellerPlanCheckout, beginSellerPlanPortal } from "@/lib/seller-plan";

async function currentUserId() {
  const session = await getSession();
  if (!session?.user?.id) throw new Error("Please sign in first.");
  return session.user.id;
}

export async function startSellerPlanCheckout(returnPath = "/dashboard") {
  try {
    const userId = await currentUserId();
    return await beginSellerPlanCheckout(userId, returnPath);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Could not start the Seller Plan.";
    return { error: message.length < 180 ? message : "Could not start the Seller Plan." };
  }
}

export async function openSellerPlanPortal(returnPath = "/dashboard") {
  try {
    const userId = await currentUserId();
    return await beginSellerPlanPortal(userId, returnPath);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Could not open billing.";
    return { error: message.length < 180 ? message : "Could not open billing." };
  }
}
