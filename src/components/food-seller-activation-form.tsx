"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { activateFoodSeller } from "@/actions/food-seller";
import { ACTIVATION_PRODUCT_TYPES, PRODUCTION_SOURCES } from "@/lib/food-seller";

export function FoodSellerActivationForm({
  cities,
  defaultName,
  defaultEmail,
  defaultPhone,
  defaultCityId,
  existing,
}: {
  cities: { id: string; name: string }[];
  defaultName: string;
  defaultEmail: string;
  defaultPhone: string;
  defaultCityId?: string;
  existing?: {
    fullName: string;
    businessName: string | null;
    cityId: string;
    email: string;
    phone: string;
    productTypes: string[];
    otherProductDesc: string | null;
    productionSource: string;
    productionSourceOther: string | null;
    permitRequired: string;
    permitType: string | null;
    permitNumber: string | null;
    permitAgency: string | null;
    permitExpiresAt: Date | null;
  } | null;
}) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [pending, start] = useTransition();
  const [permitRequired, setPermitRequired] = useState(existing?.permitRequired || "");
  const [productionSource, setProductionSource] = useState(existing?.productionSource || "GROW_MYSELF");
  const [docName, setDocName] = useState("");

  return (
    <form
      className="space-y-6"
      onSubmit={(e) => {
        e.preventDefault();
        setError("");
        const form = new FormData(e.currentTarget);
        start(async () => {
          try {
            await activateFoodSeller(form);
            router.push("/sell/food?activated=1");
            router.refresh();
          } catch (err) {
            setError(err instanceof Error ? err.message : "Could not submit verification.");
          }
        });
      }}
    >
      <section className="rounded-3xl bg-white p-5 card-shadow">
        <h2 className="font-semibold">1. Seller Information</h2>
        <div className="mt-3 space-y-3">
          <input name="fullName" required defaultValue={existing?.fullName || defaultName} placeholder="Full name *" className="w-full rounded-2xl bg-sand px-4 py-3" />
          <input name="businessName" defaultValue={existing?.businessName || ""} placeholder="Business / farm name (optional)" className="w-full rounded-2xl bg-sand px-4 py-3" />
          <select name="cityId" required defaultValue={existing?.cityId || defaultCityId} className="w-full rounded-2xl bg-sand px-4 py-3">
            {cities.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
          <input name="email" type="email" required defaultValue={existing?.email || defaultEmail} placeholder="Email address *" className="w-full rounded-2xl bg-sand px-4 py-3" />
          <input name="phone" type="tel" required defaultValue={existing?.phone || defaultPhone} placeholder="Phone number *" className="w-full rounded-2xl bg-sand px-4 py-3" />
        </div>
      </section>

      <section className="rounded-3xl bg-white p-5 card-shadow">
        <h2 className="font-semibold">2. What Are You Selling?</h2>
        <p className="mt-1 text-sm text-muted">Select all that apply.</p>
        <div className="mt-3 space-y-2">
          {ACTIVATION_PRODUCT_TYPES.map((t) => (
            <label key={t.value} className="flex items-start gap-2 rounded-2xl bg-sand p-3 text-sm">
              <input type="checkbox" name="productTypes" value={t.value} defaultChecked={existing?.productTypes.includes(t.value)} className="mt-0.5" />
              {t.label}
            </label>
          ))}
        </div>
        <input name="otherProductDesc" defaultValue={existing?.otherProductDesc || ""} placeholder="Other product description" className="mt-3 w-full rounded-2xl bg-sand px-4 py-3" />
      </section>

      <section className="rounded-3xl bg-white p-5 card-shadow">
        <h2 className="font-semibold">3. Where Is Your Product Produced?</h2>
        <div className="mt-3 space-y-2">
          {PRODUCTION_SOURCES.map((s) => (
            <label key={s.value} className="flex items-center gap-2 rounded-2xl bg-sand p-3 text-sm">
              <input
                type="radio"
                name="productionSource"
                value={s.value}
                checked={productionSource === s.value}
                onChange={() => setProductionSource(s.value)}
              />
              {s.label}
            </label>
          ))}
        </div>
        {productionSource === "OTHER" && (
          <input name="productionSourceOther" defaultValue={existing?.productionSourceOther || ""} placeholder="Describe" className="mt-3 w-full rounded-2xl bg-sand px-4 py-3" />
        )}
      </section>

      <section className="rounded-3xl bg-white p-5 card-shadow">
        <h2 className="font-semibold">4. Permit / Registration</h2>
        <p className="mt-1 text-sm text-muted">
          SLO County handles registration. Class A covers direct sales; Class B covers direct and indirect sale. You are responsible for obtaining any required registration or permit.
        </p>
        <div className="mt-3 space-y-2">
          {[
            ["YES", "Yes"],
            ["NO", "No"],
            ["UNSURE", "I am not sure"],
          ].map(([value, label]) => (
            <label key={value} className="flex items-center gap-2 rounded-2xl bg-sand p-3 text-sm">
              <input type="radio" name="permitRequired" value={value} checked={permitRequired === value} onChange={() => setPermitRequired(value)} required />
              {label}
            </label>
          ))}
        </div>
        {permitRequired === "YES" && (
          <div className="mt-3 space-y-3">
            <input name="permitType" defaultValue={existing?.permitType || ""} placeholder="Permit / registration type (e.g. Cottage Food Class A)" className="w-full rounded-2xl bg-sand px-4 py-3" />
            <input name="permitNumber" defaultValue={existing?.permitNumber || ""} placeholder="Permit / registration number" className="w-full rounded-2xl bg-sand px-4 py-3" />
            <input name="permitAgency" defaultValue={existing?.permitAgency || ""} placeholder="Issuing agency / county" className="w-full rounded-2xl bg-sand px-4 py-3" />
            <input
              name="permitExpiresAt"
              type="date"
              defaultValue={existing?.permitExpiresAt ? existing.permitExpiresAt.toISOString().slice(0, 10) : ""}
              className="w-full rounded-2xl bg-sand px-4 py-3"
            />
            <label className="block cursor-pointer rounded-2xl border-2 border-dashed border-sand-dark bg-sand px-4 py-6 text-center text-sm text-muted">
              {docName || "Upload permit / registration document (optional)"}
              <input name="permitDocument" type="file" accept=".pdf,image/*" className="hidden" onChange={(e) => setDocName(e.target.files?.[0]?.name || "")} />
            </label>
          </div>
        )}
      </section>

      <section className="rounded-3xl bg-white p-5 card-shadow">
        <h2 className="font-semibold">5. Product Compliance</h2>
        <div className="mt-3 space-y-2 text-sm">
          {[
            ["certCompliance", "I certify that the products I list are legally permitted for sale under applicable California and local requirements."],
            ["certCottageFood", "I understand that some homemade foods are subject to California Cottage Food requirements and that I am responsible for obtaining any required registration or permit."],
            ["certNoProhibited", "I will not list foods that require refrigeration, contain prohibited ingredients, or otherwise require a permit that I do not have."],
            ["certLabeling", "I will provide accurate ingredient, allergen, and labeling information whenever required by law."],
            ["certRemoveNonCompliant", "I will remove a product immediately if I learn that it does not comply with applicable requirements."],
          ].map(([name, label]) => (
            <label key={name} className="flex items-start gap-2 rounded-2xl bg-sand p-3">
              <input type="checkbox" name={name} required className="mt-0.5" />
              {label}
            </label>
          ))}
        </div>
      </section>

      <section className="rounded-3xl bg-white p-5 card-shadow">
        <h2 className="font-semibold">6. Seller Certification</h2>
        <div className="mt-3 space-y-2 text-sm">
          <label className="flex items-start gap-2 rounded-2xl bg-sand p-3">
            <input type="checkbox" name="certOwner" required className="mt-0.5" />
            I certify that I am the owner or authorized seller of the products I am listing and that all information I have provided is accurate and truthful. I understand that I am solely responsible for the legality, safety, quality, labeling, and compliance of my products.
          </label>
          <label className="flex items-start gap-2 rounded-2xl bg-sand p-3">
            <input type="checkbox" name="certMarketplaceDisclaimer" required className="mt-0.5" />
            I understand that SLO Marketplace does not grow, manufacture, prepare, inspect, test, certify, or guarantee food or produce sold by users of the marketplace.
          </label>
          <label className="flex items-start gap-2 rounded-2xl bg-sand p-3">
            <input type="checkbox" name="certTerms" required className="mt-0.5" />
            I agree to SLO Market&apos;s{" "}
            <Link href="/terms" className="font-semibold text-ocean">
              Terms of Service
            </Link>{" "}
            and{" "}
            <Link href="/food-produce-policy" className="font-semibold text-ocean">
              Food &amp; Produce Seller Policy
            </Link>
            .
          </label>
        </div>
      </section>

      {error && <p className="text-sm text-clay">{error}</p>}
      <button disabled={pending} className="w-full rounded-2xl bg-clay py-4 text-lg font-semibold text-white">
        {pending ? "Submitting..." : "Submit & Continue"}
      </button>
      <p className="text-center text-xs text-muted">
        By submitting this form, you acknowledge that providing false or misleading information may result in removal of your listings and suspension or termination of your seller account.
      </p>
    </form>
  );
}
