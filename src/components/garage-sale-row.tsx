"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { removePhotoCollection } from "@/actions/hotspots";

export type GarageSaleRowData = {
  id: string;
  slug: string;
  title: string;
  itemCount: number;
  imageId: string | null;
  imageUrl: string | null;
  categoryId: string | null;
};

export function GarageSaleRow({ sale }: { sale: GarageSaleRowData }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const editQs = new URLSearchParams();
  if (sale.imageId) editQs.set("image", sale.imageId);
  if (sale.categoryId) editQs.set("category", sale.categoryId);
  const editHref = `/sell/photo/${sale.id}?${editQs.toString()}`;

  return (
    <div className="flex items-center gap-3 rounded-2xl bg-white p-3 card-shadow">
      <Link href={`/collection/${sale.slug}`} className="shrink-0 overflow-hidden rounded-xl bg-sand-dark">
        {sale.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={sale.imageUrl} alt={sale.title} className="h-16 w-16 object-cover" />
        ) : (
          <div className="flex h-16 w-16 items-center justify-center text-[10px] text-muted">No photo</div>
        )}
      </Link>
      <div className="min-w-0 flex-1">
        <Link href={`/collection/${sale.slug}`} className="block truncate font-semibold hover:underline">
          {sale.title}
        </Link>
        <p className="mt-0.5 text-sm text-muted">
          Garage sale · {sale.itemCount} item{sale.itemCount === 1 ? "" : "s"}
        </p>
        <p className="mt-0.5 text-xs text-ocean">Edit opens the photo — add or remove tagged items</p>
      </div>
      <div className="flex shrink-0 flex-col gap-2 sm:flex-row">
        <Link href={editHref} className="rounded-full bg-sand px-3 py-1.5 text-center text-xs font-semibold text-ink">
          Edit
        </Link>
        <button
          type="button"
          disabled={pending}
          onClick={() => {
            if (!confirm(`Remove “${sale.title}” and all of its tagged items?`)) return;
            start(async () => {
              await removePhotoCollection(sale.id);
              router.refresh();
            });
          }}
          className="rounded-full bg-clay/10 px-3 py-1.5 text-xs font-semibold text-clay disabled:opacity-60"
        >
          {pending ? "Removing…" : "Delete"}
        </button>
      </div>
    </div>
  );
}
