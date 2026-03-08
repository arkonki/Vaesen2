import { WizardState } from "./wizard";

export default function Step1Archetype({ data, update, archetypes, onNext }: any) {
  const handleSelect = (archId: string) => {
    const archetype = archetypes.find((a: any) => a.id === archId);
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
        <h2 className="text-2xl font-bold text-white mb-2">Who are you?</h2>
        <p className="text-neutral-400">Every hunter has a past, embodied by their Archetype.</p>
      </div>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-neutral-300 mb-2">Character Name</label>
          <input 
            type="text" 
            value={data.name} 
            onChange={e => update({ name: e.target.value })}
            placeholder="e.g. Linus"
            className="w-full bg-neutral-950 border border-neutral-800 rounded-md px-4 py-3 text-white focus:outline-none focus:border-indigo-500 transition-colors"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-neutral-300 mb-2">Select Archetype</label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {archetypes.map((arch: any) => {
              const selected = data.archetypeId === arch.id;
              return (
                 <button
                   key={arch.id}
                   onClick={() => handleSelect(arch.id)}
                   className={`text-left p-4 rounded-lg border transition-all ${
                     selected 
                      ? 'bg-indigo-900 border-indigo-500 shadow-[0_0_15px_rgba(99,102,241,0.2)]' 
                      : 'bg-neutral-950 border-neutral-800 hover:border-neutral-700'
                   }`}
                 >
                   <h3 className={`font-bold ${selected ? 'text-white' : 'text-neutral-300'} text-lg mb-1`}>{arch.name}</h3>
                   <div className="text-xs text-neutral-500 space-y-1">
                     <p><span className="text-neutral-400">Main Attribute:</span> <span className="uppercase">{arch.mainAttribute}</span></p>
                     <p><span className="text-neutral-400">Main Skill:</span> {arch.mainSkill}</p>
                     <p><span className="text-neutral-400">Resources:</span> {arch.startingResourcesMin} - {arch.startingResourcesMax}</p>
                   </div>
                 </button>
              )
            })}
          </div>
        </div>
      </div>

      <div className="mt-8 flex justify-end flex-grow items-end border-t border-neutral-800 pt-6">
        <button 
          disabled={!isValid}
          onClick={onNext}
          className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed text-white px-8 py-3 rounded-md font-bold transition-all"
        >
          Next Step: Age & Letal Experience
        </button>  
      </div>
    </div>
  )
}
