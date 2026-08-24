export function FoodSellerBadge({ className = "" }: { className?: string }) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full bg-ocean-light px-2.5 py-1 text-xs font-semibold text-ocean-dark ${className}`}
    >
      ✓ Local Food Seller
    </span>
  );
}
