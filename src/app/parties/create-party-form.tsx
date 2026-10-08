"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createParty } from "./actions";

export default function CreatePartyForm() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!name.trim()) {
      setError("Party name is required.");
      return;
    }

    setError("");
    setIsLoading(true);

    try {
      const party = await createParty(name.trim());
      router.push(`/parties/${party.id}/management`);
      router.refresh();
    } catch (submissionError) {
      const message = submissionError instanceof Error ? submissionError.message : "Failed to create party.";
      setError(message);
      setIsLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 rounded-sm border border-[var(--ledger-line)]/55 bg-[var(--ledger-paper)] p-5">
      <div>
        <h2 className="text-xl font-bold text-[var(--ledger-ink)]">Create a Party</h2>
        <p className="mt-1 text-sm text-[var(--ledger-ink-soft)]">Set up a new Society cell and initialize its headquarters.</p>
      </div>

      <div>
        <label className="mb-2 block text-sm font-medium text-[var(--ledger-ink)]">Party Name</label>
        <input
          required
          value={name}
          onChange={(event) => setName(event.target.value)}
          className="w-full rounded-sm border border-[var(--ledger-line)]/55 bg-[var(--ledger-surface)] px-4 py-3 text-[var(--ledger-ink)] outline-none transition-colors focus:border-[var(--ledger-accent)]/65"
          placeholder="Upsala Chapter"
        />
      </div>

      {error ? (
        <div className="rounded-sm border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-[var(--ledger-danger)]">
          {error}
        </div>
      ) : null}

      <button
        type="submit"
        disabled={isLoading}
        className="rounded-full border border-[var(--ledger-accent)]/65 bg-[rgba(127,48,40,0.12)] px-5 py-3 text-sm font-semibold text-[var(--ledger-accent)] transition-colors hover:bg-[rgba(127,48,40,0.12)] disabled:opacity-60"
      >
        {isLoading ? "Creating..." : "Create Party"}
      </button>
    </form>
  );
}
