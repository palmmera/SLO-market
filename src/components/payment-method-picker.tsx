"use client";

const OPTIONS = [
  ["CARD", "Card on SLO Market", "12% when it sells. These listings are not capped."],
  ["CASH", "Cash at meetup", "Free for 20 products and 1 garage sale. No card checkout."],
  ["BOTH", "Card or cash", "Buyer chooses. Not capped. Card sales stay at 12%."],
] as const;

export type PayChoice = (typeof OPTIONS)[number][0];

export function PaymentMethodPicker({
  value,
  onChange,
}: {
  value: PayChoice;
  onChange: (value: PayChoice) => void;
}) {
  return (
    <div className="mt-4">
      <span className="text-sm font-medium">How buyers pay</span>
      <div className="mt-2 grid gap-2">
        {OPTIONS.map(([id, label, hint]) => (
          <button
            key={id}
            type="button"
            onClick={() => onChange(id)}
            className={`rounded-2xl px-4 py-3 text-left ${value === id ? "bg-ocean text-white" : "bg-sand"}`}
          >
            <span className="block text-sm font-semibold">{label}</span>
            <span className={`mt-0.5 block text-xs ${value === id ? "text-white/80" : "text-muted"}`}>{hint}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
