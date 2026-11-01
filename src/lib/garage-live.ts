/** Flip this back to true when LiveKit (or another stream) is ready. Live code stays in the repo. */
export const LIVE_GARAGE_ENABLED = false;

/** A sale stays live while the seller's phone keeps the camera heartbeat inside this window. */
export const GARAGE_LIVE_WINDOW_MS = 45_000;

export function garageSaleIsLive(liveAt: Date | string | null | undefined) {
  if (!LIVE_GARAGE_ENABLED) return false;
  if (!liveAt) return false;
  const time = new Date(liveAt).getTime();
  return Number.isFinite(time) && Date.now() - time < GARAGE_LIVE_WINDOW_MS;
}
