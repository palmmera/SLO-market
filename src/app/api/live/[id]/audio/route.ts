import { mkdir, readdir, readFile, unlink, writeFile } from "fs/promises";
import path from "path";
import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getUploadRoot } from "@/lib/storage";
import { LIVE_GARAGE_ENABLED } from "@/lib/garage-live";

const MAX_BYTES = 100_000;
const FRESH_MS = 8_000;

export const dynamic = "force-dynamic";

function audioDir(id: string) {
  if (!/^[a-zA-Z0-9]+$/.test(id)) return null;
  const root = path.resolve(getUploadRoot());
  const dir = path.resolve(root, "live-audio", id);
  if (dir !== root && !dir.startsWith(root + path.sep)) return null;
  return dir;
}

function roleOf(value: string | null) {
  return value === "buyer" ? "buyer" : value === "seller" ? "seller" : null;
}

async function clips(dir: string, role: "seller" | "buyer") {
  let names: string[] = [];
  try {
    names = await readdir(dir);
  } catch {
    return [];
  }
  const now = Date.now();
  const found: { seq: number; file: string }[] = [];
  await Promise.all(
    names.map(async (name) => {
      const match = name.match(new RegExp(`^${role}-(\\d+)\\.wav$`));
      if (!match) return;
      const seq = Number(match[1]);
      const file = path.join(dir, name);
      if (now - seq > FRESH_MS) {
        await unlink(file).catch(() => undefined);
        return;
      }
      found.push({ seq, file });
    }),
  );
  found.sort((a, b) => a.seq - b.seq);
  return found;
}

/** The other person asks for the next short clip of voice. */
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!LIVE_GARAGE_ENABLED) return new NextResponse(null, { status: 204 });
  const { id } = await params;
  const dir = audioDir(id);
  const role = roleOf(new URL(req.url).searchParams.get("role"));
  const after = Number(new URL(req.url).searchParams.get("after") || 0);
  if (!dir || !role) return new NextResponse(null, { status: 204 });

  const fresh = (await clips(dir, role)).filter((clip) => clip.seq > after);
  if (!fresh.length) return new NextResponse(null, { status: 204 });
  const newest = fresh[fresh.length - 1];
  const chosen = newest.seq - fresh[0].seq > 1500 ? newest : fresh[0];
  const data = await readFile(chosen.file);
  return new NextResponse(data, {
    headers: {
      "Content-Type": "audio/wav",
      "Cache-Control": "no-store",
      "X-Audio-Seq": String(chosen.seq),
    },
  });
}

/** Seller mic, or a buyer holding Talk, posts one short clip. */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!LIVE_GARAGE_ENABLED) return NextResponse.json({ error: "Live is paused." }, { status: 404 });
  const session = await getSession();
  if (!session?.user?.id) return NextResponse.json({ error: "Sign in to talk." }, { status: 401 });

  const { id } = await params;
  const dir = audioDir(id);
  const role = roleOf(new URL(req.url).searchParams.get("role"));
  if (!dir || !role) return NextResponse.json({ error: "Bad sale." }, { status: 400 });

  const collection = await prisma.collection.findFirst({
    where: { id, type: { not: "PRODUCE_STAND" }, status: { not: "REMOVED" } },
    select: { id: true, sellerId: true },
  });
  if (!collection) return NextResponse.json({ error: "Sale not found." }, { status: 404 });
  const isSeller = collection.sellerId === session.user.id;
  if (role === "seller" && !isSeller) return NextResponse.json({ error: "Only the seller’s microphone goes out to everyone." }, { status: 403 });
  if (role === "buyer" && isSeller) return NextResponse.json({ error: "Buyers use Talk." }, { status: 403 });

  const length = Number(req.headers.get("content-length") || 0);
  if (length > MAX_BYTES) return NextResponse.json({ error: "Clip too long." }, { status: 413 });
  const bytes = Buffer.from(await req.arrayBuffer());
  if (bytes.length < 44 || bytes.length > MAX_BYTES) return NextResponse.json({ error: "Bad clip." }, { status: 400 });
  if (bytes.subarray(0, 4).toString() !== "RIFF" || bytes.subarray(8, 12).toString() !== "WAVE") {
    return NextResponse.json({ error: "Bad clip." }, { status: 400 });
  }

  await mkdir(dir, { recursive: true });
  let seq = Date.now();
  let file = path.join(dir, `${role}-${seq}.wav`);
  await writeFile(file, bytes);

  if (role === "seller") {
    try {
      await prisma.collection.update({ where: { id: collection.id }, data: { liveAt: new Date() } });
    } catch {
      // Voice clips still play if the live flag cannot be stored.
    }
  }

  return NextResponse.json({ ok: true, seq });
}
