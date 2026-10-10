import type { WizardStepProps } from "./wizard";
import { useState } from "react";
import { defaultEquipmentChoices, type ArchetypeTemplate } from "@/lib/archetype-template";
import CreationChoice from "@/components/creation-choice";
import ReferenceHelp from "@/components/reference-help";
import EquipmentDetails from "@/components/equipment-details";

export default function Step1Archetype({ data, update, archetypes }: Omit<WizardStepProps, "onPrev"> & { archetypes: ArchetypeTemplate[] }) {
  const [search, setSearch] = useState("");
  function choose(archetype: ArchetypeTemplate) {
    if (archetype.id === data.archetypeId) return;
    update({ archetypeId: archetype.id, mainAttribute: archetype.mainAttribute, mainSkill: archetype.mainSkill,
      minResources: archetype.startingResourcesMin, maxResources: archetype.startingResourcesMax,
      resources: archetype.startingResourcesMin, equipmentChoices: defaultEquipmentChoices(archetype) });
  }
  const visible = archetypes.filter(entry => `${entry.name} ${entry.mainAttribute} ${entry.mainSkill}`.toLowerCase().includes(search.toLowerCase().trim()));
  return <div className="space-y-5">
    <div className="flex items-center gap-2"><h2 className="creation-section-title">Your calling</h2><ReferenceHelp label="Archetypes">Your archetype provides a main attribute, main skill, starting talents, Resources range, equipment, and background suggestions. Open entries to compare them; only Choose changes your selection.</ReferenceHelp></div>
    <label className="block text-sm font-bold">Find an archetype<input type="search" className="ledger-input w-full mt-2" placeholder="Name, attribute, or skill" value={search} onChange={event => setSearch(event.target.value)} /></label>
    <p className="text-sm">{data.archetypeId ? `Chosen: ${archetypes.find(entry => entry.id === data.archetypeId)?.name}.` : "No archetype chosen yet."} Open any entry to read more.</p>
    <div className="space-y-3">{visible.map(archetype => <CreationChoice key={archetype.id} title={archetype.name} selected={archetype.id === data.archetypeId} onChoose={() => choose(archetype)}
      summary={<span className="capitalize">{archetype.mainAttribute} / {archetype.mainSkill.replace(/([A-Z])/g," $1")} / Resources {archetype.startingResourcesMin}-{archetype.startingResourcesMax}</span>}>
      {archetype.flavorText && <p className="whitespace-pre-wrap italic leading-relaxed mb-5">{archetype.flavorText}</p>}
      <div className="grid gap-4 sm:grid-cols-2">
        <div><h3 className="font-bold">Main attribute & skill</h3><p className="capitalize">{archetype.mainAttribute} / {archetype.mainSkill.replace(/([A-Z])/g," $1")}</p></div>
        <div><h3 className="font-bold">Resources</h3><p>{archetype.startingResourcesMin}-{archetype.startingResourcesMax}</p></div>
      </div>
      <details className="creation-nested mt-4"><summary>Starting talents</summary><div className="space-y-3 mt-3">{archetype.startingTalents?.length ? archetype.startingTalents.map(({ talent }) => <div key={talent.id}><h4 className="font-bold">{talent.name}</h4><p className="whitespace-pre-wrap">{talent.description}</p></div>) : <p>Choose from the available talents in Background.</p>}</div></details>
      <details className="creation-nested mt-3"><summary>Starting equipment</summary><div className="space-y-4 mt-3">{archetype.equipmentGroups?.length ? archetype.equipmentGroups.map(group => <div key={group.id}><h4 className="font-bold mb-2">{group.label} x{group.quantity}{group.options.length > 1 ? " (choose one)" : " (included)"}</h4>{group.options.map(option => <details className="creation-nested mb-2" key={option.itemId}><summary>{option.item.name}</summary><div className="mt-2"><EquipmentDetails item={option.item} /></div></details>)}</div>) : <p>Choose equipment with your GM.</p>}</div></details>
      <details className="creation-nested mt-3"><summary>Name & background suggestions</summary><div className="mt-3 space-y-3">{[
        ["First names", archetype.firstNameOptions], ["Last names", archetype.lastNameOptions], ["Motivation", archetype.motivationOptions], ["Trauma", archetype.traumaOptions], ["Dark secret", archetype.darkSecretOptions], ["Relationships", archetype.relationshipOptions],
      ].map(([label, options]) => <div key={String(label)}><h4 className="font-bold">{String(label)}</h4><p>{(options as string[]).join("; ") || "Write your own."}</p></div>)}</div></details>
      {archetype.sourceBook && <p className="text-sm mt-4">{archetype.sourceBook}{archetype.sourcePage ? ` / p. ${archetype.sourcePage}` : ""}</p>}
    </CreationChoice>)}</div>
    {!visible.length && <p className="ledger-status">{archetypes.length ? "No matching archetypes. Try another search." : "No archetypes are available. Ask an administrator to add one."}</p>}
  </div>;
}
