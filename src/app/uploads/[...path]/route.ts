import { NextResponse } from "next/server";
import { readFile } from "fs/promises";
import path from "path";
import { getUploadRoot } from "@/lib/storage";

export async function GET(_req: Request, { params }: { params: Promise<{ path: string[] }> }) {
  const segments = (await params).path;
  const safe = segments.every((part) => part && !part.includes("..") && !part.includes("\\") && !part.includes("/"));
  if (!safe) return new NextResponse("Not found", { status: 404 });

  const root = path.resolve(getUploadRoot());
  const filePath = path.resolve(root, ...segments);
  if (!filePath.startsWith(root)) return new NextResponse("Not found", { status: 404 });

  try {
    const data = await readFile(filePath);
    const ext = path.extname(filePath).toLowerCase();
    const type =
      ext === ".png" ? "image/png" : ext === ".webp" ? "image/webp" : ext === ".gif" ? "image/gif" : "image/jpeg";
    return new NextResponse(data, {
      headers: {
        "Content-Type": type,
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  } catch {
    return new NextResponse("Not found", { status: 404 });
  }
}
