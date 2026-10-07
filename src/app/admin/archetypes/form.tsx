"use client";

import type { Archetype } from "@prisma/client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { createArchetype, updateArchetype } from "@/app/admin/actions";
import Link from "next/link";

export default function ArchetypeForm({ archetype }: { archetype?: Archetype | null }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    const formData = new FormData(e.currentTarget);
    const data = {
      name: formData.get("name") as string,
      mainAttribute: formData.get("mainAttribute") as string,
      mainSkill: formData.get("mainSkill") as string,
      startingResourcesMin: parseInt(formData.get("startingResourcesMin") as string, 10),
      startingResourcesMax: parseInt(formData.get("startingResourcesMax") as string, 10),
    };

    try {
      if (archetype) {
        await updateArchetype(archetype.id, data);
      } else {
        await createArchetype(data);
      }
      router.push("/admin/archetypes");
    } catch (error) {
      console.error(error);
      alert("Error saving archetype");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 max-w-xl">
      <div>
        <label className="block text-sm font-medium text-[var(--ledger-ink)] mb-1">Name</label>
        <input required type="text" name="name" defaultValue={archetype?.name} className="w-full bg-[var(--ledger-paper)] border border-[var(--ledger-line)]/55 rounded-md px-3 py-2 text-[var(--ledger-ink)] focus:outline-none focus:border-[var(--ledger-accent)]/65" />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-[var(--ledger-ink)] mb-1">Main Attribute</label>
          <input required type="text" name="mainAttribute" defaultValue={archetype?.mainAttribute} className="w-full bg-[var(--ledger-paper)] border border-[var(--ledger-line)]/55 rounded-md px-3 py-2 text-[var(--ledger-ink)] focus:outline-none focus:border-[var(--ledger-accent)]/65" />
        </div>
        <div>
          <label className="block text-sm font-medium text-[var(--ledger-ink)] mb-1">Main Skill</label>
          <input required type="text" name="mainSkill" defaultValue={archetype?.mainSkill} className="w-full bg-[var(--ledger-paper)] border border-[var(--ledger-line)]/55 rounded-md px-3 py-2 text-[var(--ledger-ink)] focus:outline-none focus:border-[var(--ledger-accent)]/65" />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-[var(--ledger-ink)] mb-1">Resource Min</label>
          <input required type="number" name="startingResourcesMin" defaultValue={archetype?.startingResourcesMin ?? 0} className="w-full bg-[var(--ledger-paper)] border border-[var(--ledger-line)]/55 rounded-md px-3 py-2 text-[var(--ledger-ink)] focus:outline-none focus:border-[var(--ledger-accent)]/65" />
        </div>
        <div>
          <label className="block text-sm font-medium text-[var(--ledger-ink)] mb-1">Resource Max</label>
          <input required type="number" name="startingResourcesMax" defaultValue={archetype?.startingResourcesMax ?? 0} className="w-full bg-[var(--ledger-paper)] border border-[var(--ledger-line)]/55 rounded-md px-3 py-2 text-[var(--ledger-ink)] focus:outline-none focus:border-[var(--ledger-accent)]/65" />
        </div>
      </div>

      <div className="flex justify-end gap-3 mt-6">
        <Link href="/admin/archetypes" className="px-4 py-2 text-sm font-medium text-[var(--ledger-ink)] hover:text-[var(--ledger-ink)] transition-colors">
          Cancel
        </Link>
        <button disabled={loading} type="submit" className="bg-[rgba(127,48,40,0.12)] hover:bg-[rgba(127,48,40,0.12)] text-[var(--ledger-ink)] px-4 py-2 rounded-md font-medium transition-colors disabled:opacity-50">
          {loading ? "Saving..." : "Save Archetype"}
        </button>
      </div>
    </form>
  );
}
