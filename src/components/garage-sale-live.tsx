"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { garageSaleLiveNow, getCollectionLiveMessages, messageGarageSale, setGarageSaleLive, type LiveFeedMessage } from "@/actions/live-feed";
import { LiveMark } from "@/components/listing-card";
import { startVoiceUpload } from "@/lib/live-voice";

export function GarageSaleLive({
  collectionId,
  collectionSlug,
  isOwner,
  signedIn,
}: {
  collectionId: string;
  collectionSlug: string;
  isOwner: boolean;
  signedIn: boolean;
  listings: { id: string; title: string }[];
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const scrollerRef = useRef<HTMLDivElement>(null);
  const stickToNewest = useRef(true);
  const streamRef = useRef<MediaStream | null>(null);
  const [live, setLive] = useState(false);
  const [cameraError, setCameraError] = useState("");
  const [messages, setMessages] = useState<LiveFeedMessage[]>([]);
  const [draft, setDraft] = useState("");
  const [sendError, setSendError] = useState("");
  const [publicLive, setPublicLive] = useState(false);
  const [remoteOn, setRemoteOn] = useState(false);
  const [remoteFrame, setRemoteFrame] = useState("");
  const [hearing, setHearing] = useState(false);
  const [pending, start] = useTransition();
  const playCtx = useRef<AudioContext | null>(null);
  const playAt = useRef(0);
  const voiceStop = useRef<(() => void) | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const next = await getCollectionLiveMessages(collectionId);
        if (!cancelled) setMessages(next);
      } catch {
        // Keep the last list if a refresh fails.
      }
    }
    void load();
    const timer = window.setInterval(() => void load(), 4000);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [collectionId]);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const on = await garageSaleLiveNow(collectionId);
        if (!cancelled) setPublicLive(on);
      } catch {
        // Keep the last live flag if a refresh fails.
      }
    }
    void load();
    const timer = window.setInterval(() => void load(), 3000);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [collectionId]);

  useEffect(() => {
    if (!live || !isOwner) return;
    let stopped = false;
    const beat = (announce: boolean) => {
      if (!stopped) void setGarageSaleLive(collectionId, true, announce);
    };
    beat(true);
    const timer = window.setInterval(() => beat(false), 15000);
    return () => {
      stopped = true;
      window.clearInterval(timer);
      void setGarageSaleLive(collectionId, false, true);
    };
  }, [live, isOwner, collectionId]);

  useEffect(() => {
    const el = scrollerRef.current;
    if (!el || !stickToNewest.current) return;
    el.scrollTop = 0;
  }, [messages]);

  useEffect(() => {
    if (!live || !videoRef.current || !streamRef.current) return;
    videoRef.current.srcObject = streamRef.current;
    void videoRef.current.play().catch(() => undefined);
  }, [live]);

  useEffect(() => {
    if (!live || !isOwner) return;
    let stopped = false;
    let maxWidth = 1280;
    let quality = 0.86;
    const canvas = document.createElement("canvas");
    const sendFrame = () => {
      if (stopped) return;
      const video = videoRef.current;
      if (!video || video.videoWidth < 2) {
        window.setTimeout(sendFrame, 200);
        return;
      }
      const scale = Math.min(1, maxWidth / video.videoWidth);
      canvas.width = Math.max(2, Math.round(video.videoWidth * scale));
      canvas.height = Math.max(2, Math.round(video.videoHeight * scale));
      const ctx = canvas.getContext("2d", { alpha: false });
      if (!ctx) return;
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = "high";
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      canvas.toBlob(
        (blob) => {
          if (stopped) return;
          if (!blob) {
            window.setTimeout(sendFrame, 200);
            return;
          }
          const body = new FormData();
          body.set("frame", blob, "frame.jpg");
          const started = performance.now();
          void fetch(`/api/live/${collectionId}`, { method: "POST", body })
            .then((res) => {
              if (res.ok) setCameraError("");
              else setCameraError("Other people can’t see the camera yet. Stay on this page and try again.");
            })
            .catch(() => {
              setCameraError("Other people can’t see the camera yet. Stay on this page and try again.");
            })
            .finally(() => {
              const elapsed = performance.now() - started;
              if (elapsed > 650) {
                maxWidth = Math.max(960, maxWidth - 160);
                quality = Math.max(0.74, quality - 0.04);
              } else if (elapsed < 280) {
                maxWidth = Math.min(1600, maxWidth + 80);
                quality = Math.min(0.9, quality + 0.02);
              }
              if (!stopped) window.setTimeout(sendFrame, 40);
            });
        },
        "image/jpeg",
        quality,
      );
    };
    sendFrame();
    return () => {
      stopped = true;
    };
  }, [live, isOwner, collectionId]);

  useEffect(() => {
    if (isOwner && live) {
      setRemoteOn(false);
      return;
    }
    let cancelled = false;
    const pull = async () => {
      try {
        const res = await fetch(`/api/live/${collectionId}`, { cache: "no-store" });
        if (!res.ok) return;
        const data = (await res.json()) as { live?: boolean; src?: string | null };
        if (cancelled) return;
        setRemoteOn(Boolean(data.live));
        if (data.live && data.src) {
          const probe = new Image();
          probe.onload = () => {
            if (!cancelled) setRemoteFrame(data.src || "");
          };
          probe.src = data.src;
        }
      } catch {
        // Keep the last picture if one check fails.
      }
    };
    void pull();
    const timer = window.setInterval(() => void pull(), 200);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [collectionId, isOwner, live]);

  const showRemote = remoteOn && !(isOwner && live);

  function unlockAudio() {
    if (!playCtx.current) playCtx.current = new AudioContext();
    void playCtx.current.resume();
    return playCtx.current;
  }

  useEffect(() => {
    if (isOwner || !(publicLive || remoteOn)) return;
    setHearing(true);
    unlockAudio();
    const resume = () => unlockAudio();
    window.addEventListener("pointerdown", resume);
    return () => window.removeEventListener("pointerdown", resume);
  }, [isOwner, publicLive, remoteOn]);

  useEffect(() => {
    const role = !isOwner && hearing ? "seller" : null;
    if (!role) return;
    const after = { current: Date.now() };
    let stopped = false;
    const tick = async () => {
      try {
        const res = await fetch(`/api/live/${collectionId}/audio?role=${role}&after=${after.current}`, { cache: "no-store" });
        if (stopped || res.status === 204) return;
        const seq = Number(res.headers.get("X-Audio-Seq") || 0);
        if (!seq) return;
        after.current = seq;
        const ctx = playCtx.current;
        if (!ctx) return;
        const decoded = await ctx.decodeAudioData((await res.arrayBuffer()).slice(0));
        if (stopped) return;
        const source = ctx.createBufferSource();
        source.buffer = decoded;
        source.connect(ctx.destination);
        let when = Math.max(ctx.currentTime + 0.02, playAt.current);
        if (when - ctx.currentTime > 0.8) when = ctx.currentTime + 0.02;
        source.start(when);
        playAt.current = when + decoded.duration;
      } catch {
        // Skip a clip that this browser could not play.
      }
    };
    void tick();
    const timer = window.setInterval(() => void tick(), 350);
    return () => {
      stopped = true;
      window.clearInterval(timer);
    };
  }, [collectionId, hearing, isOwner, live]);

  useEffect(() => {
    return () => {
      voiceStop.current?.();
    };
  }, []);

  useEffect(() => {
    return () => {
      streamRef.current?.getTracks().forEach((track) => track.stop());
    };
  }, []);

  async function goLive() {
    setCameraError("");
    const ctx = unlockAudio();
    if (!navigator.mediaDevices?.getUserMedia) {
      setCameraError("This phone browser can’t open the camera.");
      return;
    }
    const video = { facingMode: { ideal: "environment" }, width: { ideal: 1920 }, height: { ideal: 1080 } };
    const mic = { echoCancellation: true, noiseSuppression: true, channelCount: 1 };
    try {
      let stream: MediaStream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video, audio: mic });
      } catch {
        stream = await navigator.mediaDevices.getUserMedia({ video, audio: false });
        setCameraError("Camera is on. Allow the microphone so people can hear you.");
      }
      streamRef.current = stream;
      voiceStop.current?.();
      voiceStop.current = stream.getAudioTracks().length
        ? startVoiceUpload(ctx, stream, `/api/live/${collectionId}/audio?role=seller`)
        : null;
      setLive(true);
    } catch {
      setCameraError("Allow the camera and microphone to show your garage sale.");
    }
  }

  function stopLive() {
    voiceStop.current?.();
    voiceStop.current = null;
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
    setLive(false);
  }

  function onScroll() {
    const el = scrollerRef.current;
    if (!el) return;
    stickToNewest.current = el.scrollTop < 12;
  }

  const showingLive = publicLive || remoteOn || (isOwner && live);
  const onVideo = live || showRemote;
  const ink = { textShadow: "0 1px 6px rgba(0,0,0,0.9)" };

  const chatOnVideo = onVideo ? (
    <div className="pointer-events-none absolute bottom-4 left-4 z-10 w-[min(100%-2rem,22rem)]">
      <div className="pointer-events-auto">
        <p className="flex items-center gap-1.5 text-sm font-semibold text-white" style={ink}>
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#2563eb] opacity-75" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-[#2563eb]" />
          </span>
          Chat
        </p>
        <div ref={scrollerRef} onScroll={onScroll} className="mt-1 max-h-[6.75rem] space-y-0.5 overflow-y-auto">
          {messages.map((message) => (
            <p key={message.id} className="truncate text-sm text-white" style={ink}>
              <span className="font-semibold">{message.senderName}</span>
              {message.listingTitle ? <span className="text-white/80"> · {message.listingTitle}</span> : null}
              <span> — {message.body}</span>
            </p>
          ))}
        </div>
        {!isOwner && (
          <form
            className="mt-2 flex items-center gap-2 rounded-full border border-white/30 bg-white/20 px-3 py-1.5 shadow-lg backdrop-blur-md"
            onSubmit={(e) => {
              e.preventDefault();
              const text = draft.trim();
              if (!text || !signedIn) return;
              setSendError("");
              start(async () => {
                try {
                  await messageGarageSale(collectionId, text);
                  setDraft("");
                  stickToNewest.current = true;
                  const next = await getCollectionLiveMessages(collectionId);
                  setMessages(next);
                } catch (err) {
                  setSendError(err instanceof Error ? err.message : "Could not send.");
                }
              });
            }}
          >
            <input
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder="Ask a question"
              className="min-w-0 flex-1 bg-transparent text-sm text-white outline-none placeholder:text-white/75"
            />
            {signedIn ? (
              <button disabled={pending || !draft.trim()} className="text-sm font-semibold text-white disabled:opacity-40">
                Send
              </button>
            ) : (
              <Link href={`/login?callbackUrl=/collection/${collectionSlug}`} className="text-sm font-semibold text-white">
                Sign in
              </Link>
            )}
          </form>
        )}
        {sendError && (
          <p className="mt-1 text-xs text-white" style={ink}>
            {sendError}
          </p>
        )}
      </div>
    </div>
  ) : null;

  return (
    <div className="mt-4 space-y-3">
      {showingLive && (
        <div>
          <LiveMark />
        </div>
      )}
      {isOwner && (
        <div className="mb-3 flex flex-wrap items-center gap-2">
          {!live ? (
            <button type="button" onClick={() => void goLive()} className="rounded-full bg-clay px-4 py-2 text-sm font-semibold text-white">
              Go live
            </button>
          ) : (
            <button type="button" onClick={stopLive} className="rounded-full bg-ink px-4 py-2 text-sm font-semibold text-white">
              Stop camera
            </button>
          )}
          <p className="text-xs text-muted">
            People on a phone or computer can see and hear you while this page stays open. They type questions on the video.
          </p>
        </div>
      )}
      {cameraError && <p className="mb-2 text-sm text-clay">{cameraError}</p>}
      <div className="relative">
        {live && (
          <video
            ref={videoRef}
            playsInline
            muted
            autoPlay
            className="aspect-[3/4] max-h-[70vh] w-full rounded-[28px] bg-ink object-cover"
          />
        )}
        {showRemote && (
          remoteFrame ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={remoteFrame} alt="Live garage sale" className="aspect-[3/4] max-h-[70vh] w-full rounded-[28px] bg-ink object-cover" />
          ) : (
            <div className="flex aspect-[3/4] max-h-[70vh] w-full items-center justify-center rounded-[28px] bg-ink px-6 text-center text-sm text-white">
              Connecting to the live camera…
            </div>
          )
        )}
        {chatOnVideo}
      </div>
    </div>
  );
}
