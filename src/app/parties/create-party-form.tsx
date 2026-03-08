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
    <form onSubmit={handleSubmit} className="space-y-4 rounded-2xl border border-white/10 bg-neutral-950/60 p-5">
      <div>
        <h2 className="text-xl font-bold text-white">Create a Party</h2>
        <p className="mt-1 text-sm text-neutral-400">Set up a new Society cell and initialize its headquarters.</p>
      </div>

      <div>
        <label className="mb-2 block text-sm font-medium text-neutral-300">Party Name</label>
        <input
          required
          value={name}
          onChange={(event) => setName(event.target.value)}
          className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none transition-colors focus:border-amber-400/30"
          placeholder="Upsala Chapter"
        />
      </div>

      {error ? (
        <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
          {error}
        </div>
      ) : null}

      <button
        type="submit"
        disabled={isLoading}
        className="rounded-full border border-amber-300/30 bg-amber-500/10 px-5 py-3 text-sm font-semibold text-amber-100 transition-colors hover:bg-amber-500/20 disabled:opacity-60"
      >
        {isLoading ? "Creating..." : "Create Party"}
      </button>
    </form>
  );
}
