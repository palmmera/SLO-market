import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

const protectedPaths = ["/sell", "/messages", "/favorites", "/dashboard", "/account", "/checkout", "/orders", "/notifications"];

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const needsAuth = protectedPaths.some((p) => pathname === p || pathname.startsWith(`${p}/`));
  const isAdmin = pathname === "/admin" || pathname.startsWith("/admin/");
  if (!needsAuth && !isAdmin) return NextResponse.next();

  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  if (!token) {
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(url);
  }
  if (isAdmin && token.role !== "ADMIN") {
    return NextResponse.redirect(new URL("/", req.url));
  }
  return NextResponse.next();
}

export const config = {
  matcher: [
    "/sell",
    "/sell/:path*",
    "/messages",
    "/messages/:path*",
    "/favorites",
    "/favorites/:path*",
    "/dashboard",
    "/dashboard/:path*",
    "/account",
    "/account/:path*",
    "/checkout/:path*",
    "/orders/:path*",
    "/notifications",
    "/notifications/:path*",
    "/admin",
    "/admin/:path*",
  ],
};
