"use client";

import { Car, Cog, Home, KeyRound, PartyPopper, Tent, Truck, Wrench } from "lucide-react";

const ORDER = [
  "rental-rooms",
  "rental-houses",
  "rental-power-tools",
  "rental-equipment",
  "rental-trailers",
  "rental-cars",
  "rental-party",
  "rental-outdoor",
];

const ICONS: Record<string, typeof Home> = {
  "rental-rooms": KeyRound,
  "rental-houses": Home,
  "rental-power-tools": Wrench,
  "rental-equipment": Cog,
  "rental-trailers": Truck,
  "rental-cars": Car,
  "rental-party": PartyPopper,
  "rental-outdoor": Tent,
};

type Option = { id: string; name: string; slug: string };

export function RentalTypePicker({
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
      <p className="mt-1 text-sm text-muted">What are you renting?</p>
      <div className="mt-3 grid grid-cols-2 gap-2">
        {sorted.map((opt) => {
          const Icon = ICONS[opt.slug] || KeyRound;
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
