/** A sale stays live while the seller's phone keeps the camera heartbeat inside this window. */
export const GARAGE_LIVE_WINDOW_MS = 45_000;

export function garageSaleIsLive(liveAt: Date | string | null | undefined) {
  if (!liveAt) return false;
  const time = new Date(liveAt).getTime();
  return Number.isFinite(time) && Date.now() - time < GARAGE_LIVE_WINDOW_MS;
}
