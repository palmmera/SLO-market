export async function register() {
  if (!process.env.UPLOAD_DIR || process.env.UPLOAD_DIR.startsWith("/data")) {
    process.env.UPLOAD_DIR = "uploads";
  }

  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { purgeExpiredListingImages } = await import("@/lib/cleanup-images");
    const dayMs = 24 * 60 * 60 * 1000;

    const run = () => {
      purgeExpiredListingImages().catch((err) => {
        console.error("[cleanup-images]", err);
      });
    };

    // Once shortly after boot, then about once a day
    setTimeout(run, 60_000);
    setInterval(run, dayMs);
  }
}
