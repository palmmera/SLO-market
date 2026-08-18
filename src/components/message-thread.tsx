"use client";

import { sendMessage } from "@/actions/listings";
import { useState, useTransition } from "react";

export function MessageThread({
  conversationId,
  messages,
  currentUserId,
}: {
  conversationId: string;
  currentUserId: string;
  messages: { id: string; body: string; senderId: string; createdAt: Date }[];
}) {
  const [body, setBody] = useState("");
  const [pending, start] = useTransition();
  return (
    <div>
      <div className="space-y-2">
        {messages.map((m) => (
          <div
            key={m.id}
            className={`max-w-[85%] rounded-2xl px-4 py-2 text-sm ${m.senderId === currentUserId ? "ml-auto bg-ocean text-white" : "bg-white card-shadow"}`}
          >
            {m.body}
          </div>
        ))}
      </div>
      <form
        className="mt-4 flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          const text = body.trim();
          if (!text) return;
          start(async () => {
            await sendMessage(conversationId, text);
            setBody("");
            location.reload();
          });
        }}
      >
        <input value={body} onChange={(e) => setBody(e.target.value)} placeholder="Write a message" className="flex-1 rounded-2xl bg-white px-4 py-3 card-shadow" />
        <button disabled={pending} className="rounded-2xl bg-ocean px-4 py-3 font-semibold text-white">
          Send
        </button>
      </form>
    </div>
  );
}
