import { WizardState } from "./wizard";

export default function Step6Equipment({ data, update, items, onSubmit, onPrev, loading }: any) {
  
  const toggleItem = (item: any) => {
    const exists = data.equipment.find((i: any) => i.id === item.id);
    if (exists) {
      update({ equipment: data.equipment.filter((i: any) => i.id !== item.id) });
    } else {
      update({ equipment: [...data.equipment, item] });
    }
  };

  const gearItems = items.filter((i: any) => i.type === 'GEAR');
  const weaponItems = items.filter((i: any) => i.type === 'WEAPON');
  const armorItems = items.filter((i: any) => i.type === 'ARMOR');

  return (
    <div className="space-y-8 animate-in fade-in flex flex-col h-full">
      <div>
        <h2 className="text-2xl font-bold text-white mb-2">Starting Equipment</h2>
        <p className="text-neutral-400">Select standard gear and weapons. Characters generally start with 1-3 useful items depending on Archetype constraints, but select what the GM allows.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
        {/* Weapons */}
        <div className="space-y-3">
          <h3 className="text-sm font-bold uppercase tracking-widest text-red-400 border-b border-red-900/30 pb-1">Weapons</h3>
          {weaponItems.map((item: any) => {
            const selected = !!data.equipment.find((i: any) => i.id === item.id);
            return (
              <button key={item.id} onClick={() => toggleItem(item)} className={`w-full text-left p-2 rounded border text-sm transition-colors ${selected ? 'bg-red-900/20 border-red-500/50 text-white' : 'bg-neutral-950 border-neutral-800 text-neutral-400 hover:border-neutral-600'}`}>
                <div className="flex justify-between items-center font-medium mb-1">
                  <span>{item.name}</span>
                  <span className="text-xs bg-neutral-800 px-1 rounded">Dmg: {item.damage}</span>
                </div>
                {item.description && <p className="text-xs text-neutral-600 line-clamp-1">{item.description}</p>}
              </button>
            )
          })}
        </div>

        {/* Gear */}
        <div className="space-y-3">
          <h3 className="text-sm font-bold uppercase tracking-widest text-indigo-400 border-b border-indigo-900/30 pb-1">Gear</h3>
          {gearItems.map((item: any) => {
            const selected = !!data.equipment.find((i: any) => i.id === item.id);
            return (
              <button key={item.id} onClick={() => toggleItem(item)} className={`w-full text-left p-2 rounded border text-sm transition-colors ${selected ? 'bg-indigo-900/20 border-indigo-500/50 text-white' : 'bg-neutral-950 border-neutral-800 text-neutral-400 hover:border-neutral-600'}`}>
                <div className="flex justify-between items-center font-medium mb-1">
                  <span>{item.name}</span>
                  <span className="text-xs bg-neutral-800 px-1 rounded">Avail: {item.availability}</span>
                </div>
                {item.description && <p className="text-xs text-neutral-600 line-clamp-1">{item.description}</p>}
              </button>
            )
          })}
        </div>
        
        {/* Armor & Magic */}
        <div className="space-y-3">
          <h3 className="text-sm font-bold uppercase tracking-widest text-amber-400 border-b border-amber-900/30 pb-1">Armor & Misc</h3>
          {armorItems.map((item: any) => {
            const selected = !!data.equipment.find((i: any) => i.id === item.id);
            return (
              <button key={item.id} onClick={() => toggleItem(item)} className={`w-full text-left p-2 rounded border text-sm transition-colors ${selected ? 'bg-amber-900/20 border-amber-500/50 text-white' : 'bg-neutral-950 border-neutral-800 text-neutral-400 hover:border-neutral-600'}`}>
                <div className="flex justify-between items-center font-medium mb-1">
                  <span>{item.name}</span>
                  <span className="text-xs bg-neutral-800 px-1 rounded">Bonus: +{item.bonus}</span>
                </div>
                {item.description && <p className="text-xs text-neutral-600 line-clamp-1">{item.description}</p>}
              </button>
            )
          })}
        </div>
      </div>

      <div className="mt-8 flex justify-between flex-grow items-end border-t border-neutral-800 pt-6">
        <button onClick={onPrev} className="text-neutral-400 hover:text-white px-4 py-2 transition-colors">
          Back
        </button>
        <button 
          onClick={onSubmit}
          disabled={loading}
          className="bg-green-600 hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed text-white px-10 py-3 rounded-md font-bold transition-all shadow-[0_0_15px_rgba(22,163,74,0.4)]"
        >
          {loading ? "Forging Hunter..." : "Complete Character"}
        </button>  
      </div>
    </div>
  )
}
