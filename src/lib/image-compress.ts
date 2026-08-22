/**
 * Client-side image downscaling/compression used before uploading listing photos.
 *
 * Phone photos are frequently 3–12MB each; shrinking them in the browser first
 * makes uploads fast and reliable on mobile data and keeps requests well under
 * the server body limit. The server still re-processes with sharp, so this is a
 * best-effort optimization: anything the browser can't decode (e.g. HEIC) or any
 * failure simply returns the original file untouched.
 */

const COMPRESSIBLE = new Set(["image/jpeg", "image/png", "image/webp"]);
const MAX_DIMENSION = 2000;
const JPEG_QUALITY = 0.82;

type DecodedImage = {
  source: CanvasImageSource;
  width: number;
  height: number;
  close: () => void;
};

function loadHtmlImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = (event) => {
      URL.revokeObjectURL(url);
      reject(event);
    };
    img.src = url;
  });
}

async function decode(file: File): Promise<DecodedImage> {
  if (typeof createImageBitmap === "function") {
    try {
      const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
      return { source: bitmap, width: bitmap.width, height: bitmap.height, close: () => bitmap.close() };
    } catch {
      // Fall back to HTMLImageElement below.
    }
  }
  const img = await loadHtmlImage(file);
  return { source: img, width: img.naturalWidth, height: img.naturalHeight, close: () => {} };
}

export async function compressImage(file: File): Promise<File> {
  if (typeof document === "undefined") return file;
  if (!COMPRESSIBLE.has(file.type)) return file;

  try {
    const { source, width, height, close } = await decode(file);
    if (!width || !height) {
      close();
      return file;
    }

    const scale = Math.min(1, MAX_DIMENSION / Math.max(width, height));
    const targetWidth = Math.max(1, Math.round(width * scale));
    const targetHeight = Math.max(1, Math.round(height * scale));

    const canvas = document.createElement("canvas");
    canvas.width = targetWidth;
    canvas.height = targetHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      close();
      return file;
    }
    ctx.drawImage(source, 0, 0, targetWidth, targetHeight);
    close();

    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", JPEG_QUALITY));
    if (!blob || blob.size >= file.size) return file;

    const name = `${file.name.replace(/\.[^.]+$/, "")}.jpg`;
    return new File([blob], name, { type: "image/jpeg", lastModified: Date.now() });
  } catch {
    return file;
  }
}

/** Compress a batch, preserving order. Failures pass through as the original file. */
export async function compressImages(files: File[]): Promise<File[]> {
  return Promise.all(files.map((file) => compressImage(file)));
}
