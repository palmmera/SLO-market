import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { MessageThread } from "@/components/message-thread";
import { DeleteConversationButton } from "@/components/delete-conversation-button";

export default async function ConversationPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session?.user?.id) redirect("/login");
  const conversation = await prisma.conversation.findUnique({
    where: { id: (await params).id },
    include: {
      listing: true,
      order: true,
      buyer: true,
      seller: true,
      messages: { orderBy: { createdAt: "asc" }, include: { sender: true } },
    },
  });
  if (!conversation || (conversation.buyerId !== session.user.id && conversation.sellerId !== session.user.id)) {
    notFound();
  }
  await prisma.message.updateMany({
    where: { conversationId: conversation.id, senderId: { not: session.user.id }, readAt: null },
    data: { readAt: new Date() },
  });
  const other = conversation.buyerId === session.user.id ? conversation.seller : conversation.buyer;

  return (
    <div className="mx-auto max-w-2xl px-4 py-6">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <Link href="/messages" className="text-sm font-semibold text-ocean">
            ← Messages
          </Link>
          <h1 className="mt-2 truncate font-display text-3xl">{other.name}</h1>
        </div>
        <DeleteConversationButton
          conversationId={conversation.id}
          className="shrink-0 rounded-full bg-clay/10 px-3 py-1.5 text-xs font-semibold text-clay disabled:opacity-60"
        />
      </div>
      {conversation.listing && (
        <Link href={`/listing/${conversation.listing.slug}`} className="mb-4 block rounded-2xl bg-white p-3 text-sm card-shadow">
          Listing: {conversation.listing.title}
        </Link>
      )}
      {conversation.order && (
        <Link href={`/orders/${conversation.order.id}`} className="mb-4 block rounded-2xl bg-white p-3 text-sm card-shadow">
          Order: {conversation.order.orderNumber}
        </Link>
      )}
      <MessageThread
        conversationId={conversation.id}
        currentUserId={session.user.id}
        messages={conversation.messages}
      />
    </div>
  );
}
