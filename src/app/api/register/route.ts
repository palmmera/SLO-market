import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";

export async function POST(req: Request) {
  const form = await req.formData();
  const name = String(form.get("name") || "").trim();
  const email = String(form.get("email") || "").toLowerCase().trim();
  const password = String(form.get("password") || "");
  const acceptTerms = form.get("acceptTerms") === "on";
  if (!name || !email || password.length < 8) {
    return NextResponse.json({ error: "Please provide a name, email, and 8+ character password." }, { status: 400 });
  }
  if (!acceptTerms) {
    return NextResponse.json({ error: "Please accept the Terms of Service and Privacy Policy." }, { status: 400 });
  }
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return NextResponse.json({ error: "An account with that email already exists." }, { status: 400 });
  }
  const slo = await prisma.city.findUnique({ where: { slug: "san-luis-obispo" } });
  await prisma.user.create({
    data: {
      name,
      email,
      passwordHash: await bcrypt.hash(password, 12),
      cityId: slo?.id,
    },
  });
  return NextResponse.json({ ok: true });
}
