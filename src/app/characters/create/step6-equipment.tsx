import { useState } from "react";
import { canCarryItem, typeName, type EquipmentItem } from "@/lib/equipment";
import EquipmentDetails from "@/components/equipment-details";
import CreationChoice from "@/components/creation-choice";
import ReferenceHelp from "@/components/reference-help";
import type { WizardStepProps } from "./wizard";
import type { ArchetypeTemplate } from "@/lib/archetype-template";

export default function Step6Equipment({ data, update, items, archetype }: Omit<WizardStepProps, "onNext"> & { items: EquipmentItem[]; archetype?: ArchetypeTemplate; onSubmit: () => void; loading: boolean }) {
  const [search, setSearch] = useState("");
  const groups = archetype?.equipmentGroups ?? [];
  const available = items.filter(item => canCarryItem(item) && item.type !== "MAGIC" && `${item.name} ${typeName(item.type)}`.toLowerCase().includes(search.toLowerCase().trim()));
  function toggle(item: EquipmentItem) {
    const selected = data.equipment.some(entry => entry.id === item.id);
    if (!selected && data.equipment.length >= 50) return;
    update({ equipment: selected ? data.equipment.filter(entry => entry.id !== item.id) : [...data.equipment, item] });
  }
  return <div className="space-y-5">
    <div className="flex items-center gap-2"><h2 className="creation-section-title">Tools of the trade</h2><ReferenceHelp label="Starting equipment">Equipment bonuses apply only when the item helps with the described task. They are not added to every roll. Read each item&apos;s profiles for applicable skills and requirements.</ReferenceHelp></div>
    <p>{groups.length ? "Fixed equipment is included. Choose one item from each alternative group. Opening an item does not select it." : "No equipment template is configured. Choose non-magical equipment with your GM's approval."}</p>
    {groups.length ? groups.map(group => <section key={group.id} className="space-y-2"><h3 className="creation-group-title">{group.label} x{group.quantity} / {group.options.length === 1 ? "Included" : "Choose one"}</h3>{group.options.map(option => <CreationChoice key={option.itemId} title={option.item.name} summary={typeName(option.item.type)} included={group.options.length === 1} selected={data.equipmentChoices[group.id] === option.itemId} onChoose={group.options.length > 1 ? () => update({ equipmentChoices: { ...data.equipmentChoices, [group.id]: option.itemId } }) : undefined}><EquipmentDetails item={option.item} /></CreationChoice>)}</section>) : <>
      <label className="block font-bold text-sm">Find equipment<input type="search" className="ledger-input w-full mt-2" value={search} onChange={event => setSearch(event.target.value)} placeholder="Name or equipment type" /></label>
      <p className="text-sm">{data.equipment.length}/50 equipment entries selected. Choose again to remove an entry.</p>
      <div className="space-y-2">{available.map(item => <CreationChoice key={item.id} title={item.name} summary={typeName(item.type)} selected={data.equipment.some(entry => entry.id === item.id)} onChoose={() => toggle(item)}><EquipmentDetails item={item} /></CreationChoice>)}</div>
      {!available.length && <p className="ledger-status">No matching equipment.</p>}
    </>}
  </div>;
}
