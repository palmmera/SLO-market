"use server";

import crypto from "crypto";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";
import { emailConfigured, sendEmail } from "@/lib/email";

const TOKEN_TTL_MS = 60 * 60 * 1000; // 1 hour

function hashToken(raw: string) {
  return crypto.createHash("sha256").update(raw).digest("hex");
}

export async function requestPasswordReset(formData: FormData) {
  const email = String(formData.get("email") || "").toLowerCase().trim();
  // Always return the same result so we never reveal which emails have accounts.
  if (!email) return { ok: true as const };

  const user = await prisma.user.findUnique({ where: { email } });
  // Only send for credential accounts (Google users have no password to reset).
  if (user?.passwordHash && !user.isSuspended) {
    const raw = crypto.randomBytes(32).toString("hex");
    await prisma.passwordResetToken.create({
      data: {
        userId: user.id,
        tokenHash: hashToken(raw),
        expiresAt: new Date(Date.now() + TOKEN_TTL_MS),
      },
    });
    if (emailConfigured()) {
      await sendEmail({
        to: user.email,
        subject: "Reset your SLO Market password",
        heading: "Reset your password",
        body: "We received a request to reset your SLO Market password. This link expires in 1 hour. If you didn't request this, you can safely ignore this email.",
        link: `/reset-password?token=${raw}`,
        linkLabel: "Reset password",
      });
    }
  }

  return { ok: true as const };
}

export async function resetPassword(formData: FormData) {
  const token = String(formData.get("token") || "").trim();
  const password = String(formData.get("password") || "");
  if (!token) return { ok: false as const, error: "This reset link is invalid or has expired." };
  if (password.length < 8) return { ok: false as const, error: "Password must be at least 8 characters." };

  const record = await prisma.passwordResetToken.findUnique({ where: { tokenHash: hashToken(token) } });
  if (!record || record.usedAt || record.expiresAt < new Date()) {
    return { ok: false as const, error: "This reset link is invalid or has expired." };
  }

  await prisma.user.update({
    where: { id: record.userId },
    data: { passwordHash: await bcrypt.hash(password, 12) },
  });
  await prisma.passwordResetToken.update({ where: { id: record.id }, data: { usedAt: new Date() } });
  // Invalidate any other outstanding reset tokens for this user.
  await prisma.passwordResetToken.deleteMany({ where: { userId: record.userId, usedAt: null } });

  return { ok: true as const };
}
