import { stat } from "fs/promises";
import path from "path";
import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getUploadRoot, saveLiveFrame } from "@/lib/storage";
import { LIVE_GARAGE_ENABLED } from "@/lib/garage-live";

const LIVE_FRAME_MS = 5_000;

/** Other phones ask this once a second. Live means a new camera picture arrived in the last few seconds. */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!LIVE_GARAGE_ENABLED) return NextResponse.json({ live: false, src: null });
  const { id } = await params;
  if (!/^[a-zA-Z0-9]+$/.test(id)) return NextResponse.json({ live: false, src: null });
  try {
    const info = await stat(path.join(getUploadRoot(), "live", `${id}.jpg`));
    const live = Date.now() - info.mtimeMs < LIVE_FRAME_MS;
    return NextResponse.json({
      live,
      src: live ? `/uploads/live/${id}.jpg?t=${Math.floor(info.mtimeMs)}` : null,
    });
  } catch {
    return NextResponse.json({ live: false, src: null });
  }
}

/** The seller's phone posts one camera still about once a second while they are live. */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!LIVE_GARAGE_ENABLED) return NextResponse.json({ error: "Live is paused." }, { status: 404 });
  const session = await getSession();
  if (!session?.user?.id) return NextResponse.json({ error: "Sign in to go live." }, { status: 401 });

  const { id } = await params;
  const collection = await prisma.collection.findFirst({
    where: { id, sellerId: session.user.id, type: { not: "PRODUCE_STAND" }, status: { not: "REMOVED" } },
    select: { id: true },
  });
  if (!collection) return NextResponse.json({ error: "Sale not found." }, { status: 404 });

  const form = await req.formData();
  const frame = form.get("frame");
  if (!(frame instanceof File)) return NextResponse.json({ error: "Missing camera frame." }, { status: 400 });

  try {
    await saveLiveFrame(collection.id, Buffer.from(await frame.arrayBuffer()));
  } catch (err) {
    const message = err instanceof Error ? err.message : "Could not save the live picture.";
    return NextResponse.json({ error: message }, { status: 400 });
  }

  try {
    await prisma.collection.update({
      where: { id: collection.id },
      data: { liveAt: new Date() },
    });
  } catch {
    // The picture is already saved. Viewers follow that file even if the live flag cannot be stored yet.
  }

  return NextResponse.json({ ok: true });
}
