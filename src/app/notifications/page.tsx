import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import Link from "next/link";

export default async function NotificationsPage() {
  const session = await getSession();
  if (!session?.user?.id) redirect("/login");
  const notes = await prisma.notification.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: "desc" },
    take: 80,
  });
  await prisma.notification.updateMany({ where: { userId: session.user.id, readAt: null }, data: { readAt: new Date() } });
  return (
    <div className="mx-auto max-w-xl px-4 py-6">
      <h1 className="font-display text-4xl">Notifications</h1>
      <p className="mt-2 text-sm text-muted">Email and in-app alerts. Push notifications can be added later without changing this structure.</p>
      <div className="mt-4 grid gap-2">
        {notes.map((n) => (
          <Link key={n.id} href={n.link || "/"} className="rounded-2xl bg-white p-4 card-shadow">
            <div className="font-semibold">{n.title}</div>
            <div className="text-sm text-muted">{n.body}</div>
          </Link>
        ))}
        {notes.length === 0 && <p className="text-sm text-muted">No notifications yet.</p>}
      </div>
    </div>
  );
}
