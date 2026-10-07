import type { Archetype } from "@prisma/client";
import type { WizardStepProps } from "./wizard";

export default function Step1Archetype({ data, update, archetypes, onNext }: Omit<WizardStepProps, "onPrev"> & { archetypes: Archetype[] }) {
  const handleSelect = (archId: string) => {
    const archetype = archetypes.find((a) => a.id === archId);
    if (!archetype) return;

    update({
      archetypeId: archetype.id,
      mainAttribute: archetype.mainAttribute,
      mainSkill: archetype.mainSkill,
      minResources: archetype.startingResourcesMin,
      maxResources: archetype.startingResourcesMax,
      resources: archetype.startingResourcesMin, // Reset resources to min when switching
    });
  };

  const isValid = data.name.trim().length > 0 && data.archetypeId !== "";

  return (
    <div className="space-y-8 animate-in fade-in flex flex-col h-full">
      <div>
        <h2 className="text-2xl font-bold text-[var(--ledger-ink)] mb-2">Who are you?</h2>
        <p className="text-[var(--ledger-ink-soft)]">Every hunter has a past, embodied by their Archetype.</p>
      </div>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-[var(--ledger-ink)] mb-2">Character Name</label>
          <input
            type="text"
            value={data.name}
            onChange={e => update({ name: e.target.value })}
            placeholder="e.g. Linus"
            className="w-full bg-[var(--ledger-paper)] border border-[var(--ledger-line)]/55 rounded-md px-4 py-3 text-[var(--ledger-ink)] focus:outline-none focus:border-[var(--ledger-accent)]/65 transition-colors"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-[var(--ledger-ink)] mb-2">Select Archetype</label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {archetypes.map((arch) => {
              const selected = data.archetypeId === arch.id;
              return (
                 <button
                   key={arch.id}
                   onClick={() => handleSelect(arch.id)}
                   className={`text-left p-4 rounded-lg border transition-all ${
                     selected
                      ? 'bg-[rgba(127,48,40,0.12)] border-[var(--ledger-accent)]/65 shadow-[0_0_15px_rgba(99,102,241,0.2)]'
                      : 'bg-[var(--ledger-paper)] border-[var(--ledger-line)]/55 hover:border-[var(--ledger-line)]/55'
                   }`}
                 >
                   <h3 className={`font-bold ${selected ? 'text-[var(--ledger-ink)]' : 'text-[var(--ledger-ink)]'} text-lg mb-1`}>{arch.name}</h3>
                   <div className="text-xs text-[var(--ledger-ink-soft)] space-y-1">
                     <p><span className="text-[var(--ledger-ink-soft)]">Main Attribute:</span> <span className="uppercase">{arch.mainAttribute}</span></p>
                     <p><span className="text-[var(--ledger-ink-soft)]">Main Skill:</span> {arch.mainSkill}</p>
                     <p><span className="text-[var(--ledger-ink-soft)]">Resources:</span> {arch.startingResourcesMin} - {arch.startingResourcesMax}</p>
                   </div>
                 </button>
              )
            })}
          </div>
        </div>
      </div>

      <div className="mt-8 flex justify-end flex-grow items-end border-t border-[var(--ledger-line)]/55 pt-6">
        <button
          disabled={!isValid}
          onClick={onNext}
          className="bg-[rgba(127,48,40,0.12)] hover:bg-[rgba(127,48,40,0.12)] disabled:opacity-50 disabled:cursor-not-allowed text-[var(--ledger-ink)] px-8 py-3 rounded-md font-bold transition-all"
        >
          Next Step: Age & Letal Experience
        </button>
      </div>
    </div>
  )
}
