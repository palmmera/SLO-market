import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";

export default async function MessagesPage() {
  const session = await getSession();
  if (!session?.user?.id) redirect("/login");
  const conversations = await prisma.conversation.findMany({
    where: { OR: [{ buyerId: session.user.id }, { sellerId: session.user.id }] },
    include: {
      listing: { include: { images: { take: 1 } } },
      buyer: true,
      seller: true,
      messages: { orderBy: { createdAt: "desc" }, take: 1 },
    },
    orderBy: { lastMessageAt: "desc" },
  });
  return (
    <div className="mx-auto max-w-2xl px-4 py-6">
      <h1 className="font-display text-4xl">Messages</h1>
      <div className="mt-4 grid gap-2">
        {conversations.map((c) => {
          const other = c.buyerId === session.user.id ? c.seller : c.buyer;
          return (
            <Link key={c.id} href={`/messages/${c.id}`} className="rounded-2xl bg-white p-4 card-shadow">
              <div className="font-semibold">{other.name}</div>
              <div className="text-sm text-muted">{c.listing?.title}</div>
              <div className="mt-1 line-clamp-1 text-sm">{c.messages[0]?.body}</div>
            </Link>
          );
        })}
        {conversations.length === 0 && <p className="text-sm text-muted">No messages yet.</p>}
      </div>
    </div>
  );
}
