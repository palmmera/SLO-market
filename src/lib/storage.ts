import { mkdir, writeFile } from "fs/promises";
import path from "path";
import os from "os";
import sharp from "sharp";
import { nanoid } from "nanoid";

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
