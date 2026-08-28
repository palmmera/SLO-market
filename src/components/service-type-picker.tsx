"use client";

import { Camera, GraduationCap, Home, Leaf, MoreHorizontal, PawPrint, Sparkles, Truck, Wrench } from "lucide-react";

const ORDER = [
  "home-services",
  "cleaning-services",
  "handyman",
  "other-services",
  "tutoring",
  "photography",
  "pet-services",
  "yard-services",
  "moving-services",
];

const ICONS: Record<string, typeof Home> = {
  "home-services": Home,
  "cleaning-services": Sparkles,
  handyman: Wrench,
  "other-services": MoreHorizontal,
  tutoring: GraduationCap,
  photography: Camera,
  "pet-services": PawPrint,
  "yard-services": Leaf,
  "moving-services": Truck,
};

type Option = { id: string; name: string; slug: string };

export function ServiceTypePicker({
  options,
  value,
  onChange,
}: {
  options: Option[];
  value: string;
  onChange: (id: string) => void;
}) {
  const sorted = [...options].sort((a, b) => {
    const ai = ORDER.indexOf(a.slug);
    const bi = ORDER.indexOf(b.slug);
    return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi);
  });

  return (
    <div>
      <p className="mt-1 text-sm text-muted">What kind of service are you offering?</p>
      <div className="mt-3 grid grid-cols-2 gap-2">
        {sorted.map((opt) => {
          const Icon = ICONS[opt.slug] || Wrench;
          const selected = value === opt.id;
          return (
            <button
              key={opt.id}
              type="button"
              onClick={() => onChange(opt.id)}
              className={`flex items-center gap-2 rounded-2xl px-3 py-3 text-left text-sm font-semibold ${
                selected ? "bg-ocean text-white" : "bg-sand text-ink"
              }`}
            >
              <Icon className="h-4 w-4 shrink-0" />
              {opt.name}
            </button>
          );
        })}
      </div>
      {value ? <input type="hidden" name="categoryId" value={value} /> : null}
    </div>
  );
}
