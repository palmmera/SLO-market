import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma, safeDb } from "@/lib/db";

export async function GET() {
  const session = await getSession();
  if (!session?.user?.id) return NextResponse.json({ count: 0 });
  const userId = session.user.id;
  const count = await safeDb(
    () =>
      prisma.message.count({
        where: {
          readAt: null,
          senderId: { not: userId },
          conversation: { OR: [{ buyerId: userId }, { sellerId: userId }] },
        },
      }),
    0,
  );
  return NextResponse.json({ count });
}
