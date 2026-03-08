"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createTalent, updateTalent } from "@/app/admin/actions";
import Link from "next/link";
import { TalentType } from "@prisma/client";

export default function TalentForm({ talent, archetypes }: { talent?: any, archetypes: any[] }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [type, setType] = useState<TalentType>(talent?.type || "GENERAL");

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
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
      console.error(error);
      alert("Error saving talent");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 max-w-xl">
      <div>
        <label className="block text-sm font-medium text-neutral-300 mb-1">Name</label>
        <input required type="text" name="name" defaultValue={talent?.name} className="w-full bg-neutral-950 border border-neutral-800 rounded-md px-3 py-2 text-white focus:outline-none focus:border-indigo-500" />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-neutral-300 mb-1">Type</label>
          <select 
            name="type" 
            value={type} 
            onChange={(e) => setType(e.target.value as TalentType)}
            className="w-full bg-neutral-950 border border-neutral-800 rounded-md px-3 py-2 text-white focus:outline-none focus:border-indigo-500"
          >
            <option value="GENERAL">General</option>
            <option value="ARCHETYPE">Archetype-Specific</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-neutral-300 mb-1">Archetype requirement</label>
          <select 
            name="archetypeId" 
            defaultValue={talent?.archetypeId || ""}
            disabled={type !== "ARCHETYPE"}
            className="w-full bg-neutral-950 border border-neutral-800 rounded-md px-3 py-2 text-white focus:outline-none focus:border-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <option value="">None</option>
            {archetypes.map(a => (
              <option key={a.id} value={a.id}>{a.name}</option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-neutral-300 mb-1">Description</label>
        <textarea required rows={4} name="description" defaultValue={talent?.description} className="w-full bg-neutral-950 border border-neutral-800 rounded-md px-3 py-2 text-white focus:outline-none focus:border-indigo-500" />
      </div>

      <div className="flex justify-end gap-3 mt-6">
        <Link href="/admin/talents" className="px-4 py-2 text-sm font-medium text-neutral-300 hover:text-white transition-colors">
          Cancel
        </Link>
        <button disabled={loading} type="submit" className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-md font-medium transition-colors disabled:opacity-50">
          {loading ? "Saving..." : "Save Talent"}
        </button>
      </div>
    </form>
  );
}
