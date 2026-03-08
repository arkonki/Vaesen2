"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createNPC, updateNPC } from "@/app/admin/actions";
import Link from "next/link";
import { Plus, Trash2 } from "lucide-react";

export default function NPCForm({ npc }: { npc?: any }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [skills, setSkills] = useState<Record<string, number>>(npc?.skills ? (typeof npc.skills === 'string' ? JSON.parse(npc.skills) : npc.skills) : {});
  const [weapons, setWeapons] = useState<any[]>(npc?.weapons ? (typeof npc.weapons === 'string' ? JSON.parse(npc.weapons) : npc.weapons) : []);

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

  function updateWeapon(index: number, key: string, value: any) {
    const newWeapons = [...weapons];
    newWeapons[index][key] = value;
    setWeapons(newWeapons);
  }

  function removeWeapon(index: number) {
    setWeapons(weapons.filter((_, i) => i !== index));
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-8 max-w-2xl">
      {/* Basic Info */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-white border-b border-neutral-800 pb-2">Basic Info</h3>
        <div>
          <label className="block text-sm font-medium text-neutral-300 mb-1">Name</label>
          <input required type="text" name="name" defaultValue={npc?.name} className="w-full bg-neutral-950 border border-neutral-800 rounded-md px-3 py-2 text-white focus:outline-none focus:border-indigo-500" />
        </div>
        <div>
          <label className="block text-sm font-medium text-neutral-300 mb-1">Description</label>
          <textarea required rows={3} name="description" defaultValue={npc?.description} className="w-full bg-neutral-950 border border-neutral-800 rounded-md px-3 py-2 text-white focus:outline-none focus:border-indigo-500" />
        </div>
      </div>

      {/* Attributes & Toughness */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-white border-b border-neutral-800 pb-2">Attributes & Toughness</h3>
        <div className="grid grid-cols-4 gap-4">
          <div><label className="block text-xs text-neutral-400 mb-1">Physique</label><input required type="number" name="physique" defaultValue={npc?.physique ?? 2} className="w-full bg-neutral-950 border border-neutral-800 rounded px-2 py-1 text-white" /></div>
          <div><label className="block text-xs text-neutral-400 mb-1">Precision</label><input required type="number" name="precision" defaultValue={npc?.precision ?? 2} className="w-full bg-neutral-950 border border-neutral-800 rounded px-2 py-1 text-white" /></div>
          <div><label className="block text-xs text-neutral-400 mb-1">Logic</label><input required type="number" name="logic" defaultValue={npc?.logic ?? 2} className="w-full bg-neutral-950 border border-neutral-800 rounded px-2 py-1 text-white" /></div>
          <div><label className="block text-xs text-neutral-400 mb-1">Empathy</label><input required type="number" name="empathy" defaultValue={npc?.empathy ?? 2} className="w-full bg-neutral-950 border border-neutral-800 rounded px-2 py-1 text-white" /></div>
        </div>
        <div className="grid grid-cols-2 gap-4 mt-2">
          <div><label className="block text-sm text-neutral-300 mb-1">Physical Toughness</label><input required type="number" name="physicalToughness" defaultValue={npc?.physicalToughness ?? 0} className="w-full bg-neutral-950 border border-neutral-800 rounded px-3 py-2 text-white" /></div>
          <div><label className="block text-sm text-neutral-300 mb-1">Mental Toughness</label><input required type="number" name="mentalToughness" defaultValue={npc?.mentalToughness ?? 0} className="w-full bg-neutral-950 border border-neutral-800 rounded px-3 py-2 text-white" /></div>
        </div>
      </div>

      {/* Skills (JSON) */}
      <div className="space-y-4 p-4 border border-neutral-800 rounded-lg bg-neutral-900/50">
        <div className="flex justify-between items-center mb-2">
          <h3 className="text-md font-semibold text-indigo-400">Skills</h3>
          <button type="button" onClick={addSkill} className="text-sm bg-neutral-800 hover:bg-neutral-700 px-2 py-1 rounded text-white flex gap-1 items-center"><Plus className="w-3 h-3"/> Add Skill</button>
        </div>
        {Object.keys(skills).map((skillName, i) => (
          <div key={i} className="flex gap-2 items-center">
            <input type="text" value={skillName} onChange={(e) => updateSkillName(skillName, e.target.value)} className="flex-1 bg-neutral-950 border border-neutral-800 rounded px-2 py-1 text-white text-sm" />
            <input type="number" value={skills[skillName]} onChange={(e) => updateSkillValue(skillName, parseInt(e.target.value, 10))} className="w-20 bg-neutral-950 border border-neutral-800 rounded px-2 py-1 text-white text-sm" />
            <button type="button" onClick={() => removeSkill(skillName)} className="p-1 text-red-500 hover:text-red-400"><Trash2 className="w-4 h-4"/></button>
          </div>
        ))}
        {Object.keys(skills).length === 0 && <p className="text-sm text-neutral-500 italic">No special skills added.</p>}
      </div>

      {/* Weapons (JSON) */}
      <div className="space-y-4 p-4 border border-neutral-800 rounded-lg bg-neutral-900/50">
        <div className="flex justify-between items-center mb-2">
          <h3 className="text-md font-semibold text-indigo-400">Weapons</h3>
          <button type="button" onClick={addWeapon} className="text-sm bg-neutral-800 hover:bg-neutral-700 px-2 py-1 rounded text-white flex gap-1 items-center"><Plus className="w-3 h-3"/> Add Weapon</button>
        </div>
        {weapons.map((w, i) => (
          <div key={i} className="flex gap-2 items-center">
            <input type="text" placeholder="Name" value={w.name} onChange={(e) => updateWeapon(i, "name", e.target.value)} className="flex-1 bg-neutral-950 border border-neutral-800 rounded px-2 py-1 text-white text-sm" />
            <input type="number" placeholder="Dmg" value={w.damage} onChange={(e) => updateWeapon(i, "damage", parseInt(e.target.value, 10))} className="w-16 bg-neutral-950 border border-neutral-800 rounded px-2 py-1 text-white text-sm" />
            <input type="text" placeholder="Range" value={w.range} onChange={(e) => updateWeapon(i, "range", e.target.value)} className="w-24 bg-neutral-950 border border-neutral-800 rounded px-2 py-1 text-white text-sm" />
            <button type="button" onClick={() => removeWeapon(i)} className="p-1 text-red-500 hover:text-red-400"><Trash2 className="w-4 h-4"/></button>
          </div>
        ))}
         {weapons.length === 0 && <p className="text-sm text-neutral-500 italic">No weapons added.</p>}
      </div>

      <div className="flex justify-end gap-3 pt-6 border-t border-neutral-800">
        <Link href="/admin/npcs" className="px-4 py-2 text-sm font-medium text-neutral-300 hover:text-white transition-colors">
          Cancel
        </Link>
        <button disabled={loading} type="submit" className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-md font-medium transition-colors disabled:opacity-50">
          {loading ? "Saving..." : "Save NPC"}
        </button>
      </div>
    </form>
  );
}
