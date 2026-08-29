import { mkdir, writeFile } from "fs/promises";
import path from "path";
import os from "os";
import sharp from "sharp";
import { nanoid } from "nanoid";
import { EXPLORE_VIDEO_MAX_BYTES, EXPLORE_VIDEO_MAX_SECONDS } from "@/lib/constants";

if (!process.env.UPLOAD_DIR || process.env.UPLOAD_DIR.startsWith("/data")) {
  process.env.UPLOAD_DIR = "uploads";
}

const ALLOWED = new Set(["image/jpeg", "image/png", "image/webp", "image/gif", "image/heic", "image/heif"]);
const MAX_BYTES = 15 * 1024 * 1024;

export function assertImageFile(file: File) {
  const type = file.type.toLowerCase();
  const name = file.name.toLowerCase();
  if (name.endsWith(".exe") || name.endsWith(".js") || name.endsWith(".html") || name.endsWith(".svg")) {
    throw new Error("That file type is not allowed.");
  }
  if (!ALLOWED.has(type) && !name.match(/\.(jpe?g|png|webp|gif|heic|heif)$/)) {
    throw new Error("Please upload a JPG, PNG, WEBP, or GIF image.");
  }
  if (file.size > MAX_BYTES) {
    throw new Error("Images must be 15MB or smaller.");
  }
}

let cachedRoot: string | null = null;

/** Render's /data path is not writable unless a disk is mounted there. */
function isUnusableUploadDir(value: string) {
  return value === "/data/uploads" || value === "/data" || value.startsWith("/data/");
}

export function getUploadRoot() {
  if (cachedRoot) return cachedRoot;

  const configured = process.env.UPLOAD_DIR?.trim();
  if (configured && !isUnusableUploadDir(configured)) {
    cachedRoot = path.isAbsolute(configured) ? configured : path.join(process.cwd(), configured);
  } else {
    cachedRoot = path.join(process.cwd(), "uploads");
  }

  return cachedRoot;
}

async function ensureDir(dir: string) {
  try {
    await mkdir(dir, { recursive: true });
    return dir;
  } catch {
    const fallbackRoot = path.join(os.tmpdir(), "slo-market-uploads");
    const relative = path.relative(getUploadRoot(), dir);
    const fallbackDir = path.join(fallbackRoot, relative);
    await mkdir(fallbackDir, { recursive: true });
    cachedRoot = fallbackRoot;
    return fallbackDir;
  }
}

export async function saveListingImage(file: File, preserveOriginal = false) {
  assertImageFile(file);
  const buffer = Buffer.from(await file.arrayBuffer());
  const id = nanoid(12);
  const dir = await ensureDir(path.join(getUploadRoot(), "listings"));

  const originalName = `${id}-original.jpg`;
  const displayName = `${id}.jpg`;
  const thumbName = `${id}-thumb.jpg`;

  if (preserveOriginal) {
    await writeFile(path.join(dir, originalName), buffer);
  }

  const display = await sharp(buffer, { failOn: "none" })
    .rotate()
    .resize({ width: preserveOriginal ? 2400 : 1600, height: preserveOriginal ? 2400 : 1600, fit: "inside", withoutEnlargement: true })
    .jpeg({ quality: preserveOriginal ? 92 : 82, mozjpeg: true })
    .toBuffer();

  const meta = await sharp(display).metadata();
  await writeFile(path.join(dir, displayName), display);

  const thumb = await sharp(display)
    .resize({ width: 640, height: 640, fit: "cover" })
    .jpeg({ quality: 75, mozjpeg: true })
    .toBuffer();
  await writeFile(path.join(dir, thumbName), thumb);

  return {
    url: `/uploads/listings/${displayName}`,
    thumbnailUrl: `/uploads/listings/${thumbName}`,
    originalUrl: preserveOriginal ? `/uploads/listings/${originalName}` : `/uploads/listings/${displayName}`,
    width: meta.width ?? null,
    height: meta.height ?? null,
  };
}

export async function saveProfileImage(file: File) {
  assertImageFile(file);
  const buffer = Buffer.from(await file.arrayBuffer());
  const id = nanoid(10);
  const dir = await ensureDir(path.join(getUploadRoot(), "profiles"));
  const name = `${id}.jpg`;
  const out = await sharp(buffer, { failOn: "none" })
    .rotate()
    .resize({ width: 400, height: 400, fit: "cover" })
    .jpeg({ quality: 80 })
    .toBuffer();
  await writeFile(path.join(dir, name), out);
  return `/uploads/profiles/${name}`;
}

const DOC_ALLOWED = new Set(["application/pdf", "image/jpeg", "image/png", "image/webp"]);
const DOC_MAX_BYTES = 10 * 1024 * 1024;

export async function saveDocument(file: File) {
  const type = file.type.toLowerCase();
  const name = file.name.toLowerCase();
  if (!DOC_ALLOWED.has(type) && !name.match(/\.(pdf|jpe?g|png|webp)$/)) {
    throw new Error("Please upload a PDF or image document.");
  }
  if (file.size > DOC_MAX_BYTES) throw new Error("Documents must be 10MB or smaller.");
  const buffer = Buffer.from(await file.arrayBuffer());
  const id = nanoid(12);
  const ext = name.endsWith(".pdf") ? "pdf" : name.match(/\.(jpe?g|png|webp)$/)?.[0]?.slice(1) || "pdf";
  const dir = await ensureDir(path.join(getUploadRoot(), "documents"));
  const fileName = `${id}.${ext}`;
  await writeFile(path.join(dir, fileName), buffer);
  return `/uploads/documents/${fileName}`;
}

const VIDEO_ALLOWED = new Set([
  "video/mp4",
  "video/quicktime",
  "video/webm",
  "video/x-m4v",
  "video/hevc",
  "video/h264",
]);

export async function saveExploreVideo(video: File, poster?: File | null, durationSec?: number) {
  const type = video.type.toLowerCase();
  const name = video.name.toLowerCase();
  if (!VIDEO_ALLOWED.has(type) && !name.match(/\.(mp4|m4v|mov|webm)$/)) {
    throw new Error("Please upload an MP4 or MOV video from your phone.");
  }
  if (video.size > EXPLORE_VIDEO_MAX_BYTES) {
    throw new Error("That clip is still too large after transfer. Try a 15-second clip, or record in 1080p.");
  }
  if (durationSec != null && durationSec > EXPLORE_VIDEO_MAX_SECONDS + 0.2) {
    throw new Error(`Keep the clip to ${EXPLORE_VIDEO_MAX_SECONDS} seconds or less.`);
  }

  const id = nanoid(12);
  const dir = await ensureDir(path.join(getUploadRoot(), "listings"));
  const ext = name.endsWith(".webm") ? "webm" : name.endsWith(".mov") ? "mov" : "mp4";
  const videoName = `${id}.${ext}`;
  await writeFile(path.join(dir, videoName), Buffer.from(await video.arrayBuffer()));

  let posterUrl = `/uploads/listings/${videoName}`;
  let width: number | null = null;
  let height: number | null = null;
  if (poster && poster.size) {
    const posterBuf = Buffer.from(await poster.arrayBuffer());
    const display = await sharp(posterBuf, { failOn: "none" })
      .rotate()
      .resize({ width: 1600, height: 1600, fit: "inside", withoutEnlargement: true })
      .jpeg({ quality: 82, mozjpeg: true })
      .toBuffer();
    const meta = await sharp(display).metadata();
    const posterName = `${id}-poster.jpg`;
    await writeFile(path.join(dir, posterName), display);
    posterUrl = `/uploads/listings/${posterName}`;
    width = meta.width ?? null;
    height = meta.height ?? null;
  }

  return {
    videoUrl: `/uploads/listings/${videoName}`,
    posterUrl,
    width,
    height,
    durationSec: durationSec ?? null,
  };
}
