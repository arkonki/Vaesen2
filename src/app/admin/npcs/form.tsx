"use client";

import type { NPC } from "@prisma/client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { createNPC, updateNPC } from "@/app/admin/actions";
import Link from "next/link";
import { numericRecord, weaponList, Weapon } from "@/lib/json-fields";
import { Plus, Trash2 } from "lucide-react";

export default function NPCForm({ npc }: { npc?: NPC | null }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [skills, setSkills] = useState<Record<string, number>>(numericRecord(npc?.skills));
  const [weapons, setWeapons] = useState<Weapon[]>(weaponList(npc?.weapons));

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    const formData = new FormData(e.currentTarget);
    const data = {
      name: formData.get("name") as string,
      description: formData.get("description") as string,
      physique: parseInt(formData.get("physique") as string, 10),
      precision: parseInt(formData.get("precision") as string, 10),
      logic: parseInt(formData.get("logic") as string, 10),
      empathy: parseInt(formData.get("empathy") as string, 10),
      physicalToughness: parseInt(formData.get("physicalToughness") as string, 10),
      mentalToughness: parseInt(formData.get("mentalToughness") as string, 10),
      skills: skills,
      weapons: weapons,
    };

    try {
      if (npc) {
        await updateNPC(npc.id, data);
      } else {
        await createNPC(data);
      }
      router.push("/admin/npcs");
    } catch (error) {
      console.error(error);
      alert("Error saving NPC");
    } finally {
      setLoading(false);
    }
  }

  function addSkill() {
    setSkills({ ...skills, "New Skill": 1 });
  }

  function updateSkillName(oldName: string, newName: string) {
    if (oldName === newName || newName.trim() === "") return;
    const newSkills = { ...skills };
    newSkills[newName] = newSkills[oldName];
    delete newSkills[oldName];
    setSkills(newSkills);
  }

  function updateSkillValue(name: string, value: number) {
    setSkills({ ...skills, [name]: value });
  }

  function removeSkill(name: string) {
    const newSkills = { ...skills };
    delete newSkills[name];
    setSkills(newSkills);
  }

  function addWeapon() {
    setWeapons([...weapons, { name: "New Weapon", damage: 1, range: "Close" }]);
  }

  function updateWeapon(index: number, key: keyof Weapon, value: string | number) {
    const newWeapons = [...weapons];
    newWeapons[index] = { ...newWeapons[index], [key]: value };
    setWeapons(newWeapons);
  }

  function removeWeapon(index: number) {
    setWeapons(weapons.filter((_, i) => i !== index));
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-8 max-w-2xl">
      {/* Basic Info */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-[var(--ledger-ink)] border-b border-[var(--ledger-line)]/55 pb-2">Basic Info</h3>
        <div>
          <label className="block text-sm font-medium text-[var(--ledger-ink)] mb-1">Name</label>
          <input required type="text" name="name" defaultValue={npc?.name} className="w-full bg-[var(--ledger-paper)] border border-[var(--ledger-line)]/55 rounded-md px-3 py-2 text-[var(--ledger-ink)] focus:outline-none focus:border-[var(--ledger-accent)]/65" />
        </div>
        <div>
          <label className="block text-sm font-medium text-[var(--ledger-ink)] mb-1">Description</label>
          <textarea required rows={3} name="description" defaultValue={npc?.description} className="w-full bg-[var(--ledger-paper)] border border-[var(--ledger-line)]/55 rounded-md px-3 py-2 text-[var(--ledger-ink)] focus:outline-none focus:border-[var(--ledger-accent)]/65" />
        </div>
      </div>

      {/* Attributes & Toughness */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-[var(--ledger-ink)] border-b border-[var(--ledger-line)]/55 pb-2">Attributes & Toughness</h3>
        <div className="grid grid-cols-4 gap-4">
          <div><label className="block text-xs text-[var(--ledger-ink-soft)] mb-1">Physique</label><input required type="number" name="physique" defaultValue={npc?.physique ?? 2} className="w-full bg-[var(--ledger-paper)] border border-[var(--ledger-line)]/55 rounded px-2 py-1 text-[var(--ledger-ink)]" /></div>
          <div><label className="block text-xs text-[var(--ledger-ink-soft)] mb-1">Precision</label><input required type="number" name="precision" defaultValue={npc?.precision ?? 2} className="w-full bg-[var(--ledger-paper)] border border-[var(--ledger-line)]/55 rounded px-2 py-1 text-[var(--ledger-ink)]" /></div>
          <div><label className="block text-xs text-[var(--ledger-ink-soft)] mb-1">Logic</label><input required type="number" name="logic" defaultValue={npc?.logic ?? 2} className="w-full bg-[var(--ledger-paper)] border border-[var(--ledger-line)]/55 rounded px-2 py-1 text-[var(--ledger-ink)]" /></div>
          <div><label className="block text-xs text-[var(--ledger-ink-soft)] mb-1">Empathy</label><input required type="number" name="empathy" defaultValue={npc?.empathy ?? 2} className="w-full bg-[var(--ledger-paper)] border border-[var(--ledger-line)]/55 rounded px-2 py-1 text-[var(--ledger-ink)]" /></div>
        </div>
        <div className="grid grid-cols-2 gap-4 mt-2">
          <div><label className="block text-sm text-[var(--ledger-ink)] mb-1">Physical Toughness</label><input required type="number" name="physicalToughness" defaultValue={npc?.physicalToughness ?? 0} className="w-full bg-[var(--ledger-paper)] border border-[var(--ledger-line)]/55 rounded px-3 py-2 text-[var(--ledger-ink)]" /></div>
          <div><label className="block text-sm text-[var(--ledger-ink)] mb-1">Mental Toughness</label><input required type="number" name="mentalToughness" defaultValue={npc?.mentalToughness ?? 0} className="w-full bg-[var(--ledger-paper)] border border-[var(--ledger-line)]/55 rounded px-3 py-2 text-[var(--ledger-ink)]" /></div>
        </div>
      </div>

      {/* Skills (JSON) */}
      <div className="space-y-4 p-4 border border-[var(--ledger-line)]/55 rounded-lg bg-[var(--ledger-surface-strong)]">
        <div className="flex justify-between items-center mb-2">
          <h3 className="text-md font-semibold text-[var(--ledger-accent)]">Skills</h3>
          <button type="button" onClick={addSkill} className="text-sm bg-[var(--ledger-paper-deep)] hover:bg-[var(--ledger-paper-deep)] px-2 py-1 rounded text-[var(--ledger-ink)] flex gap-1 items-center"><Plus className="w-3 h-3"/> Add Skill</button>
        </div>
        {Object.keys(skills).map((skillName, i) => (
          <div key={i} className="flex gap-2 items-center">
            <input type="text" value={skillName} onChange={(e) => updateSkillName(skillName, e.target.value)} className="flex-1 bg-[var(--ledger-paper)] border border-[var(--ledger-line)]/55 rounded px-2 py-1 text-[var(--ledger-ink)] text-sm" />
            <input type="number" value={skills[skillName]} onChange={(e) => updateSkillValue(skillName, parseInt(e.target.value, 10))} className="w-20 bg-[var(--ledger-paper)] border border-[var(--ledger-line)]/55 rounded px-2 py-1 text-[var(--ledger-ink)] text-sm" />
            <button type="button" onClick={() => removeSkill(skillName)} className="p-1 text-[var(--ledger-danger)] hover:text-[var(--ledger-danger)]"><Trash2 className="w-4 h-4"/></button>
          </div>
        ))}
        {Object.keys(skills).length === 0 && <p className="text-sm text-[var(--ledger-ink-soft)] italic">No special skills added.</p>}
      </div>

      {/* Weapons (JSON) */}
      <div className="space-y-4 p-4 border border-[var(--ledger-line)]/55 rounded-lg bg-[var(--ledger-surface-strong)]">
        <div className="flex justify-between items-center mb-2">
          <h3 className="text-md font-semibold text-[var(--ledger-accent)]">Weapons</h3>
          <button type="button" onClick={addWeapon} className="text-sm bg-[var(--ledger-paper-deep)] hover:bg-[var(--ledger-paper-deep)] px-2 py-1 rounded text-[var(--ledger-ink)] flex gap-1 items-center"><Plus className="w-3 h-3"/> Add Weapon</button>
        </div>
        {weapons.map((w, i) => (
          <div key={i} className="flex gap-2 items-center">
            <input type="text" placeholder="Name" value={w.name} onChange={(e) => updateWeapon(i, "name", e.target.value)} className="flex-1 bg-[var(--ledger-paper)] border border-[var(--ledger-line)]/55 rounded px-2 py-1 text-[var(--ledger-ink)] text-sm" />
            <input type="number" placeholder="Dmg" value={w.damage} onChange={(e) => updateWeapon(i, "damage", parseInt(e.target.value, 10))} className="w-16 bg-[var(--ledger-paper)] border border-[var(--ledger-line)]/55 rounded px-2 py-1 text-[var(--ledger-ink)] text-sm" />
            <input type="text" placeholder="Range" value={w.range} onChange={(e) => updateWeapon(i, "range", e.target.value)} className="w-24 bg-[var(--ledger-paper)] border border-[var(--ledger-line)]/55 rounded px-2 py-1 text-[var(--ledger-ink)] text-sm" />
            <button type="button" onClick={() => removeWeapon(i)} className="p-1 text-[var(--ledger-danger)] hover:text-[var(--ledger-danger)]"><Trash2 className="w-4 h-4"/></button>
          </div>
        ))}
         {weapons.length === 0 && <p className="text-sm text-[var(--ledger-ink-soft)] italic">No weapons added.</p>}
      </div>

      <div className="flex justify-end gap-3 pt-6 border-t border-[var(--ledger-line)]/55">
        <Link href="/admin/npcs" className="px-4 py-2 text-sm font-medium text-[var(--ledger-ink)] hover:text-[var(--ledger-ink)] transition-colors">
          Cancel
        </Link>
        <button disabled={loading} type="submit" className="bg-[rgba(127,48,40,0.12)] hover:bg-[rgba(127,48,40,0.12)] text-[var(--ledger-ink)] px-4 py-2 rounded-md font-medium transition-colors disabled:opacity-50">
          {loading ? "Saving..." : "Save NPC"}
        </button>
      </div>
    </form>
  );
}
