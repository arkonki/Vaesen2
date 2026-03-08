import { WizardState } from "./wizard";

export default function Step5Details({ data, update, talents, onNext, onPrev }: any) {
  
  // Filter talents to general ones or ones matching this archetype
  const availableTalents = talents.filter((t: any) => t.type === 'GENERAL' || t.archetypeId === data.archetypeId);

  const isValid = 
    data.talentId !== "" && 
    data.motivation.trim() !== "" && 
    data.trauma.trim() !== "" && 
    data.darkSecret.trim() !== "";

  return (
    <div className="space-y-8 animate-in fade-in flex flex-col h-full">
      <div>
        <h2 className="text-2xl font-bold text-white mb-2">Background & Talent</h2>
        <p className="text-neutral-400">Define what drives you, what haunts you, and choose one starting Talent.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Text Fields */}
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-neutral-300 mb-1">Motivation</label>
            <textarea 
              required rows={2} value={data.motivation} onChange={e => update({ motivation: e.target.value })}
              placeholder="Why do you hunt Vaesen?"
              className="w-full bg-neutral-950 border border-neutral-800 rounded-md px-3 py-2 text-white focus:outline-none focus:border-indigo-500" 
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-neutral-300 mb-1">Trauma</label>
            <textarea 
              required rows={2} value={data.trauma} onChange={e => update({ trauma: e.target.value })}
              placeholder="What terrible event opened your eyes?"
              className="w-full bg-neutral-950 border border-neutral-800 rounded-md px-3 py-2 text-white focus:outline-none focus:border-indigo-500" 
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-neutral-300 mb-1">Dark Secret</label>
            <textarea 
              required rows={2} value={data.darkSecret} onChange={e => update({ darkSecret: e.target.value })}
              placeholder="What are you hiding from the others?"
              className="w-full bg-neutral-950 border border-neutral-800 rounded-md px-3 py-2 text-white focus:outline-none focus:border-indigo-500" 
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-neutral-300 mb-1">Memento (Optional)</label>
            <input 
              type="text" value={data.memento} onChange={e => update({ memento: e.target.value })}
              placeholder="An object you hold dear..."
              className="w-full bg-neutral-950 border border-neutral-800 rounded-md px-3 py-2 text-white focus:outline-none focus:border-indigo-500" 
            />
          </div>
        </div>

        {/* Talent Selection */}
        <div>
           <label className="block text-sm font-medium text-neutral-300 mb-2">Starting Talent (Choose 1)</label>
           <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
             {availableTalents.map((t: any) => {
                const selected = data.talentId === t.id;
                return (
                  <button 
                    key={t.id}
                    onClick={() => update({ talentId: t.id })}
                    className={`w-full text-left p-3 rounded-md border text-sm transition-all ${
                       selected 
                        ? 'bg-indigo-900/50 border-indigo-500 shadow-[0_0_10px_rgba(99,102,241,0.1)]' 
                        : 'bg-neutral-950 border-neutral-800 hover:border-neutral-700'
                    }`}
                  >
                    <div className="flex justify-between items-center mb-1">
                      <span className={`font-bold ${selected ? 'text-white' : 'text-neutral-300'}`}>{t.name}</span>
                      <span className={`text-[10px] uppercase font-bold px-1.5 py-0.5 rounded ${t.type === 'ARCHETYPE' ? 'bg-purple-900/50 text-purple-400' : 'bg-neutral-800 text-neutral-400'}`}>{t.type}</span>
                    </div>
                    <p className="text-neutral-500 line-clamp-2">{t.description}</p>
                  </button>
                )
             })}
             {availableTalents.length === 0 && (
               <p className="text-sm text-neutral-500 italic">No associated talents found in the database.</p>
             )}
           </div>
        </div>
      </div>

      <div className="mt-8 flex justify-between flex-grow items-end border-t border-neutral-800 pt-6">
        <button onClick={onPrev} className="text-neutral-400 hover:text-white px-4 py-2 transition-colors">
          Back
        </button>
        <button 
          disabled={!isValid}
          onClick={onNext}
          className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed text-white px-8 py-3 rounded-md font-bold transition-all"
        >
          {isValid ? "Next Step: Equipment" : "Fill Required Fields"}
        </button>  
      </div>
    </div>
  )
}
