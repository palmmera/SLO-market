"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { garageSaleLiveNow, getCollectionLiveMessages, setGarageSaleLive, type LiveFeedMessage } from "@/actions/live-feed";
import { startMessage } from "@/actions/listings";
import { LiveMark } from "@/components/listing-card";

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
  const [listingId, setListingId] = useState(listings[0]?.id || "");
  const [sendError, setSendError] = useState("");
  const [publicLive, setPublicLive] = useState(false);
  const [pending, start] = useTransition();

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
    const timer = window.setInterval(() => void load(), 10000);
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
    return () => {
      streamRef.current?.getTracks().forEach((track) => track.stop());
    };
  }, []);

  async function goLive() {
    setCameraError("");
    if (!navigator.mediaDevices?.getUserMedia) {
      setCameraError("This phone browser can’t open the camera.");
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: "environment" } },
        audio: false,
      });
      streamRef.current = stream;
      setLive(true);
    } catch {
      setCameraError("Allow the camera to show your garage sale.");
    }
  }

  function stopLive() {
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
        <p className={`text-xs font-semibold ${live ? "text-white/80" : "text-muted"}`}>Messages · newest first</p>
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
      {!isOwner && (
        <form
          className="mt-2 flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            const text = draft.trim();
            if (!text || !listingId) return;
            setSendError("");
            start(async () => {
              try {
                await startMessage(listingId, text);
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
          {listings.length > 1 && (
            <select
              value={listingId}
              onChange={(e) => setListingId(e.target.value)}
              className="max-w-[40%] rounded-xl bg-white px-2 py-2 text-xs text-ink"
            >
              {listings.map((listing) => (
                <option key={listing.id} value={listing.id}>
                  {listing.title}
                </option>
              ))}
            </select>
          )}
          {signedIn && listings.length > 0 ? (
            <>
              <input
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                placeholder="Message the seller"
                className="min-w-0 flex-1 rounded-xl bg-white px-3 py-2 text-sm text-ink"
              />
              <button disabled={pending || !draft.trim()} className="rounded-xl bg-ocean px-3 py-2 text-sm font-semibold text-white disabled:opacity-50">
                Send
              </button>
            </>
          ) : signedIn ? (
            <p className={`px-1 text-xs ${live ? "text-white/80" : "text-muted"}`}>The seller hasn’t tagged an item yet.</p>
          ) : (
            <Link href={`/login?callbackUrl=/collection/${collectionSlug}`} className="text-sm font-semibold text-ocean">
              Sign in to message
            </Link>
          )}
        </form>
      )}
      {sendError && <p className="mt-1 text-xs text-clay">{sendError}</p>}
    </div>
  );

  const showingLive = publicLive || (isOwner && live);

  return (
    <div className="mt-4">
      {showingLive && (
        <div className="mb-3">
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
          <p className="text-xs text-muted">Your camera stays on this phone. Buyer messages roll over it, newest first.</p>
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
        <div className={live ? "absolute inset-x-3 bottom-3" : ""}>{feed}</div>
      </div>
    </div>
  );
}
