"use client";

export default function AppError({ reset }: { reset: () => void }) {
  return <main className="max-w-2xl mx-auto p-8 space-y-4">
    <h1 className="text-3xl font-bold">The Ledger Could Not Be Opened</h1>
    <p role="alert">Something went wrong. Try again, or check the server logs if the problem continues.</p>
    <button className="ledger-roll-trigger" onClick={reset}>Try Again</button>
  </main>;
}
