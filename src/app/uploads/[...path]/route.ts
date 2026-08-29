import { NextResponse } from "next/server";
import { readFile } from "fs/promises";
import path from "path";
import { getUploadRoot } from "@/lib/storage";

export async function GET(req: Request, { params }: { params: Promise<{ path: string[] }> }) {
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
      ext === ".mp4" || ext === ".m4v"
        ? "video/mp4"
        : ext === ".webm"
          ? "video/webm"
          : ext === ".mov"
            ? "video/quicktime"
            : ext === ".png"
              ? "image/png"
              : ext === ".webp"
                ? "image/webp"
                : ext === ".gif"
                  ? "image/gif"
                  : "image/jpeg";
    const isVideo = type.startsWith("video/");
    const headers: Record<string, string> = {
      "Content-Type": type,
      "Cache-Control": "public, max-age=31536000, immutable",
    };
    if (isVideo) {
      headers["Accept-Ranges"] = "bytes";
      const range = req.headers.get("range");
      const match = range?.match(/bytes=(\d+)-(\d*)/);
      if (match) {
        const size = data.byteLength;
        const start = Number(match[1]);
        const end = match[2] ? Number(match[2]) : size - 1;
        if (start >= size || end >= size || start > end) {
          return new NextResponse(null, {
            status: 416,
            headers: { "Content-Range": `bytes */${size}` },
          });
        }
        return new NextResponse(data.subarray(start, end + 1), {
          status: 206,
          headers: {
            ...headers,
            "Content-Range": `bytes ${start}-${end}/${size}`,
            "Content-Length": String(end - start + 1),
          },
        });
      }
    }
    headers["Content-Length"] = String(data.byteLength);
    return new NextResponse(data, { headers });
  } catch {
    return new NextResponse("Not found", { status: 404 });
  }
}
