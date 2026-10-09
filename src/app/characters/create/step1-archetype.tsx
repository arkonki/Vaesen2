import type { WizardStepProps } from "./wizard";
import { defaultEquipmentChoices, type ArchetypeTemplate } from "@/lib/archetype-template";

export default function Step1Archetype({ data, update, archetypes, onNext }: Omit<WizardStepProps, "onPrev"> & { archetypes: ArchetypeTemplate[] }) {
  const selected = archetypes.find(archetype => archetype.id === data.archetypeId);
  function choose(archetype: ArchetypeTemplate) {
    if (archetype.id === data.archetypeId) return;
    update({
      archetypeId: archetype.id, mainAttribute: archetype.mainAttribute, mainSkill: archetype.mainSkill,
      minResources: archetype.startingResourcesMin, maxResources: archetype.startingResourcesMax,
      resources: archetype.startingResourcesMin, equipmentChoices: defaultEquipmentChoices(archetype),
    });
  }
  return <div className="space-y-6">
    <div><h2 className="text-2xl font-bold">Choose an Archetype</h2><p className="mt-2">Your archetype is the starting point. Choose it first, then explore its suggested names, background, talents, and equipment.</p></div>
    <div className="grid gap-3 sm:grid-cols-2">
      {archetypes.map(archetype => <button type="button" key={archetype.id} aria-pressed={archetype.id === data.archetypeId} onClick={() => choose(archetype)} className={`ledger-panel p-4 text-left ${archetype.id === data.archetypeId ? "bg-[var(--ledger-paper-deep)] border-[var(--ledger-accent)]" : ""}`}>
        <h3 className="text-xl font-bold">{archetype.name}</h3>
        {archetype.bookKey && <p className="text-xs mt-1">Core book / p. {archetype.sourcePage}</p>}
        <p className="mt-2 text-sm">{archetype.mainAttribute} / {archetype.mainSkill.replace(/([A-Z])/g," $1")}</p>
        <p className="text-sm">Resources {archetype.startingResourcesMin}-{archetype.startingResourcesMax}</p>
        {archetype.flavorText && <p className="mt-2 text-sm italic line-clamp-3">{archetype.flavorText}</p>}
      </button>)}
    </div>
    {!archetypes.length && <p className="ledger-status">No archetypes are available. Ask an administrator to add one.</p>}
    {selected && <article className="ledger-panel p-5 space-y-4">
      <h3 className="ledger-bar">{selected.name}</h3>
      {selected.flavorText && <p className="whitespace-pre-wrap italic leading-relaxed">{selected.flavorText}</p>}
      <dl className="grid gap-3 sm:grid-cols-2">
        <div><dt className="font-bold">Main Attribute</dt><dd className="capitalize">{selected.mainAttribute}</dd></div>
        <div><dt className="font-bold">Main Skill</dt><dd className="capitalize">{selected.mainSkill.replace(/([A-Z])/g," $1")}</dd></div>
        <div><dt className="font-bold">Starting Talents</dt><dd>{selected.startingTalents?.map(entry => entry.talent.name).join(", ") || "Available general and archetype talents"}</dd></div>
        <div><dt className="font-bold">Resources</dt><dd>{selected.startingResourcesMin}-{selected.startingResourcesMax}</dd></div>
        <div className="sm:col-span-2"><dt className="font-bold">Equipment</dt><dd>{selected.equipmentGroups?.length ? selected.equipmentGroups.map(group => `${group.options.map(option => option.item.name).join(" or ")}${group.quantity > 1 ? ` (x${group.quantity})` : ""}`).join("; ") : "Choose gear with your GM"}</dd></div>
      </dl>
      <p className="text-sm">Name and background suggestions are available in the following steps. You may always write your own.</p>
    </article>}
    <div className="flex justify-end border-t border-[var(--ledger-line)] pt-5"><button type="button" disabled={!selected} onClick={onNext} className="ledger-button ledger-button-primary">Next: Age</button></div>
  </div>;
}
