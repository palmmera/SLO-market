import { NextAuthOptions, getServerSession } from "next-auth";
import { PrismaAdapter } from "@auth/prisma-adapter";
import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";
import bcrypt from "bcryptjs";
import { prisma } from "./db";

const googleConfigured =
  Boolean(process.env.GOOGLE_CLIENT_ID?.trim()) && Boolean(process.env.GOOGLE_CLIENT_SECRET?.trim());

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma) as NextAuthOptions["adapter"],
  session: { strategy: "jwt" },
  pages: {
    signIn: "/login",
  },
  providers: [
    ...(googleConfigured
      ? [
          GoogleProvider({
            clientId: process.env.GOOGLE_CLIENT_ID!,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
            allowDangerousEmailAccountLinking: true,
          }),
        ]
      : []),
    CredentialsProvider({
      name: "Email",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const email = credentials?.email?.toLowerCase().trim();
        const password = credentials?.password;
        if (!email || !password) return null;
        const user = await prisma.user.findUnique({ where: { email } });
        if (!user?.passwordHash || user.isSuspended) return null;
        const ok = await bcrypt.compare(password, user.passwordHash);
        if (!ok) return null;
        await prisma.user.update({ where: { id: user.id }, data: { lastActiveAt: new Date() } }).catch(() => null);
        return {
          id: user.id,
          email: user.email,
          name: user.name,
          image: user.image,
          role: user.role,
        };
      },
    }),
  ],
  callbacks: {
    async signIn({ user, account }) {
      const email = user.email?.toLowerCase().trim();
      if (!email) return false;

      const existing = await prisma.user.findUnique({ where: { email } });
      if (existing?.isSuspended) return false;

      if (account?.provider === "google" && existing) {
        await prisma.user
          .update({
            where: { id: existing.id },
            data: {
              lastActiveAt: new Date(),
              ...(user.image && !existing.image ? { image: user.image } : {}),
              ...(user.name && existing.name === existing.email ? { name: user.name } : {}),
            },
          })
          .catch(() => null);
      }

      return true;
    },
    async jwt({ token, user, account }) {
      if (user?.id) {
        token.id = user.id;
        token.role = (user as { role?: string }).role ?? "USER";
      }

      // OAuth first sign-in: ensure id/role come from DB (adapter user may omit role)
      if (account?.provider === "google" && (user?.email || token.email)) {
        const email = (user?.email || token.email)?.toLowerCase();
        if (email) {
          const dbUser = await prisma.user.findUnique({
            where: { email },
            select: { id: true, role: true, isSuspended: true },
          });
          if (dbUser && !dbUser.isSuspended) {
            token.id = dbUser.id;
            token.role = dbUser.role;
            await prisma.user
              .update({ where: { id: dbUser.id }, data: { lastActiveAt: new Date() } })
              .catch(() => null);
          }
        }
      }

      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.role = (token.role as string) || "USER";
      }
      return session;
    },
  },
  events: {
    async createUser({ user }) {
      if (!user.id) return;
      const slo = await prisma.city.findUnique({ where: { slug: "san-luis-obispo" } });
      await prisma.user
        .update({
          where: { id: user.id },
          data: {
            ...(slo ? { cityId: slo.id } : {}),
            lastActiveAt: new Date(),
            name: user.name?.trim() || user.email?.split("@")[0] || "SLO Neighbor",
          },
        })
        .catch(() => null);
    },
  },
};

export function isGoogleAuthEnabled() {
  return googleConfigured;
}

export function getSession() {
  return getServerSession(authOptions);
}

export async function requireUser() {
  const session = await getSession();
  if (!session?.user?.id) {
    throw new Error("UNAUTHENTICATED");
  }
  return session.user;
}

export async function requireAdmin() {
  const user = await requireUser();
  if (user.role !== "ADMIN") {
    throw new Error("FORBIDDEN");
  }
  return user;
}
