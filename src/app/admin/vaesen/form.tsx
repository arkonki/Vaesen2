"use client";

import type { Vaesen } from "@prisma/client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { createVaesen, updateVaesen } from "@/app/admin/actions";
import Link from "next/link";
import { stringRecord } from "@/lib/json-fields";
import { Plus, Trash2 } from "lucide-react";

export default function VaesenForm({ vaesen }: { vaesen?: Vaesen | null }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [conditions, setConditions] = useState<Record<string, string>>(stringRecord(vaesen?.conditions));

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaveError("");
    setLoading(true);
    const formData = new FormData(e.currentTarget);
    const data = {
      name: formData.get("name") as string,
      description: formData.get("description") as string,
      might: parseInt(formData.get("might") as string, 10),
      bodyControl: parseInt(formData.get("bodyControl") as string, 10),
      magic: parseInt(formData.get("magic") as string, 10),
      manipulation: parseInt(formData.get("manipulation") as string, 10),
      fear: parseInt(formData.get("fear") as string, 10),
      magicalPowers: formData.get("magicalPowers") as string,
      ritual: formData.get("ritual") as string,
      secret: formData.get("secret") as string,
      conditions: conditions,
    };

    try {
      if (vaesen) {
        await updateVaesen(vaesen.id, data);
      } else {
        await createVaesen(data);
      }
      router.push("/admin/vaesen");
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : "This entry could not be saved. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  function addCondition() {
    setConditions({ ...conditions, "New Condition": "" });
  }

  function updateConditionName(oldName: string, newName: string) {
    if (oldName === newName || newName.trim() === "") return;
    const newConds = { ...conditions };
    newConds[newName] = newConds[oldName];
    delete newConds[oldName];
    setConditions(newConds);
  }

  function updateConditionValue(name: string, value: string) {
    setConditions({ ...conditions, [name]: value });
  }

  function removeCondition(name: string) {
    const newConds = { ...conditions };
    delete newConds[name];
    setConditions(newConds);
  }

  return (
    <form onSubmit={handleSubmit} aria-busy={loading} className="space-y-8 max-w-3xl">
      {saveError && <p role="alert" className="ledger-status">{saveError}</p>}
      {/* Basic Info */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-[var(--ledger-ink)] border-b border-[var(--ledger-line)]/55 pb-2">Identity</h3>
          <div>
            <label className="block text-sm font-medium text-[var(--ledger-ink)] mb-1" htmlFor="field-vaesen-form-tsx-0">Name</label>
            <input id="field-vaesen-form-tsx-0" required type="text" name="name" defaultValue={vaesen?.name} className="w-full bg-[var(--ledger-paper)] border border-[var(--ledger-line)]/55 rounded-md px-3 py-2 text-[var(--ledger-ink)] focus:outline-none focus:border-[var(--ledger-accent)]/65" />
          </div>
          <div>
            <label className="block text-sm font-medium text-[var(--ledger-ink)] mb-1" htmlFor="field-vaesen-form-tsx-1">Description</label>
            <textarea id="field-vaesen-form-tsx-1" required rows={4} name="description" defaultValue={vaesen?.description} className="w-full bg-[var(--ledger-paper)] border border-[var(--ledger-line)]/55 rounded-md px-3 py-2 text-[var(--ledger-ink)] focus:outline-none focus:border-[var(--ledger-accent)]/65" />
          </div>
        </div>

        {/* Formidable Stats */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-[var(--ledger-ink)] border-b border-[var(--ledger-line)]/55 pb-2">Vaesen Stats</h3>
          <div className="grid grid-cols-2 gap-4">
            <div><label className="block text-xs text-[var(--ledger-ink-soft)] mb-1" htmlFor="field-vaesen-form-tsx-2">Might</label><input id="field-vaesen-form-tsx-2" required type="number" name="might" defaultValue={vaesen?.might ?? 10} className="w-full bg-[var(--ledger-paper)] border border-[var(--ledger-line)]/55 rounded px-3 py-2 text-[var(--ledger-ink)]" /></div>
            <div><label className="block text-xs text-[var(--ledger-ink-soft)] mb-1" htmlFor="field-vaesen-form-tsx-3">Body Control</label><input id="field-vaesen-form-tsx-3" required type="number" name="bodyControl" defaultValue={vaesen?.bodyControl ?? 5} className="w-full bg-[var(--ledger-paper)] border border-[var(--ledger-line)]/55 rounded px-3 py-2 text-[var(--ledger-ink)]" /></div>
            <div><label className="block text-xs text-[var(--ledger-ink-soft)] mb-1" htmlFor="field-vaesen-form-tsx-4">Magic</label><input id="field-vaesen-form-tsx-4" required type="number" name="magic" defaultValue={vaesen?.magic ?? 0} className="w-full bg-[var(--ledger-paper)] border border-[var(--ledger-line)]/55 rounded px-3 py-2 text-[var(--ledger-ink)]" /></div>
            <div><label className="block text-xs text-[var(--ledger-ink-soft)] mb-1" htmlFor="field-vaesen-form-tsx-5">Manipulation</label><input id="field-vaesen-form-tsx-5" required type="number" name="manipulation" defaultValue={vaesen?.manipulation ?? 0} className="w-full bg-[var(--ledger-paper)] border border-[var(--ledger-line)]/55 rounded px-3 py-2 text-[var(--ledger-ink)]" /></div>
            <div className="col-span-2">
              <label className="block text-xs text-[var(--ledger-ink-soft)] mb-1" htmlFor="field-vaesen-form-tsx-6">Fear Factor</label>
              <input id="field-vaesen-form-tsx-6" required type="number" name="fear" defaultValue={vaesen?.fear ?? 1} className="w-full bg-[var(--ledger-paper)] border border-[var(--ledger-line)]/55 rounded px-3 py-2 text-[var(--ledger-ink)]" />
            </div>
          </div>
        </div>
      </div>

      {/* Mechanics */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-[var(--ledger-ink)] border-b border-[var(--ledger-line)]/55 pb-2">Mechanics & Lore</h3>
        <div>
          <label className="block text-sm font-medium text-[var(--ledger-ink)] mb-1" htmlFor="field-vaesen-form-tsx-7">Magical Powers</label>
          <textarea id="field-vaesen-form-tsx-7" required rows={3} name="magicalPowers" defaultValue={vaesen?.magicalPowers} placeholder="Describe the Vaesen's unique magical abilities..." className="w-full bg-[var(--ledger-paper)] border border-[var(--ledger-line)]/55 rounded-md px-3 py-2 text-[var(--ledger-ink)] focus:outline-none focus:border-[var(--ledger-accent)]/65" />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-[var(--ledger-ink)] mb-1" htmlFor="field-vaesen-form-tsx-8">The Ritual (How to banish it)</label>
            <textarea id="field-vaesen-form-tsx-8" required rows={3} name="ritual" defaultValue={vaesen?.ritual} className="w-full bg-[var(--ledger-paper)] border border-[var(--ledger-line)]/55 rounded-md px-3 py-2 text-[var(--ledger-ink)] focus:outline-none focus:border-[var(--ledger-accent)]/65" />
          </div>
          <div>
            <label className="block text-sm font-medium text-[var(--ledger-ink)] mb-1" htmlFor="field-vaesen-form-tsx-9">The Secret</label>
            <textarea id="field-vaesen-form-tsx-9" required rows={3} name="secret" defaultValue={vaesen?.secret} className="w-full bg-[var(--ledger-paper)] border border-[var(--ledger-line)]/55 rounded-md px-3 py-2 text-[var(--ledger-ink)] focus:outline-none focus:border-[var(--ledger-accent)]/65" />
          </div>
        </div>
      </div>

      {/* Conditions (JSON) */}
      <div className="space-y-4 p-4 border border-[var(--ledger-line)]/55 rounded-lg bg-[var(--ledger-surface-strong)]">
        <div className="flex justify-between items-center mb-2">
          <h3 className="text-md font-semibold text-[var(--ledger-accent)]">Conditions</h3>
          <button type="button" onClick={addCondition} className="text-sm bg-[var(--ledger-paper-deep)] hover:bg-[var(--ledger-paper-deep)] px-2 py-1 rounded text-[var(--ledger-ink)] flex gap-1 items-center"><Plus className="w-3 h-3"/> Add Condition</button>
        </div>
        <p className="text-xs text-[var(--ledger-ink-soft)] mb-4">Vaesen suffer conditions instead of wounds. Define the condition and its mechanical effect.</p>
        {Object.keys(conditions).map((condName, i) => (
          <div key={i} className="flex gap-2 items-start mb-2">
            <input type="text" value={condName} onChange={(e) => updateConditionName(condName, e.target.value)} className="w-1/3 bg-[var(--ledger-paper)] border border-[var(--ledger-line)]/55 rounded px-2 py-1 text-[var(--ledger-ink)] text-sm" />
            <textarea value={conditions[condName]} onChange={(e) => updateConditionValue(condName, e.target.value)} rows={2} className="flex-1 bg-[var(--ledger-paper)] border border-[var(--ledger-line)]/55 rounded px-2 py-1 text-[var(--ledger-ink)] text-sm" placeholder="Effect details..." />
            <button type="button" onClick={() => removeCondition(condName)} className="p-1 text-[var(--ledger-danger)] hover:text-[var(--ledger-danger)] mt-1"><Trash2 className="w-4 h-4"/></button>
          </div>
        ))}
        {Object.keys(conditions).length === 0 && <p className="text-sm text-[var(--ledger-ink-soft)] italic">No conditions added.</p>}
      </div>

      <div className="flex justify-end gap-3 pt-6 border-t border-[var(--ledger-line)]/55">
        <Link href="/admin/vaesen" className="px-4 py-2 text-sm font-medium text-[var(--ledger-ink)] hover:text-[var(--ledger-ink)] transition-colors">
          Cancel
        </Link>
        <button disabled={loading} type="submit" className="bg-[rgba(127,48,40,0.12)] hover:bg-[rgba(127,48,40,0.12)] text-[var(--ledger-ink)] px-4 py-2 rounded-md font-medium transition-colors disabled:opacity-50">
          {loading ? "Saving..." : "Save Vaesen"}
        </button>
      </div>
    </form>
  );
}
