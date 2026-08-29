import { EXPLORE_VIDEO_MAX_BYTES, EXPLORE_VIDEO_MAX_SECONDS } from "@/lib/constants";

const IPHONE_HINT =
  "If this is an iPhone clip, set Settings → Camera → Formats to Most Compatible and record again — or share it from Photos as an MP4.";

function wait(el: HTMLVideoElement, event: string, timeoutMs: number) {
  return new Promise<void>((resolve, reject) => {
    const t = window.setTimeout(() => reject(new Error(`Timed out reading the video. ${IPHONE_HINT}`)), timeoutMs);
    const ok = () => {
      window.clearTimeout(t);
      resolve();
    };
    const fail = () => {
      window.clearTimeout(t);
      reject(new Error(`Could not read that video. ${IPHONE_HINT}`));
    };
    el.addEventListener(event, ok, { once: true });
    el.addEventListener("error", fail, { once: true });
  });
}

function recorderMime() {
  const types = ["video/webm;codecs=vp9", "video/webm;codecs=vp8", "video/webm", "video/mp4"];
  return types.find((t) => typeof MediaRecorder !== "undefined" && MediaRecorder.isTypeSupported(t)) || "";
}

async function capturePoster(video: HTMLVideoElement) {
  const canvas = document.createElement("canvas");
  canvas.width = video.videoWidth || 1280;
  canvas.height = video.videoHeight || 720;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Could not capture a still from the video.");
  ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
  const blob = await new Promise<Blob | null>((res) => canvas.toBlob(res, "image/jpeg", 0.82));
  if (!blob) throw new Error("Could not capture a still from the video.");
  return new File([blob], "poster.jpg", { type: "image/jpeg" });
}

async function compressVideo(video: HTMLVideoElement, source: File) {
  const mime = recorderMime();
  if (!mime) return source;

  const maxEdge = 1280;
  const srcW = video.videoWidth || 1280;
  const srcH = video.videoHeight || 720;
  const scale = Math.min(1, maxEdge / Math.max(srcW, srcH));
  const w = Math.max(2, Math.round((srcW * scale) / 2) * 2);
  const h = Math.max(2, Math.round((srcH * scale) / 2) * 2);

  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) return source;

  const stream = canvas.captureStream(30);
  const rec = new MediaRecorder(stream, { mimeType: mime, videoBitsPerSecond: 4_000_000 });
  const chunks: Blob[] = [];
  rec.ondataavailable = (e) => {
    if (e.data.size) chunks.push(e.data);
  };

  video.muted = true;
  video.playbackRate = 1;
  video.currentTime = 0;
  await wait(video, "seeked", 8000);

  let drawing = true;
  const draw = () => {
    if (!drawing) return;
    ctx.drawImage(video, 0, 0, w, h);
    requestAnimationFrame(draw);
  };

  const stopped = new Promise<void>((resolve, reject) => {
    rec.onstop = () => resolve();
    rec.onerror = () => reject(new Error("Could not shrink that video."));
  });

  rec.start(200);
  draw();
  await video.play();
  await new Promise<void>((resolve) => {
    if (video.ended) {
      resolve();
      return;
    }
    video.onended = () => resolve();
  });
  drawing = false;
  ctx.drawImage(video, 0, 0, w, h);
  if (rec.state !== "inactive") rec.stop();
  await stopped;
  video.pause();
  stream.getTracks().forEach((t) => t.stop());

  const type = mime.split(";")[0];
  const blob = new Blob(chunks, { type });
  if (!blob.size || blob.size >= source.size) return source;
  const ext = type.includes("mp4") ? "mp4" : "webm";
  return new File([blob], `explore.${ext}`, { type });
}

export async function prepareExploreVideo(file: File) {
  if (file.size > EXPLORE_VIDEO_MAX_BYTES) {
    throw new Error("That file is too large to upload. Try a 15-second clip recorded in 1080p.");
  }

  const url = URL.createObjectURL(file);
  const video = document.createElement("video");
  video.muted = true;
  video.playsInline = true;
  video.preload = "auto";
  video.src = url;

  try {
    await wait(video, "loadedmetadata", 12000);
    if (!Number.isFinite(video.duration) || video.duration <= 0) {
      try {
        await video.play();
        video.pause();
      } catch {
        throw new Error(`Could not read that video. ${IPHONE_HINT}`);
      }
    }
    if (!Number.isFinite(video.duration) || video.duration <= 0) {
      throw new Error(`Could not read that video. ${IPHONE_HINT}`);
    }
    if (video.duration > EXPLORE_VIDEO_MAX_SECONDS + 0.05) {
      throw new Error(`Keep the clip to ${EXPLORE_VIDEO_MAX_SECONDS} seconds or less.`);
    }
    if (!video.videoWidth) {
      await wait(video, "loadeddata", 12000);
    }

    video.currentTime = video.duration / 2;
    await wait(video, "seeked", 8000);
    const poster = await capturePoster(video);

    const looksIphone = file.type.includes("quicktime") || /\.(mov|m4v)$/i.test(file.name);
    const shouldCompress =
      file.size > 20 * 1024 * 1024 ||
      (video.videoWidth || 0) > 1280 ||
      (video.videoHeight || 0) > 1280 ||
      looksIphone;

    let upload = file;
    if (shouldCompress) {
      try {
        upload = await compressVideo(video, file);
      } catch {
        upload = file;
      }
    }
    if (upload.size > EXPLORE_VIDEO_MAX_BYTES) {
      throw new Error("That clip is still too large. Record 15 seconds in 1080p and try again.");
    }

    return { duration: video.duration, poster, video: upload };
  } finally {
    URL.revokeObjectURL(url);
    video.src = "";
  }
}
