"use client";

import { useEffect, useRef } from "react";

export function DragExploreVideo({
  src,
  poster,
  className = "",
  jumpTo,
  onTimeChange,
  onReady,
  onTap,
}: {
  src: string;
  poster?: string | null;
  className?: string;
  jumpTo?: number | null;
  onTimeChange?: (time: number, duration: number) => void;
  onReady?: (duration: number) => void;
  onTap?: (e: React.PointerEvent<HTMLVideoElement>) => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const drag = useRef<{
    pointerId: number;
    startX: number;
    startY: number;
    startTime: number;
    axis: "undecided" | "x" | "y";
  } | null>(null);

  useEffect(() => {
    videoRef.current?.pause();
  }, [src]);

  function seekTo(time: number) {
    const el = videoRef.current;
    if (!el || !Number.isFinite(el.duration) || el.duration <= 0) return;
    const next = Math.min(el.duration, Math.max(0, time));
    el.pause();
    el.currentTime = next;
    onTimeChange?.(next, el.duration);
  }

  useEffect(() => {
    if (jumpTo == null) return;
    seekTo(jumpTo);
    // seekTo reads the current video element; jumpTo is the trigger.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [jumpTo]);

  function onPointerDown(e: React.PointerEvent<HTMLVideoElement>) {
    const el = videoRef.current;
    if (!el) return;
    drag.current = {
      pointerId: e.pointerId,
      startX: e.clientX,
      startY: e.clientY,
      startTime: el.currentTime || 0,
      axis: "undecided",
    };
  }

  function onPointerMove(e: React.PointerEvent<HTMLVideoElement>) {
    const state = drag.current;
    const el = videoRef.current;
    if (!state || !el || e.pointerId !== state.pointerId) return;
    const dx = e.clientX - state.startX;
    const dy = e.clientY - state.startY;
    if (state.axis === "undecided") {
      if (Math.hypot(dx, dy) < 10) return;
      state.axis = Math.abs(dx) >= Math.abs(dy) ? "x" : "y";
      if (state.axis === "x") {
        el.setPointerCapture(e.pointerId);
      } else {
        drag.current = null;
        return;
      }
    }
    if (state.axis !== "x") return;
    e.preventDefault();
    const width = Math.max(el.clientWidth, 1);
    seekTo(state.startTime + (dx / width) * (el.duration || 0));
  }

  function onPointerUp(e: React.PointerEvent<HTMLVideoElement>) {
    const el = videoRef.current;
    const state = drag.current;
    if (!state || state.pointerId !== e.pointerId) return;
    const dx = e.clientX - state.startX;
    const dy = e.clientY - state.startY;
    const wasTap = state.axis === "undecided" && Math.hypot(dx, dy) < 10;
    el?.pause();
    if (el?.hasPointerCapture(e.pointerId)) el.releasePointerCapture(e.pointerId);
    drag.current = null;
    if (wasTap) onTap?.(e);
  }

  return (
    <video
      ref={videoRef}
      src={src}
      poster={poster || undefined}
      muted
      playsInline
      preload="auto"
      disablePictureInPicture
      controls={false}
      draggable={false}
      className={`h-full w-full cursor-ew-resize object-contain select-none ${className}`}
      style={{ touchAction: "pan-y" }}
      onLoadedMetadata={(e) => {
        const el = e.currentTarget;
        el.pause();
        const start = jumpTo != null && Number.isFinite(jumpTo) ? jumpTo : el.duration / 2;
        el.currentTime = Math.min(el.duration, Math.max(0, start));
        onReady?.(el.duration);
        onTimeChange?.(el.currentTime, el.duration);
      }}
      onSeeked={(e) => {
        e.currentTarget.pause();
      }}
      onPlay={(e) => {
        e.currentTarget.pause();
      }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
    />
  );
}
