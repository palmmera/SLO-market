import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { updateProfile } from "@/actions/profile";
import { initials } from "@/lib/utils";
import { LogoutButton } from "@/components/logout-button";

export default async function ProfilePage() {
  const session = await getSession();
  if (!session?.user?.id) redirect("/login?callbackUrl=/profile");
  const [user, cities, listings, purchases, sales] = await Promise.all([
    prisma.user.findUnique({
      where: { id: session.user.id },
      include: { city: true, stripeAccount: true, reviewsReceived: { where: { isHidden: false } } },
    }),
    prisma.city.findMany({ where: { isActive: true }, orderBy: { sortOrder: "asc" } }),
    prisma.listing.findMany({ where: { sellerId: session.user.id }, orderBy: { createdAt: "desc" }, take: 12 }),
    prisma.order.count({ where: { buyerId: session.user.id } }),
    prisma.order.count({ where: { sellerId: session.user.id } }),
  ]);
  if (!user) redirect("/login");
  const avg =
    user.reviewsReceived.length === 0
      ? null
      : user.reviewsReceived.reduce((s, r) => s + r.rating, 0) / user.reviewsReceived.length;

  return (
    <div className="mx-auto max-w-xl px-4 py-6">
      <div className="flex items-center gap-4">
        <div className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-full bg-ocean-light text-xl font-semibold text-ocean">
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
            {avg ? ` · ${avg.toFixed(1)}★` : ""}
          </p>
        </div>
      </div>
      <div className="mt-5 grid grid-cols-2 gap-2 text-sm">
        <Link href="/dashboard" className="rounded-2xl bg-white p-3 card-shadow">View sales</Link>
        <Link href="/account" className="rounded-2xl bg-white p-3 card-shadow">View purchases</Link>
        <Link href="/favorites" className="rounded-2xl bg-white p-3 card-shadow">View favorites</Link>
        <Link href="/dashboard/stripe" className="rounded-2xl bg-white p-3 card-shadow">Manage Stripe</Link>
        <Link href="/notifications" className="rounded-2xl bg-white p-3 card-shadow">Manage notifications</Link>
        <Link href={`/u/${user.id}`} className="rounded-2xl bg-white p-3 card-shadow">Public profile</Link>
      </div>
      <form action={updateProfile} className="mt-6 space-y-3 rounded-3xl bg-white p-5 card-shadow">
        <h2 className="font-semibold">Edit profile</h2>
        <input name="name" defaultValue={user.name} className="w-full rounded-2xl bg-sand px-4 py-3" />
        <select name="cityId" defaultValue={user.cityId ?? ""} className="w-full rounded-2xl bg-sand px-4 py-3">
          {cities.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
        <textarea name="bio" defaultValue={user.bio ?? ""} placeholder="Short bio" className="w-full rounded-2xl bg-sand px-4 py-3" />
        <input name="photo" type="file" accept="image/*" />
        <button className="w-full rounded-2xl bg-ocean py-3 font-semibold text-white">Save</button>
      </form>
      <p className="mt-4 text-sm text-muted">
        {listings.length} listings · {purchases} purchases · {sales} sales
      </p>
      {session.user.role === "ADMIN" && (
        <Link href="/admin" className="mt-4 block text-sm font-semibold text-ocean">
          Admin dashboard
        </Link>
      )}
      <LogoutButton />
    </div>
  );
}
