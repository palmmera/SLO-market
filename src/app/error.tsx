"use client";

export default function ErrorPage({ error, reset }: { error: Error; reset: () => void }) {
  return (
    <div className="mx-auto max-w-lg px-4 py-16 text-center">
      <h1 className="font-display text-3xl">Something went wrong</h1>
      <p className="mt-3 text-sm text-muted">{error.message || "The server hit an error while loading this page."}</p>
      <button onClick={() => reset()} className="mt-6 rounded-full bg-ocean px-5 py-3 font-semibold text-white">
        Try again
      </button>
    </div>
  );
}
