"use client";

import type { Item } from "@prisma/client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { createItem, updateItem } from "@/app/admin/actions";
import Link from "next/link";
import { ItemType } from "@prisma/client";

export default function ItemForm({ item }: { item?: Item | null }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [type, setType] = useState<ItemType>(item?.type || "GEAR");

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaveError("");
    setLoading(true);
    const formData = new FormData(e.currentTarget);
    const data = {
      name: formData.get("name") as string,
      description: formData.get("description") as string,
      type: formData.get("type") as ItemType,
      bonus: parseInt(formData.get("bonus") as string, 10),
      availability: parseInt(formData.get("availability") as string, 10),
      skill: formData.get("skill") as string || null,
      damage: type === "WEAPON" ? parseInt(formData.get("damage") as string, 10) : null,
      range: type === "WEAPON" ? formData.get("range") as string : null,
    };

    try {
      if (item) {
        await updateItem(item.id, data);
      } else {
        await createItem(data);
      }
      router.push("/admin/items");
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : "This entry could not be saved. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} aria-busy={loading} className="space-y-4 max-w-xl">
      {saveError && <p role="alert" className="ledger-status">{saveError}</p>}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-[var(--ledger-ink)] mb-1" htmlFor="field-items-form-tsx-0">Name</label>
          <input id="field-items-form-tsx-0" required type="text" name="name" defaultValue={item?.name} className="w-full bg-[var(--ledger-paper)] border border-[var(--ledger-line)]/55 rounded-md px-3 py-2 text-[var(--ledger-ink)] focus:outline-none focus:border-[var(--ledger-accent)]/65" />
        </div>
        <div>
          <label className="block text-sm font-medium text-[var(--ledger-ink)] mb-1" htmlFor="field-items-form-tsx-1">Type</label>
          <select id="field-items-form-tsx-1"
            name="type"
            value={type}
            onChange={(e) => setType(e.target.value as ItemType)}
            className="w-full bg-[var(--ledger-paper)] border border-[var(--ledger-line)]/55 rounded-md px-3 py-2 text-[var(--ledger-ink)] focus:outline-none focus:border-[var(--ledger-accent)]/65"
          >
            <option value="GEAR">Gear</option>
            <option value="WEAPON">Weapon</option>
            <option value="ARMOR">Armor</option>
            <option value="MAGIC">Magic Item</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div>
          <label className="block text-sm font-medium text-[var(--ledger-ink)] mb-1" htmlFor="field-items-form-tsx-2">Bonus</label>
          <input id="field-items-form-tsx-2" required type="number" name="bonus" defaultValue={item?.bonus ?? 0} className="w-full bg-[var(--ledger-paper)] border border-[var(--ledger-line)]/55 rounded-md px-3 py-2 text-[var(--ledger-ink)] focus:outline-none focus:border-[var(--ledger-accent)]/65" />
        </div>
        <div>
          <label className="block text-sm font-medium text-[var(--ledger-ink)] mb-1" htmlFor="field-items-form-tsx-3">Availability</label>
          <input id="field-items-form-tsx-3" required type="number" name="availability" defaultValue={item?.availability ?? 0} className="w-full bg-[var(--ledger-paper)] border border-[var(--ledger-line)]/55 rounded-md px-3 py-2 text-[var(--ledger-ink)] focus:outline-none focus:border-[var(--ledger-accent)]/65" />
        </div>
        <div>
          <label className="block text-sm font-medium text-[var(--ledger-ink)] mb-1" htmlFor="field-items-form-tsx-4">Skill</label>
          <input id="field-items-form-tsx-4" type="text" name="skill" defaultValue={item?.skill ?? ""} placeholder="e.g. Close Combat" className="w-full bg-[var(--ledger-paper)] border border-[var(--ledger-line)]/55 rounded-md px-3 py-2 text-[var(--ledger-ink)] focus:outline-none focus:border-[var(--ledger-accent)]/65" />
        </div>
      </div>

      {type === "WEAPON" && (
        <div className="grid grid-cols-2 gap-4 p-4 border border-[var(--ledger-accent)]/65 bg-[rgba(127,48,40,0.12)] rounded-lg">
          <div>
            <label className="block text-sm font-medium text-[var(--ledger-ink)] mb-1" htmlFor="field-items-form-tsx-5">Damage</label>
            <input id="field-items-form-tsx-5" required type="number" name="damage" defaultValue={item?.damage ?? 1} className="w-full bg-[var(--ledger-paper)] border border-[var(--ledger-line)]/55 rounded-md px-3 py-2 text-[var(--ledger-ink)] focus:outline-none focus:border-[var(--ledger-accent)]/65" />
          </div>
          <div>
            <label className="block text-sm font-medium text-[var(--ledger-ink)] mb-1" htmlFor="field-items-form-tsx-6">Range</label>
            <select id="field-items-form-tsx-6" name="range" defaultValue={item?.range || "Close"} className="w-full bg-[var(--ledger-paper)] border border-[var(--ledger-line)]/55 rounded-md px-3 py-2 text-[var(--ledger-ink)] focus:outline-none focus:border-[var(--ledger-accent)]/65">
              <option value="Close">Close</option>
              <option value="Near">Near</option>
              <option value="Far">Far</option>
              <option value="Distant">Distant</option>
            </select>
          </div>
        </div>
      )}

      <div>
        <label className="block text-sm font-medium text-[var(--ledger-ink)] mb-1" htmlFor="field-items-form-tsx-7">Description</label>
        <textarea id="field-items-form-tsx-7" rows={3} name="description" defaultValue={item?.description ?? ""} className="w-full bg-[var(--ledger-paper)] border border-[var(--ledger-line)]/55 rounded-md px-3 py-2 text-[var(--ledger-ink)] focus:outline-none focus:border-[var(--ledger-accent)]/65" />
      </div>

      <div className="flex justify-end gap-3 mt-6">
        <Link href="/admin/items" className="px-4 py-2 text-sm font-medium text-[var(--ledger-ink)] hover:text-[var(--ledger-ink)] transition-colors">
          Cancel
        </Link>
        <button disabled={loading} type="submit" className="bg-[rgba(127,48,40,0.12)] hover:bg-[rgba(127,48,40,0.12)] text-[var(--ledger-ink)] px-4 py-2 rounded-md font-medium transition-colors disabled:opacity-50">
          {loading ? "Saving..." : "Save Item"}
        </button>
      </div>
    </form>
  );
}
