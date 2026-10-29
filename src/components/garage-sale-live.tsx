"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { garageSaleLiveNow, getCollectionLiveMessages, messageGarageSale, setGarageSaleLive, type LiveFeedMessage } from "@/actions/live-feed";
import { LiveMark } from "@/components/listing-card";
import { startVoiceUpload } from "@/lib/live-voice";

const VISIBLE_ROWS = 3;

export function GarageSaleLive({
  collectionId,
  collectionSlug,
  isOwner,
  signedIn,
  listings,
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
  const [listingId, setListingId] = useState("");
  const [sendError, setSendError] = useState("");
  const [publicLive, setPublicLive] = useState(false);
  const [remoteOn, setRemoteOn] = useState(false);
  const [remoteFrame, setRemoteFrame] = useState("");
  const [hearing, setHearing] = useState(false);
  const [talking, setTalking] = useState(false);
  const [voiceError, setVoiceError] = useState("");
  const [pending, start] = useTransition();
  const playCtx = useRef<AudioContext | null>(null);
  const playAt = useRef(0);
  const voiceStop = useRef<(() => void) | null>(null);
  const talkStop = useRef<(() => void) | null>(null);
  const talkStream = useRef<MediaStream | null>(null);

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
    const role = isOwner ? (live ? "buyer" : null) : hearing ? "seller" : null;
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
      talkStop.current?.();
      talkStream.current?.getTracks().forEach((track) => track.stop());
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

  async function beginTalk() {
    if (talkStream.current) return;
    setVoiceError("");
    unlockAudio();
    setHearing(true);
    if (!navigator.mediaDevices?.getUserMedia) {
      setVoiceError("This browser can’t use the microphone.");
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, channelCount: 1 },
        video: false,
      });
      talkStream.current = stream;
      talkStop.current = startVoiceUpload(unlockAudio(), stream, `/api/live/${collectionId}/audio?role=buyer`);
      setTalking(true);
    } catch {
      setVoiceError("Allow the microphone to talk to the seller.");
    }
  }

  function endTalk() {
    talkStop.current?.();
    talkStop.current = null;
    talkStream.current?.getTracks().forEach((track) => track.stop());
    talkStream.current = null;
    setTalking(false);
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

  const feed = (
    <div className={live ? "rounded-2xl bg-black/55 p-2 text-white backdrop-blur-sm" : "rounded-3xl bg-white p-3 card-shadow"}>
      <div className="mb-1 flex items-center justify-between gap-2 px-1">
        <p className={`flex items-center gap-1.5 text-xs font-semibold ${live ? "text-white/80" : "text-muted"}`}>
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#2563eb] opacity-75" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-[#2563eb]" />
          </span>
          Chat
        </p>
        {messages.length > VISIBLE_ROWS && (
          <p className={`text-[11px] ${live ? "text-white/70" : "text-muted"}`}>Scroll for older</p>
        )}
      </div>
        <div ref={scrollerRef} onScroll={onScroll} className="max-h-[6.75rem] space-y-1 overflow-y-auto pr-1">
        {messages.length === 0 && (
          <p className={`px-1 py-2 text-sm ${live ? "text-white/80" : "text-muted"}`}>
            Buyer messages show here, three at a time.
          </p>
        )}
        {messages.map((message) => (
          <div key={message.id} className={`truncate rounded-xl px-3 py-1.5 text-sm ${live ? "bg-white/10" : "bg-sand"}`}>
            <span className="font-semibold">{message.senderName}</span>
            {message.listingTitle ? (
              <span className={live ? "text-white/70" : "text-muted"}> · {message.listingTitle}</span>
            ) : null}
            <span className={live ? "text-white/90" : ""}> — {message.body}</span>
          </div>
        ))}
      </div>
    </div>
  );

  const showingLive = publicLive || remoteOn || (isOwner && live);

  const composer = (
    <form
      className="rounded-3xl bg-white p-3 card-shadow"
      onSubmit={(e) => {
        e.preventDefault();
        const text = draft.trim();
        if (!text) return;
        if (!signedIn) return;
        setSendError("");
        start(async () => {
          try {
            await messageGarageSale(collectionId, text, listingId || undefined);
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
      <label htmlFor="sale-message" className="mb-2 block text-sm font-semibold">
        Message the seller
      </label>
      <div className="flex gap-2">
        {listings.length > 0 && (
          <select
            value={listingId}
            onChange={(e) => setListingId(e.target.value)}
            aria-label="What this message is about"
            className="max-w-[40%] rounded-xl bg-sand px-2 py-3 text-sm text-ink"
          >
            <option value="">This sale</option>
            {listings.map((listing) => (
              <option key={listing.id} value={listing.id}>
                {listing.title}
              </option>
            ))}
          </select>
        )}
        <input
          id="sale-message"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Type a message"
          className="min-w-0 flex-1 rounded-xl bg-sand px-3 py-3 text-sm text-ink"
        />
        {signedIn ? (
          <button disabled={pending || !draft.trim()} className="rounded-xl bg-ocean px-4 py-3 text-sm font-semibold text-white disabled:opacity-50">
            Send
          </button>
        ) : (
          <Link href={`/login?callbackUrl=/collection/${collectionSlug}`} className="rounded-xl bg-ocean px-4 py-3 text-sm font-semibold text-white">
            Sign in
          </Link>
        )}
      </div>
      {sendError && <p className="mt-2 text-xs text-clay">{sendError}</p>}
      {!isOwner && showingLive && (
        <div className="mt-3 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => {
              unlockAudio();
              setHearing(true);
            }}
            className={`rounded-full px-4 py-2 text-sm font-semibold ${hearing ? "bg-ocean text-white" : "bg-sand text-ink"}`}
          >
            {hearing ? "Listening" : "Hear the seller"}
          </button>
          <button
            type="button"
            onContextMenu={(e) => e.preventDefault()}
            onPointerDown={(e) => {
              e.currentTarget.setPointerCapture(e.pointerId);
              void beginTalk();
            }}
            onPointerUp={endTalk}
            onPointerCancel={endTalk}
            className={`touch-none rounded-full px-4 py-2 text-sm font-semibold text-white ${talking ? "bg-clay" : "bg-ink"}`}
          >
            {talking ? "Talking…" : "Hold to talk"}
          </button>
        </div>
      )}
      {voiceError && <p className="mt-2 text-xs text-clay">{voiceError}</p>}
    </form>
  );

  return (
    <div className="mt-4 space-y-3">
      {composer}
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
            People on a phone or computer can see and hear you while this page stays open. Their voice plays here when they hold Talk.
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
        <div className={live || showRemote ? "absolute inset-x-3 bottom-3" : ""}>{feed}</div>
      </div>
    </div>
  );
}
