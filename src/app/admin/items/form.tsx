"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createItem, updateItem } from "@/app/admin/actions";
import Link from "next/link";
import { EQUIPMENT_TYPES, typeName, profilesFor, equipmentSchema, type EquipmentInput, type EquipmentItem, skillName } from "@/lib/equipment";
import { SKILL_KEYS } from "@/lib/character-rules";

const blankUsage = (): EquipmentInput['usages'][number] => ({ label: "Primary use", kind: "TOOL", skills: [], bonus: 0, effect: "", requirements: "", damage: null, rangeMin: null, rangeMax: null });
const blank = (): EquipmentInput => ({ name: "", type: "GEAR", description: "", availability: 1, bonus: 0, sourceBook: "", sourcePage: null, protection: null, agilityPenalty: null, doses: null, toxicity: null, usages: [blankUsage()] });
function initial(item?: EquipmentItem | null): EquipmentInput {
  if (!item) return blank();
  return { name: item.name, type: item.type, description: item.description || "", availability: item.availability, bonus: item.bonus,
    sourceBook: item.sourceBook, sourcePage: item.sourcePage, protection: item.protection, agilityPenalty: item.agilityPenalty, doses: item.doses, toxicity: item.toxicity,
    usages: profilesFor(item).map(({ label, kind, skills, bonus, effect, requirements, damage, rangeMin, rangeMax }) => ({ label, kind, skills: skills as EquipmentInput['usages'][number]['skills'], bonus, effect, requirements, damage, rangeMin, rangeMax })) };
}
export default function ItemForm({ item }: { item?: EquipmentItem | null }) {
  const router = useRouter();
  const [data, setData] = useState(() => initial(item));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState("");
  const update = (change: Partial<EquipmentInput>) => setData(current => ({ ...current, ...change }));
  const usage = (index: number, change: Partial<EquipmentInput['usages'][number]>) => update({ usages: data.usages.map((u, i) => i === index ? { ...u, ...change } : u) });
  function changeType(type: EquipmentInput['type']) {
    const narrative = ["SERVICE", "COVER", "ARMOR"].includes(type);
    update({ type, protection: ["ARMOR", "COVER"].includes(type) ? data.protection : null, agilityPenalty: type === "ARMOR" ? data.agilityPenalty ?? 0 : null,
      doses: ["SERVICE", "COVER", "ATTACK"].includes(type) ? null : data.doses, toxicity: ["SERVICE", "COVER", "ATTACK"].includes(type) ? null : data.toxicity,
      availability: ["COVER", "ATTACK"].includes(type) ? 0 : data.availability || 1,
      usages: data.usages.map(u => ({ ...u, kind: narrative ? "NARRATIVE" : ["WEAPON", "ATTACK"].includes(type) ? "ATTACK" : "TOOL",
        bonus: narrative ? 0 : u.bonus, damage: narrative || !["WEAPON", "ATTACK"].includes(type) ? null : u.damage ?? 1,
        rangeMin: narrative || !["WEAPON", "ATTACK"].includes(type) ? null : u.rangeMin ?? 0, rangeMax: narrative || !["WEAPON", "ATTACK"].includes(type) ? null : u.rangeMax ?? 0 })) });
  }
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setError(""); setSaved("");
    const another = (event.nativeEvent as SubmitEvent).submitter?.getAttribute("value") === "another";
    const parsed = equipmentSchema.safeParse(data);
    if (!parsed.success) { setError(parsed.error.issues.map(issue => `${issue.path.join(" / ") || "Entry"}: ${issue.message}`).join("; ")); return; }
    setLoading(true);
    try {
      const result = item ? await updateItem(item.id, parsed.data) : await createItem(parsed.data);
      if (another && !item) {
        setData({ ...blank(), type: data.type, sourceBook: data.sourceBook, sourcePage: data.sourcePage,
          availability: ["ATTACK", "COVER"].includes(data.type) ? 0 : 1,
          usages: [{ ...blankUsage(), kind: ["WEAPON", "ATTACK"].includes(data.type) ? "ATTACK" : ["ARMOR", "SERVICE", "COVER"].includes(data.type) ? "NARRATIVE" : "TOOL" }] });
        setSaved(`${result.item.name} saved.${result.duplicateName ? " Another entry has the same name; check the catalogue before adding more." : " Ready for the next entry."}`);
        router.refresh();
      } else window.location.assign(`/admin/items${result.duplicateName ? '?warning=duplicate' : ''}`);
    } catch { setError("Entry could not be saved. Check its fields and any inventory or archetype links before changing category."); }
    finally { setLoading(false); }
  }
  const numberField = (label: string, key: 'availability' | 'bonus' | 'sourcePage' | 'protection' | 'agilityPenalty' | 'doses' | 'toxicity', min = 0, max = 9999) => <label className="block space-y-1"><span className="font-bold">{label}</span><input className="ledger-input w-full" type="number" min={min} max={max} value={data[key] ?? ''} onChange={e => update({ [key]: e.target.value === '' ? null : Number(e.target.value) })} /></label>;
  return <form onSubmit={submit} className="space-y-5 max-w-3xl" aria-busy={loading}>
    {error && <p className="ledger-status" role="alert">{error}</p>}{saved && <p className="ledger-status" role="status">{saved}</p>}
    {item && !item.usages?.length && <p className="ledger-status">Legacy entry: confirm usage profiles and armor/zone fields before saving. Existing values are not guessed.</p>}
    <fieldset disabled={loading} className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block space-y-1"><span className="font-bold">Name</span><input required className="ledger-input w-full" value={data.name} onChange={e => update({ name: e.target.value })} maxLength={150} /></label>
        <label className="block space-y-1"><span className="font-bold">Category</span><select className="ledger-input w-full" value={data.type} onChange={e => changeType(e.target.value as EquipmentInput['type'])}>{EQUIPMENT_TYPES.map(type => <option key={type} value={type}>{typeName(type)}</option>)}</select></label>
      </div>
      <p className="ledger-helper-copy">Availability is a success cost, not money. Use 0 for references or narrative starting gear with no independent price specified. Services affect the party; cover and attack references are not carried gear.</p>
      <div className="grid gap-4 sm:grid-cols-2">{numberField('Availability (0 = not purchased)', 'availability', 0, 5)}{numberField('Listed bonus (book reference)', 'bonus', -20, 20)}</div>
      <label className="block space-y-1"><span className="font-bold">Description</span><textarea className="ledger-input w-full" rows={3} value={data.description} onChange={e => update({ description: e.target.value })} /></label>
      <div className="grid gap-4 sm:grid-cols-2"><label className="block space-y-1"><span className="font-bold">Source book</span><input className="ledger-input w-full" value={data.sourceBook ?? ''} onChange={e => update({ sourceBook: e.target.value })} /></label>{numberField('Printed page', 'sourcePage', 1)}</div>
      {['ARMOR','COVER'].includes(data.type) && <div className="ledger-panel p-4 grid gap-4 sm:grid-cols-2">{numberField('Protection (dice)', 'protection', 1, 30)}{data.type === 'ARMOR' && numberField('Agility penalty (dice to subtract)', 'agilityPenalty', 0, 20)}</div>}
      {!['SERVICE','COVER','ATTACK'].includes(data.type) && <div className="grid gap-4 sm:grid-cols-2">{numberField('Doses per purchase (optional)', 'doses', 1)}{numberField('Poison toxicity (optional)', 'toxicity', 1, 30)}</div>}
      <div className="flex flex-wrap justify-between items-center gap-3"><h3 className="text-xl font-bold">Usage Profiles</h3><button type="button" className="ledger-button" disabled={data.usages.length >= 20} onClick={() => update({ usages: [...data.usages, { ...blankUsage(), kind: ['ARMOR','COVER','SERVICE'].includes(data.type) ? 'NARRATIVE' : ['WEAPON','ATTACK'].includes(data.type) ? 'ATTACK' : 'TOOL' }] })}>Add Usage</button></div>
      <p className="ledger-helper-copy">Use one profile per distinct use. A crowbar can have tool and attack profiles. Narrative effects do not add dice, even when the printed table lists a bonus.</p>
      {data.usages.map((u, index) => <fieldset key={index} className="ledger-panel p-4 space-y-4 min-w-0"><legend className="px-2 font-bold">Usage {index + 1}</legend>
        <div className="grid gap-4 sm:grid-cols-2"><label className="block space-y-1"><span className="font-bold">Usage label</span><input className="ledger-input w-full" value={u.label} onChange={e => usage(index, { label: e.target.value })} /></label>
          <label className="block space-y-1"><span className="font-bold">Usage kind</span><select className="ledger-input w-full" value={u.kind} onChange={e => { const kind = e.target.value as typeof u.kind; usage(index, { kind, bonus: kind === 'NARRATIVE' ? 0 : u.bonus, damage: kind === 'ATTACK' ? u.damage ?? 1 : null, rangeMin: kind === 'ATTACK' ? u.rangeMin ?? 0 : null, rangeMax: kind === 'ATTACK' ? u.rangeMax ?? 0 : null }); }}><option value="TOOL">Skill bonus / tool</option><option value="ATTACK">Attack</option><option value="NARRATIVE">Narrative / service effect</option></select></label></div>
        <fieldset><legend className="font-bold mb-2">Applicable Skills / Required Tests</legend><div className="grid gap-2 sm:grid-cols-3">{SKILL_KEYS.map(key => <label key={key} className="flex gap-2 items-center"><input type="checkbox" checked={u.skills.includes(key)} onChange={e => usage(index, { skills: e.target.checked ? [...u.skills, key] : u.skills.filter(k => k !== key) })} />{skillName(key)}</label>)}</div></fieldset>
        {u.kind !== 'NARRATIVE' && <label className="block space-y-1"><span className="font-bold">Dice bonus</span><input className="ledger-input w-full" type="number" min={-20} max={20} value={u.bonus} onChange={e => usage(index, { bonus: Number(e.target.value) })} /></label>}
        {u.kind === 'ATTACK' && <div className="grid gap-4 sm:grid-cols-3">{(['damage','rangeMin','rangeMax'] as const).map(key => <label key={key} className="block space-y-1"><span className="font-bold">{key === 'damage' ? 'Damage (Conditions)' : key === 'rangeMin' ? 'Minimum zone' : 'Maximum zone'}</span><input className="ledger-input w-full" type="number" min={key === 'damage' ? 1 : 0} max={key === 'damage' ? 30 : 20} value={u[key] ?? ''} onChange={e => usage(index, { [key]: e.target.value === '' ? null : Number(e.target.value) })} /></label>)}</div>}
        <label className="block space-y-1"><span className="font-bold">Effect</span><textarea className="ledger-input w-full" rows={3} value={u.effect} onChange={e => usage(index, { effect: e.target.value })} /></label>
        <label className="block space-y-1"><span className="font-bold">Context / Requirements</span><textarea className="ledger-input w-full" rows={2} value={u.requirements} onChange={e => usage(index, { requirements: e.target.value })} /></label>
        <button type="button" className="ledger-button" onClick={() => update({ usages: data.usages.filter((_, i) => i !== index) })}>Remove Usage {index + 1}</button>
      </fieldset>)}
      <div className="flex flex-wrap gap-3"><button type="submit" className="ledger-button ledger-button-primary">{loading ? 'Saving...' : 'Save Entry'}</button>{!item && <button type="submit" value="another" className="ledger-button">Save &amp; Add Another</button>}<Link className="ledger-button" href="/admin/items">Cancel</Link></div>
    </fieldset>
  </form>;
}
