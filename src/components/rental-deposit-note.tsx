export function RentalDepositNote({ note }: { note?: string | null }) {
  if (!note) return null;
  return (
    <div className="rounded-2xl bg-sand px-3 py-3 text-sm">
      <p className="font-semibold">Deposit (collected by the owner)</p>
      <p className="mt-1">{note}</p>
      <p className="mt-2 text-xs text-muted">
        SLO Market does not collect, hold, or refund deposits. Arrange this with the owner.
      </p>
    </div>
  );
}
