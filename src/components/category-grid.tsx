import Link from "next/link";
import {
  Apple,
  Baby,
  Bike,
  Box,
  Briefcase,
  Car,
  Flower2,
  Gift,
  Guitar,
  Home,
  Shirt,
  Smartphone,
  Sofa,
  Wrench,
} from "lucide-react";

const iconMap: Record<string, typeof Home> = {
  sofa: Sofa,
  wrench: Wrench,
  smartphone: Smartphone,
  car: Car,
  shirt: Shirt,
  baby: Baby,
  dumbbell: Bike,
  music: Guitar,
  flower: Flower2,
  apple: Apple,
  briefcase: Briefcase,
  gift: Gift,
  box: Box,
};

export function CategoryGrid({
  categories,
}: {
  categories: { id: string; name: string; slug: string; icon: string | null }[];
}) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
      {categories.map((cat) => {
        const Icon = (cat.icon && iconMap[cat.icon]) || Home;
        return (
          <Link key={cat.id} href={`/${cat.slug}`} className="flex items-center gap-3 rounded-2xl bg-white p-3 card-shadow">
            <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-ocean-light text-ocean">
              <Icon className="h-5 w-5" />
            </span>
            <span className="text-sm font-medium leading-tight">{cat.name}</span>
          </Link>
        );
      })}
    </div>
  );
}
