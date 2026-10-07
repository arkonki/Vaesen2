import type { Item } from "@prisma/client";
import type { WizardStepProps } from "./wizard";

export default function Step6Equipment({ data, update, items, onSubmit, onPrev, loading }: Omit<WizardStepProps, "onNext"> & { items: Item[]; onSubmit: () => void; loading: boolean }) {

  const toggleItem = (item: Item) => {
    const exists = data.equipment.find((i) => i.id === item.id);
    if (exists) {
      update({ equipment: data.equipment.filter((i) => i.id !== item.id) });
    } else {
      update({ equipment: [...data.equipment, item] });
    }
  };

  const gearItems = items.filter((i) => i.type === 'GEAR');
  const weaponItems = items.filter((i) => i.type === 'WEAPON');
  const armorItems = items.filter((i) => i.type === 'ARMOR');

  return (
    <div className="space-y-8 animate-in fade-in flex flex-col h-full">
      <div>
        <h2 className="text-2xl font-bold text-[var(--ledger-ink)] mb-2">Starting Equipment</h2>
        <p className="text-[var(--ledger-ink-soft)]">Select standard gear and weapons. Characters generally start with 1-3 useful items depending on Archetype constraints, but select what the GM allows.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
        {/* Weapons */}
        <div className="space-y-3">
          <h3 className="text-sm font-bold uppercase tracking-widest text-[var(--ledger-danger)] border-b border-red-900/30 pb-1">Weapons</h3>
          {weaponItems.map((item: Item) => {
            const selected = !!data.equipment.find((i) => i.id === item.id);
            return (
              <button key={item.id} onClick={() => toggleItem(item)} className={`w-full text-left p-2 rounded border text-sm transition-colors ${selected ? 'bg-red-900/20 border-red-500/50 text-[var(--ledger-ink)]' : 'bg-[var(--ledger-paper)] border-[var(--ledger-line)]/55 text-[var(--ledger-ink-soft)] hover:border-[var(--ledger-line)]/55'}`}>
                <div className="flex justify-between items-center font-medium mb-1">
                  <span>{item.name}</span>
                  <span className="text-xs bg-[var(--ledger-paper-deep)] px-1 rounded">Dmg: {item.damage}</span>
                </div>
                {item.description && <p className="text-xs text-[var(--ledger-ink-soft)] line-clamp-1">{item.description}</p>}
              </button>
            )
          })}
        </div>

        {/* Gear */}
        <div className="space-y-3">
          <h3 className="text-sm font-bold uppercase tracking-widest text-[var(--ledger-accent)] border-b border-[var(--ledger-accent)]/65 pb-1">Gear</h3>
          {gearItems.map((item: Item) => {
            const selected = !!data.equipment.find((i) => i.id === item.id);
            return (
              <button key={item.id} onClick={() => toggleItem(item)} className={`w-full text-left p-2 rounded border text-sm transition-colors ${selected ? 'bg-[rgba(127,48,40,0.12)] border-[var(--ledger-accent)]/65 text-[var(--ledger-ink)]' : 'bg-[var(--ledger-paper)] border-[var(--ledger-line)]/55 text-[var(--ledger-ink-soft)] hover:border-[var(--ledger-line)]/55'}`}>
                <div className="flex justify-between items-center font-medium mb-1">
                  <span>{item.name}</span>
                  <span className="text-xs bg-[var(--ledger-paper-deep)] px-1 rounded">Avail: {item.availability}</span>
                </div>
                {item.description && <p className="text-xs text-[var(--ledger-ink-soft)] line-clamp-1">{item.description}</p>}
              </button>
            )
          })}
        </div>

        {/* Armor & Magic */}
        <div className="space-y-3">
          <h3 className="text-sm font-bold uppercase tracking-widest text-[var(--ledger-accent)] border-b border-[var(--ledger-accent)]/65 pb-1">Armor & Misc</h3>
          {armorItems.map((item: Item) => {
            const selected = !!data.equipment.find((i) => i.id === item.id);
            return (
              <button key={item.id} onClick={() => toggleItem(item)} className={`w-full text-left p-2 rounded border text-sm transition-colors ${selected ? 'bg-[rgba(127,48,40,0.12)] border-[var(--ledger-accent)]/65 text-[var(--ledger-ink)]' : 'bg-[var(--ledger-paper)] border-[var(--ledger-line)]/55 text-[var(--ledger-ink-soft)] hover:border-[var(--ledger-line)]/55'}`}>
                <div className="flex justify-between items-center font-medium mb-1">
                  <span>{item.name}</span>
                  <span className="text-xs bg-[var(--ledger-paper-deep)] px-1 rounded">Bonus: +{item.bonus}</span>
                </div>
                {item.description && <p className="text-xs text-[var(--ledger-ink-soft)] line-clamp-1">{item.description}</p>}
              </button>
            )
          })}
        </div>
      </div>

      <div className="mt-8 flex justify-between flex-grow items-end border-t border-[var(--ledger-line)]/55 pt-6">
        <button onClick={onPrev} className="text-[var(--ledger-ink-soft)] hover:text-[var(--ledger-ink)] px-4 py-2 transition-colors">
          Back
        </button>
        <button
          onClick={onSubmit}
          disabled={loading}
          className="bg-green-600 hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed text-[var(--ledger-ink)] px-10 py-3 rounded-md font-bold transition-all shadow-[0_0_15px_rgba(22,163,74,0.4)]"
        >
          {loading ? "Forging Hunter..." : "Complete Character"}
        </button>
      </div>
    </div>
  )
}
