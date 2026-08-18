import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { MessageThread } from "@/components/message-thread";

export default async function ConversationPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session?.user?.id) redirect("/login");
  const conversation = await prisma.conversation.findUnique({
    where: { id: (await params).id },
    include: { listing: true, order: true, messages: { orderBy: { createdAt: "asc" }, include: { sender: true } } },
  });
  if (!conversation || (conversation.buyerId !== session.user.id && conversation.sellerId !== session.user.id)) notFound();
  await prisma.message.updateMany({
    where: { conversationId: conversation.id, senderId: { not: session.user.id }, readAt: null },
    data: { readAt: new Date() },
  });
  return (
    <div className="mx-auto max-w-2xl px-4 py-6">
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
