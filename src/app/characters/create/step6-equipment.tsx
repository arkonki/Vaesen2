import type { Item } from "@prisma/client";
import type { WizardStepProps } from "./wizard";
import { resolveStartingEquipment, type ArchetypeTemplate } from "@/lib/archetype-template";

export default function Step6Equipment({ data, update, items, archetype, onSubmit, onPrev, loading }: Omit<WizardStepProps, "onNext"> & { items: Item[]; archetype?: ArchetypeTemplate; onSubmit: () => void; loading: boolean }) {
  const groups = archetype?.equipmentGroups ?? [];
  let complete = true;
  try { if (groups.length && archetype) resolveStartingEquipment(archetype, data.equipmentChoices); } catch { complete = false; }

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
        <p className="text-[var(--ledger-ink-soft)]">{groups.length ? "Take the fixed equipment and choose one option from each alternative group." : "No starting equipment template is configured. Select non-magical gear with your GM's approval."}</p>
      </div>

      {groups.length ? <div className="space-y-4">{groups.map(group => <fieldset key={group.id} className="ledger-panel p-4 min-w-0"><legend className="px-2 font-bold">{group.label} (x{group.quantity})</legend>
        {group.options.length === 1 ? <p>{group.options[0].item.name} - included</p> : <div className="grid gap-3 sm:grid-cols-2">{group.options.map(option => <label key={option.itemId} className="flex items-center gap-3 border border-[var(--ledger-line)] p-3">
          <input type="radio" name={`equipment-${group.id}`} checked={data.equipmentChoices[group.id] === option.itemId} onChange={() => update({ equipmentChoices: { ...data.equipmentChoices, [group.id]: option.itemId } })} /><span>{option.item.name}</span>
        </label>)}</div>}
      </fieldset>)}</div> : <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
        {/* Weapons */}
        <div className="space-y-3">
          <h3 className="text-sm font-bold uppercase tracking-widest text-[var(--ledger-danger)] border-b border-red-900/30 pb-1">Weapons</h3>
          {weaponItems.map((item: Item) => {
            const selected = !!data.equipment.find((i) => i.id === item.id);
            return (
              <button key={item.id}
                   aria-pressed={selected} onClick={() => toggleItem(item)} className={`w-full text-left p-2 rounded border text-sm transition-colors ${selected ? 'bg-red-900/20 border-red-500/50 text-[var(--ledger-ink)]' : 'bg-[var(--ledger-paper)] border-[var(--ledger-line)]/55 text-[var(--ledger-ink-soft)] hover:border-[var(--ledger-line)]/55'}`}>
                <div className="flex flex-wrap gap-3 justify-between items-center font-medium mb-1">
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
              <button key={item.id}
                   aria-pressed={selected} onClick={() => toggleItem(item)} className={`w-full text-left p-2 rounded border text-sm transition-colors ${selected ? 'bg-[rgba(127,48,40,0.12)] border-[var(--ledger-accent)]/65 text-[var(--ledger-ink)]' : 'bg-[var(--ledger-paper)] border-[var(--ledger-line)]/55 text-[var(--ledger-ink-soft)] hover:border-[var(--ledger-line)]/55'}`}>
                <div className="flex flex-wrap gap-3 justify-between items-center font-medium mb-1">
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
              <button key={item.id}
                   aria-pressed={selected} onClick={() => toggleItem(item)} className={`w-full text-left p-2 rounded border text-sm transition-colors ${selected ? 'bg-[rgba(127,48,40,0.12)] border-[var(--ledger-accent)]/65 text-[var(--ledger-ink)]' : 'bg-[var(--ledger-paper)] border-[var(--ledger-line)]/55 text-[var(--ledger-ink-soft)] hover:border-[var(--ledger-line)]/55'}`}>
                <div className="flex flex-wrap gap-3 justify-between items-center font-medium mb-1">
                  <span>{item.name}</span>
                  <span className="text-xs bg-[var(--ledger-paper-deep)] px-1 rounded">Bonus: +{item.bonus}</span>
                </div>
                {item.description && <p className="text-xs text-[var(--ledger-ink-soft)] line-clamp-1">{item.description}</p>}
              </button>
            )
          })}
        </div>
      </div>}

      <div className="mt-8 flex flex-wrap gap-3 justify-between flex-grow items-end border-t border-[var(--ledger-line)]/55 pt-6">
        <button onClick={onPrev} className="text-[var(--ledger-ink-soft)] hover:text-[var(--ledger-ink)] px-4 py-2 transition-colors">
          Back
        </button>
        <button
          onClick={onSubmit}
          disabled={loading || !complete}
          className="ledger-button ledger-button-primary"
        >
          {loading ? "Preparing..." : "Review Character"}
        </button>
      </div>
    </div>
  )
}
