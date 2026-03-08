"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createVaesen, updateVaesen } from "@/app/admin/actions";
import Link from "next/link";
import { Plus, Trash2 } from "lucide-react";

export default function VaesenForm({ vaesen }: { vaesen?: any }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [conditions, setConditions] = useState<Record<string, string>>(vaesen?.conditions ? (typeof vaesen.conditions === 'string' ? JSON.parse(vaesen.conditions) : vaesen.conditions) : {});

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
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
      console.error(error);
      alert("Error saving Vaesen");
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
    <form onSubmit={handleSubmit} className="space-y-8 max-w-3xl">
      {/* Basic Info */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-white border-b border-neutral-800 pb-2">Identity</h3>
          <div>
            <label className="block text-sm font-medium text-neutral-300 mb-1">Name</label>
            <input required type="text" name="name" defaultValue={vaesen?.name} className="w-full bg-neutral-950 border border-neutral-800 rounded-md px-3 py-2 text-white focus:outline-none focus:border-indigo-500" />
          </div>
          <div>
            <label className="block text-sm font-medium text-neutral-300 mb-1">Description</label>
            <textarea required rows={4} name="description" defaultValue={vaesen?.description} className="w-full bg-neutral-950 border border-neutral-800 rounded-md px-3 py-2 text-white focus:outline-none focus:border-indigo-500" />
          </div>
        </div>

        {/* Formidable Stats */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-white border-b border-neutral-800 pb-2">Vaesen Stats</h3>
          <div className="grid grid-cols-2 gap-4">
            <div><label className="block text-xs text-neutral-400 mb-1">Might</label><input required type="number" name="might" defaultValue={vaesen?.might ?? 10} className="w-full bg-neutral-950 border border-neutral-800 rounded px-3 py-2 text-white" /></div>
            <div><label className="block text-xs text-neutral-400 mb-1">Body Control</label><input required type="number" name="bodyControl" defaultValue={vaesen?.bodyControl ?? 5} className="w-full bg-neutral-950 border border-neutral-800 rounded px-3 py-2 text-white" /></div>
            <div><label className="block text-xs text-neutral-400 mb-1">Magic</label><input required type="number" name="magic" defaultValue={vaesen?.magic ?? 0} className="w-full bg-neutral-950 border border-neutral-800 rounded px-3 py-2 text-white" /></div>
            <div><label className="block text-xs text-neutral-400 mb-1">Manipulation</label><input required type="number" name="manipulation" defaultValue={vaesen?.manipulation ?? 0} className="w-full bg-neutral-950 border border-neutral-800 rounded px-3 py-2 text-white" /></div>
            <div className="col-span-2">
              <label className="block text-xs text-neutral-400 mb-1">Fear Factor</label>
              <input required type="number" name="fear" defaultValue={vaesen?.fear ?? 1} className="w-full bg-neutral-950 border border-neutral-800 rounded px-3 py-2 text-white" />
            </div>
          </div>
        </div>
      </div>

      {/* Mechanics */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-white border-b border-neutral-800 pb-2">Mechanics & Lore</h3>
        <div>
          <label className="block text-sm font-medium text-neutral-300 mb-1">Magical Powers</label>
          <textarea required rows={3} name="magicalPowers" defaultValue={vaesen?.magicalPowers} placeholder="Describe the Vaesen's unique magical abilities..." className="w-full bg-neutral-950 border border-neutral-800 rounded-md px-3 py-2 text-white focus:outline-none focus:border-indigo-500" />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-neutral-300 mb-1">The Ritual (How to banish it)</label>
            <textarea required rows={3} name="ritual" defaultValue={vaesen?.ritual} className="w-full bg-neutral-950 border border-neutral-800 rounded-md px-3 py-2 text-white focus:outline-none focus:border-indigo-500" />
          </div>
          <div>
            <label className="block text-sm font-medium text-neutral-300 mb-1">The Secret</label>
            <textarea required rows={3} name="secret" defaultValue={vaesen?.secret} className="w-full bg-neutral-950 border border-neutral-800 rounded-md px-3 py-2 text-white focus:outline-none focus:border-indigo-500" />
          </div>
        </div>
      </div>

      {/* Conditions (JSON) */}
      <div className="space-y-4 p-4 border border-neutral-800 rounded-lg bg-neutral-900/50">
        <div className="flex justify-between items-center mb-2">
          <h3 className="text-md font-semibold text-indigo-400">Conditions</h3>
          <button type="button" onClick={addCondition} className="text-sm bg-neutral-800 hover:bg-neutral-700 px-2 py-1 rounded text-white flex gap-1 items-center"><Plus className="w-3 h-3"/> Add Condition</button>
        </div>
        <p className="text-xs text-neutral-500 mb-4">Vaesen suffer conditions instead of wounds. Define the condition and its mechanical effect.</p>
        {Object.keys(conditions).map((condName, i) => (
          <div key={i} className="flex gap-2 items-start mb-2">
            <input type="text" value={condName} onChange={(e) => updateConditionName(condName, e.target.value)} className="w-1/3 bg-neutral-950 border border-neutral-800 rounded px-2 py-1 text-white text-sm" />
            <textarea value={conditions[condName]} onChange={(e) => updateConditionValue(condName, e.target.value)} rows={2} className="flex-1 bg-neutral-950 border border-neutral-800 rounded px-2 py-1 text-white text-sm" placeholder="Effect details..." />
            <button type="button" onClick={() => removeCondition(condName)} className="p-1 text-red-500 hover:text-red-400 mt-1"><Trash2 className="w-4 h-4"/></button>
          </div>
        ))}
        {Object.keys(conditions).length === 0 && <p className="text-sm text-neutral-500 italic">No conditions added.</p>}
      </div>

      <div className="flex justify-end gap-3 pt-6 border-t border-neutral-800">
        <Link href="/admin/vaesen" className="px-4 py-2 text-sm font-medium text-neutral-300 hover:text-white transition-colors">
          Cancel
        </Link>
        <button disabled={loading} type="submit" className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-md font-medium transition-colors disabled:opacity-50">
          {loading ? "Saving..." : "Save Vaesen"}
        </button>
      </div>
    </form>
  );
}
