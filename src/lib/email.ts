import { absoluteUrl } from "@/lib/utils";
import { BRAND } from "@/lib/constants";

/**
 * Transactional email sender.
 *
 * Uses Resend's REST API (no extra dependency) when configured. If the required
 * environment variables are missing, every send is a safe no-op that returns
 * false — the app keeps working with in-app notifications only, exactly like the
 * Stripe integration degrades gracefully when unconfigured.
 *
 * Required env vars to enable email:
 *   RESEND_API_KEY   – API key from https://resend.com
 *   EMAIL_FROM       – verified sender, e.g. "SLO Market <hello@slomarketplace.com>"
 */

export type SendEmailInput = {
  to: string;
  subject: string;
  heading?: string;
  body: string;
  link?: string;
  linkLabel?: string;
};

export function emailConfigured() {
  return Boolean(process.env.RESEND_API_KEY?.trim() && process.env.EMAIL_FROM?.trim());
}

function renderHtml({ heading, body, link, linkLabel }: SendEmailInput) {
  const url = link ? absoluteUrl(link) : null;
  const button = url
    ? `<a href="${url}" style="display:inline-block;margin-top:20px;padding:12px 22px;background:#0f6f74;color:#ffffff;text-decoration:none;border-radius:9999px;font-weight:600;font-size:14px;">${linkLabel || "Open SLO Market"}</a>`
    : "";
  return `<!doctype html>
<html>
  <body style="margin:0;background:#f3ede2;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#1f2421;">
    <div style="max-width:520px;margin:0 auto;padding:24px;">
      <div style="font-size:20px;font-weight:700;letter-spacing:0.02em;color:#0f6f74;">${BRAND.name}</div>
      <div style="font-size:11px;text-transform:uppercase;letter-spacing:0.18em;color:#7a7a72;margin-bottom:20px;">${BRAND.county}</div>
      <div style="background:#ffffff;border-radius:20px;padding:24px;box-shadow:0 1px 3px rgba(0,0,0,0.08);">
        ${heading ? `<h1 style="margin:0 0 12px;font-size:20px;">${heading}</h1>` : ""}
        <p style="margin:0;font-size:15px;line-height:1.6;color:#3a3f3a;white-space:pre-wrap;">${body}</p>
        ${button}
      </div>
      <p style="margin:20px 0 0;font-size:12px;color:#9a9a90;line-height:1.5;">
        You're receiving this because you have an account on ${BRAND.short}. ${BRAND.tagline}
      </p>
    </div>
  </body>
</html>`;
}

export async function sendEmail(input: SendEmailInput): Promise<boolean> {
  if (!emailConfigured()) return false;
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.RESEND_API_KEY!.trim()}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: process.env.EMAIL_FROM!.trim(),
        to: input.to,
        subject: input.subject,
        html: renderHtml(input),
        text: `${input.heading ? `${input.heading}\n\n` : ""}${input.body}${input.link ? `\n\n${absoluteUrl(input.link)}` : ""}`,
      }),
    });
    if (!res.ok) {
      console.error("Email send failed:", res.status, await res.text().catch(() => ""));
      return false;
    }
    return true;
  } catch (err) {
    console.error("Email send error:", err);
    return false;
  }
}
