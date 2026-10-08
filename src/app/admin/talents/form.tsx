"use client";

import type { Talent, Archetype } from "@prisma/client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { createTalent, updateTalent } from "@/app/admin/actions";
import Link from "next/link";
import { TalentType } from "@prisma/client";

export default function TalentForm({ talent, archetypes }: { talent?: Talent | null, archetypes: Archetype[] }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [type, setType] = useState<TalentType>(talent?.type || "GENERAL");

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaveError("");
    setLoading(true);
    const formData = new FormData(e.currentTarget);
    const data = {
      name: formData.get("name") as string,
      description: formData.get("description") as string,
      type: formData.get("type") as TalentType,
      archetypeId: formData.get("archetypeId") as string || undefined,
    };

    try {
      if (talent) {
        await updateTalent(talent.id, data);
      } else {
        await createTalent(data);
      }
      router.push("/admin/talents");
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : "This entry could not be saved. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} aria-busy={loading} className="space-y-4 max-w-xl">
      {saveError && <p role="alert" className="ledger-status">{saveError}</p>}
      <div>
        <label className="block text-sm font-medium text-[var(--ledger-ink)] mb-1" htmlFor="field-talents-form-tsx-0">Name</label>
        <input id="field-talents-form-tsx-0" required type="text" name="name" defaultValue={talent?.name} className="w-full bg-[var(--ledger-paper)] border border-[var(--ledger-line)]/55 rounded-md px-3 py-2 text-[var(--ledger-ink)] focus:outline-none focus:border-[var(--ledger-accent)]/65" />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-[var(--ledger-ink)] mb-1" htmlFor="field-talents-form-tsx-1">Type</label>
          <select id="field-talents-form-tsx-1"
            name="type"
            value={type}
            onChange={(e) => setType(e.target.value as TalentType)}
            className="w-full bg-[var(--ledger-paper)] border border-[var(--ledger-line)]/55 rounded-md px-3 py-2 text-[var(--ledger-ink)] focus:outline-none focus:border-[var(--ledger-accent)]/65"
          >
            <option value="GENERAL">General</option>
            <option value="ARCHETYPE">Archetype-Specific</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-[var(--ledger-ink)] mb-1" htmlFor="field-talents-form-tsx-2">Archetype requirement</label>
          <select id="field-talents-form-tsx-2"
            name="archetypeId"
            defaultValue={talent?.archetypeId || ""}
            disabled={type !== "ARCHETYPE"}
            className="w-full bg-[var(--ledger-paper)] border border-[var(--ledger-line)]/55 rounded-md px-3 py-2 text-[var(--ledger-ink)] focus:outline-none focus:border-[var(--ledger-accent)]/65 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <option value="">None</option>
            {archetypes.map(a => (
              <option key={a.id} value={a.id}>{a.name}</option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-[var(--ledger-ink)] mb-1" htmlFor="field-talents-form-tsx-3">Description</label>
        <textarea id="field-talents-form-tsx-3" required rows={4} name="description" defaultValue={talent?.description} className="w-full bg-[var(--ledger-paper)] border border-[var(--ledger-line)]/55 rounded-md px-3 py-2 text-[var(--ledger-ink)] focus:outline-none focus:border-[var(--ledger-accent)]/65" />
      </div>

      <div className="flex justify-end gap-3 mt-6">
        <Link href="/admin/talents" className="px-4 py-2 text-sm font-medium text-[var(--ledger-ink)] hover:text-[var(--ledger-ink)] transition-colors">
          Cancel
        </Link>
        <button disabled={loading} type="submit" className="bg-[rgba(127,48,40,0.12)] hover:bg-[rgba(127,48,40,0.12)] text-[var(--ledger-ink)] px-4 py-2 rounded-md font-medium transition-colors disabled:opacity-50">
          {loading ? "Saving..." : "Save Talent"}
        </button>
      </div>
    </form>
  );
}
