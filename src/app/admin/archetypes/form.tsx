"use client";

import type { Item, Talent } from "@prisma/client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createArchetype, updateArchetype } from "@/app/admin/actions";
import { ATTRIBUTE_KEYS, SKILL_KEYS, normalizeRuleKey } from "@/lib/character-rules";
import { archetypeTemplateSchema, suggestionLines, type ArchetypeTemplate } from "@/lib/archetype-template";

const optionFields = [
  ["firstNameOptions", "First Name Options"], ["lastNameOptions", "Last Name Options"],
  ["motivationOptions", "Motivation Options"], ["traumaOptions", "Trauma Options"],
  ["darkSecretOptions", "Dark Secret Options"], ["relationshipOptions", "Relationship Options"],
] as const;
const displayKey = (key: string) => key.replace(/([A-Z])/g, " $1");

export default function ArchetypeForm({ archetype, talents, items }: { archetype?: ArchetypeTemplate | null; talents: Talent[]; items: Item[] }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [talentIds, setTalentIds] = useState(archetype?.startingTalents?.map(entry => entry.talentId) ?? []);
  const [groups, setGroups] = useState(archetype?.equipmentGroups?.map(group => ({ label: group.label, quantity: group.quantity, itemIds: group.options.map(option => option.itemId) })) ?? []);
  const eligibleTalents = talents.filter(talent => talent.type === "GENERAL" || talent.archetypeId === archetype?.id);
  const inputClass = "ledger-input w-full mt-2";

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaveError(""); setLoading(true);
    const form = new FormData(event.currentTarget);
    try {
      const data = archetypeTemplateSchema.parse({
        name: form.get("name"), flavorText: form.get("flavorText"),
        mainAttribute: form.get("mainAttribute"), mainSkill: form.get("mainSkill"),
        startingResourcesMin: Number(form.get("startingResourcesMin")), startingResourcesMax: Number(form.get("startingResourcesMax")),
        ...Object.fromEntries(optionFields.map(([key]) => [key, suggestionLines(String(form.get(key) ?? ""))])),
        startingTalentIds: talentIds, equipmentGroups: groups,
      });
      if (archetype) await updateArchetype(archetype.id, data);
      else await createArchetype(data);
      router.push("/admin/archetypes"); router.refresh();
    } catch (error) { setSaveError(error instanceof Error ? error.message : "The archetype could not be saved."); }
    finally { setLoading(false); }
  }

  function updateGroup(index: number, fields: Partial<(typeof groups)[number]>) {
    setGroups(current => current.map((group, position) => position === index ? { ...group, ...fields } : group));
  }

  return <form onSubmit={handleSubmit} aria-busy={loading} className="space-y-6">
    {saveError && <p role="alert" className="ledger-status">{saveError}</p>}
    <fieldset disabled={loading} className="space-y-6 min-w-0">
      <section className="space-y-4">
        <h3 className="ledger-bar">Identity & Flavor</h3>
        <label className="block font-semibold">Name<input required name="name" maxLength={100} defaultValue={archetype?.name} className={inputClass} /></label>
        <label className="block font-semibold">Flavor Text<textarea name="flavorText" maxLength={20000} rows={5} defaultValue={archetype?.flavorText} className={inputClass} placeholder="Introductory prose shown when choosing this archetype" /></label>
        <div className="grid gap-4 md:grid-cols-2">
          {optionFields.map(([key, label]) => <label key={key} className="block font-semibold">{label}
            <textarea name={key} rows={4} defaultValue={archetype?.[key].join("\n")} className={inputClass} placeholder="One suggestion per line" />
            <span className="block mt-1 text-sm font-normal text-[var(--ledger-ink-soft)]">One option per line. Players may write their own.</span>
          </label>)}
        </div>
      </section>
      <section className="space-y-4">
        <h3 className="ledger-bar">Attributes, Skills & Resources</h3>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block font-semibold">Main Attribute<select name="mainAttribute" required defaultValue={normalizeRuleKey(archetype?.mainAttribute ?? "logic")} className={inputClass}>
            {ATTRIBUTE_KEYS.map(key => <option key={key} value={key}>{displayKey(key)}</option>)}
          </select></label>
          <label className="block font-semibold">Main Skill<select name="mainSkill" required defaultValue={SKILL_KEYS.find(key => normalizeRuleKey(key) === normalizeRuleKey(archetype?.mainSkill ?? "learning")) ?? ""} className={inputClass}>
            <option value="" disabled>Choose a skill</option>{SKILL_KEYS.map(key => <option key={key} value={key}>{displayKey(key)}</option>)}
          </select></label>
          <label className="block font-semibold">Minimum Resources<input name="startingResourcesMin" required type="number" min={0} max={10} defaultValue={archetype?.startingResourcesMin ?? 0} className={inputClass} /></label>
          <label className="block font-semibold">Maximum Resources<input name="startingResourcesMax" required type="number" min={0} max={10} defaultValue={archetype?.startingResourcesMax ?? 0} className={inputClass} /></label>
        </div>
      </section>
      <section className="space-y-3">
        <h3 className="ledger-bar">Starting Talents</h3>
        <p className="text-sm">Select the talents offered at character creation. Players choose one. With no configured list, existing general/archetype talents remain available.</p>
        <p className="text-sm"><Link className="underline" href="/admin/talents">Manage talent records</Link>. For a new archetype, save it first, create its talents, then return here.</p>
        <div className="grid gap-3 sm:grid-cols-2">
          {eligibleTalents.map(talent => <label key={talent.id} className="flex gap-3 items-center border border-[var(--ledger-line)] p-3">
            <input type="checkbox" checked={talentIds.includes(talent.id)} onChange={event => setTalentIds(current => event.target.checked ? [...current, talent.id] : current.filter(id => id !== talent.id))} />
            <span>{talent.name}</span>
          </label>)}
        </div>
        {!eligibleTalents.length && <p className="ledger-status">No eligible talent records yet. Create them in Talents.</p>}
      </section>
      <section className="space-y-4">
        <h3 className="ledger-bar">Starting Equipment</h3>
        <p className="text-sm">Each group grants one selected item. A single option is fixed equipment; multiple options mean choose one. Quantities come from the template, not the player.</p>
        <p className="text-sm"><Link className="underline" href="/admin/items">Manage item records</Link> before linking them here. Leaving this empty keeps the legacy free equipment selection.</p>
        {groups.map((group, index) => <fieldset key={index} className="border border-[var(--ledger-line)] p-4 space-y-3 min-w-0">
          <legend className="px-2 font-bold">Equipment Group {index + 1}</legend>
          <div className="grid gap-3 sm:grid-cols-[1fr_120px]">
            <label className="block">Group Label<input required maxLength={100} value={group.label} onChange={event => updateGroup(index, { label: event.target.value })} className={inputClass} placeholder="Books or maps" /></label>
            <label className="block">Quantity<input required type="number" min={1} max={99} value={group.quantity} onChange={event => updateGroup(index, { quantity: Number(event.target.value) })} className={inputClass} /></label>
          </div>
          {group.itemIds.map((itemId, optionIndex) => <div key={optionIndex} className="flex flex-wrap gap-2 items-end">
            <label className="flex-1 min-w-0">Option {optionIndex + 1}<select required value={itemId} onChange={event => updateGroup(index, { itemIds: group.itemIds.map((id, position) => position === optionIndex ? event.target.value : id) })} className={inputClass}>
              <option value="">Choose an item</option>{items.filter(item => item.type !== "MAGIC").map(item => <option key={item.id} value={item.id}>{item.name}</option>)}
            </select></label>
            <button type="button" aria-label={`Remove option ${optionIndex + 1} from group ${index + 1}`} className="ledger-button" onClick={() => updateGroup(index, { itemIds: group.itemIds.filter((_, position) => position !== optionIndex) })}>Remove</button>
          </div>)}
          <div className="flex flex-wrap gap-2">
            <button type="button" className="ledger-button" onClick={() => updateGroup(index, { itemIds: [...group.itemIds, ""] })}>Add Alternative</button>
            <button type="button" className="ledger-button" onClick={() => setGroups(current => current.filter((_, position) => position !== index))}>Remove Group</button>
          </div>
        </fieldset>)}
        <button type="button" className="ledger-button" onClick={() => setGroups(current => [...current, { label: "", quantity: 1, itemIds: [""] }])}>Add Equipment Group</button>
      </section>
      <div className="flex flex-wrap justify-end gap-3">
        <Link href="/admin/archetypes" className="ledger-button">Cancel</Link>
        <button type="submit" className="ledger-button ledger-button-primary">{loading ? "Saving..." : "Save Archetype"}</button>
      </div>
    </fieldset>
  </form>;
}
