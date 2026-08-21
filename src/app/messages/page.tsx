import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { DeleteConversationButton } from "@/components/delete-conversation-button";

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
            <div key={c.id} className="flex items-stretch gap-2 rounded-2xl bg-white p-4 card-shadow">
              <Link href={`/messages/${c.id}`} className="min-w-0 flex-1">
                <div className="font-semibold">{other.name}</div>
                <div className="text-sm text-muted">{c.listing?.title}</div>
                <div className="mt-1 line-clamp-1 text-sm">{c.messages[0]?.body}</div>
              </Link>
              <DeleteConversationButton
                conversationId={c.id}
                label="Delete"
                className="shrink-0 self-center rounded-full bg-clay/10 px-3 py-1.5 text-xs font-semibold text-clay disabled:opacity-60"
              />
            </div>
          );
        })}
        {conversations.length === 0 && <p className="text-sm text-muted">No messages yet.</p>}
      </div>
    </div>
  );
}
