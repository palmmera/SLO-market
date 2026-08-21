"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { deleteConversation } from "@/actions/listings";

export function DeleteConversationButton({
  conversationId,
  label = "Delete conversation",
  className,
}: {
  conversationId: string;
  label?: string;
  className?: string;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();

  return (
    <button
      type="button"
      disabled={pending}
      className={className}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        if (!confirm("Delete this entire conversation? All messages will be removed for both of you.")) return;
        start(async () => {
          await deleteConversation(conversationId);
          router.push("/messages");
          router.refresh();
        });
      }}
    >
      {pending ? "Deleting…" : label}
    </button>
  );
}
