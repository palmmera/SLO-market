"use server";

import { prisma } from "@/lib/db";

export type ContactResult = { ok: true } | { ok: false; error: string };

export async function submitContactMessage(formData: FormData): Promise<ContactResult> {
  const name = String(formData.get("name") || "").trim();
  const email = String(formData.get("email") || "").trim();
  const subject = String(formData.get("subject") || "").trim();
  const body = String(formData.get("body") || "").trim();

  if (!name || name.length < 2) {
    return { ok: false, error: "Please enter your name." };
  }
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { ok: false, error: "Please enter a valid email." };
  }
  if (!body || body.length < 10) {
    return { ok: false, error: "Please write a message (at least a few sentences)." };
  }
  if (body.length > 5000) {
    return { ok: false, error: "Message is too long." };
  }

  await prisma.contactMessage.create({
    data: {
      name: name.slice(0, 120),
      email: email.slice(0, 200),
      subject: subject ? subject.slice(0, 200) : null,
      body: body.slice(0, 5000),
    },
  });

  return { ok: true };
}
