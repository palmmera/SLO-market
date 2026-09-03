import { CUSTOM_CATEGORY_MAX } from "@/lib/utils";

export function OtherCategoryField({ defaultValue }: { defaultValue?: string }) {
  return (
    <label className="mt-3 block">
      <span className="text-sm font-medium">What is it?</span>
      <input
        name="customCategory"
        required
        maxLength={CUSTOM_CATEGORY_MAX}
        defaultValue={defaultValue}
        placeholder="e.g. vintage sewing machine, kayak, craft supplies"
        className="mt-2 w-full rounded-2xl border border-sand-dark bg-sand px-4 py-3"
      />
      <span className="mt-1 block text-xs text-muted">This isn’t in the list — type what you’re listing.</span>
    </label>
  );
}
