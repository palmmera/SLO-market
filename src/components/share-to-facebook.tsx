import { clsx } from "clsx";
import { Share2 } from "lucide-react";

export function ShareToFacebook({
  path,
  label = "Share on Facebook",
  className,
}: {
  path: string;
  label?: string;
  className?: string;
}) {
  function share() {
    const url = path.startsWith("http") ? path : `${window.location.origin}${path.startsWith("/") ? path : `/${path}`}`;
    const shareUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`;
    window.open(shareUrl, "facebook-share", "noopener,noreferrer,width=600,height=560");
  }

  return (
    <button
      type="button"
      onClick={share}
      className={clsx(
        "inline-flex items-center justify-center gap-2",
        className || "rounded-2xl bg-white py-3 text-sm font-medium card-shadow",
      )}
    >
      <Share2 className="h-4 w-4" />
      {label}
    </button>
  );
}
