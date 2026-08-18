import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { ListingGrid } from "@/components/listing-card";
import { initials } from "@/lib/utils";
import { ListingStatus } from "@prisma/client";
import { reportContent } from "@/actions/listings";

export default async function PublicProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const user = await prisma.user.findUnique({
    where: { id: (await params).id },
    include: {
      city: true,
      reviewsReceived: { where: { isHidden: false }, include: { reviewer: true } },
      listings: {
        where: { status: ListingStatus.ACTIVE },
        include: { city: true, images: { take: 1, orderBy: { sortOrder: "asc" } } },
      },
    },
  });
  if (!user) notFound();
  const sold = await prisma.listing.count({ where: { sellerId: user.id, status: ListingStatus.SOLD } });
  const avg =
    user.reviewsReceived.length === 0
      ? null
      : user.reviewsReceived.reduce((s, r) => s + r.rating, 0) / user.reviewsReceived.length;

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <div className="flex items-center gap-4">
        <div className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-full bg-ocean-light text-xl font-semibold">
          {user.image ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={user.image} alt="" className="h-full w-full object-cover" />
          ) : (
            initials(user.name)
          )}
        </div>
        <div>
          <h1 className="font-display text-3xl">{user.name}</h1>
          <p className="text-sm text-muted">
            {user.city?.name} · Member since {user.createdAt.getFullYear()}
            {avg ? ` · ${avg.toFixed(1)}★ (${user.reviewsReceived.length})` : ""}
          </p>
          <p className="text-sm text-muted">
            {user.listings.length} active · {sold} sold
          </p>
        </div>
      </div>
      {user.bio && <p className="mt-4 text-sm">{user.bio}</p>}
      <form action={reportContent} className="mt-4 flex flex-wrap gap-2 text-sm">
        <input type="hidden" name="targetType" value="USER" />
        <input type="hidden" name="userId" value={user.id} />
        <input type="hidden" name="reason" value="INAPPROPRIATE" />
        <button className="rounded-full bg-white px-3 py-1.5 card-shadow">Report User</button>
      </form>
      <h2 className="mt-8 font-display text-2xl">Active listings</h2>
      <div className="mt-4">
        <ListingGrid listings={user.listings} />
      </div>
      <h2 className="mt-8 font-display text-2xl">Reviews</h2>
      <div className="mt-3 grid gap-2">
        {user.reviewsReceived.map((r) => (
          <div key={r.id} className="rounded-2xl bg-white p-4 text-sm card-shadow">
            {r.rating}★ · {r.reviewer.name}
            {r.body ? ` — ${r.body}` : ""}
            <form action={reportContent} className="mt-2">
              <input type="hidden" name="targetType" value="REVIEW" />
              <input type="hidden" name="reviewId" value={r.id} />
              <input type="hidden" name="reason" value="INAPPROPRIATE" />
              <button className="text-xs text-muted">Report review</button>
            </form>
          </div>
        ))}
      </div>
    </div>
  );
}
