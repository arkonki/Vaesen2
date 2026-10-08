import type { WizardStepProps } from "./wizard";
import { Plus, Minus } from "lucide-react";

export default function Step3Attributes({ data, update, onNext, onPrev }: WizardStepProps) {
  const { attributes, attributeAllowance, mainAttribute } = data;

  const totalUsed = attributes.physique + attributes.precision + attributes.logic + attributes.empathy;
  const remaining = attributeAllowance - totalUsed;
  const isDone = remaining === 0;

  const handleAdjust = (attr: keyof typeof attributes, amount: number) => {
    const current = attributes[attr];
    const next = current + amount;

    // Bounds check
    if (next < 2) return; // Min is 2

    // Max is 4, except Main Attribute which can be 5
    const isMain = String(attr).toLowerCase() === mainAttribute.toLowerCase();
    const maxAllowed = isMain ? 5 : 4;

    if (next > maxAllowed) return;

    // Point limit check (only stop if increasing)
    if (amount > 0 && remaining <= 0) return;

    update({ attributes: { ...attributes, [attr]: next } });
  };

  const attrs = [
    { key: "physique", label: "Physique", desc: "Raw physical strength and toughness." },
    { key: "precision", label: "Precision", desc: "Agility, aim, and fine motor skills." },
    { key: "logic", label: "Logic", desc: "Intellect, reasoning, and deductive ability." },
    { key: "empathy", label: "Empathy", desc: "Social awareness, manipulation, and reading people." },
  ];

  return (
    <div className="space-y-8 animate-in fade-in flex flex-col h-full">
      <div>
        <h2 className="text-2xl font-bold text-[var(--ledger-ink)] mb-2">Attributes</h2>
        <p className="text-[var(--ledger-ink-soft)]">Distribute your {attributeAllowance} points. Range is 2-4, but your main attribute ({mainAttribute.toUpperCase()}) can reach 5.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {attrs.map((attr) => {
          const isMain = attr.key.toLowerCase() === mainAttribute.toLowerCase();
          const val = attributes[attr.key as keyof typeof attributes];
          const atMax = val === (isMain ? 5 : 4) || (remaining === 0);
          const atMin = val === 2;

          return (
            <div key={attr.key} className={`bg-[var(--ledger-surface-strong)] border p-4 rounded-lg flex items-center justify-between ${isMain ? 'border-[var(--ledger-accent)]/65 bg-[rgba(127,48,40,0.12)]' : 'border-[var(--ledger-line)]/55'}`}>
              <div>
                <div className="flex items-center gap-2">
                   <h3 className="font-bold text-[var(--ledger-ink)] text-lg">{attr.label}</h3>
                   {isMain && <span className="text-[10px] uppercase font-bold tracking-wider bg-[rgba(127,48,40,0.12)] text-[var(--ledger-ink)] px-2 py-0.5 rounded shadow-sm">Main</span>}
                </div>
                <p className="text-xs text-[var(--ledger-ink-soft)] mt-1">{attr.desc}</p>
              </div>

              <div className="flex items-center gap-3 bg-[var(--ledger-paper)] rounded-lg p-1 border border-[var(--ledger-line)]/55">
                <button
                  aria-label={`Decrease ${attr.label}`}
                  onClick={() => handleAdjust(attr.key as keyof typeof attributes, -1)}
                  disabled={atMin}
                  className="p-2 text-[var(--ledger-ink-soft)] hover:text-[var(--ledger-ink)] hover:bg-[var(--ledger-paper-deep)] disabled:opacity-30 disabled:hover:bg-transparent rounded transition-colors"
                >
                  <Minus className="w-4 h-4" />
                </button>
                <div className="w-6 text-center text-xl font-bold text-[var(--ledger-ink)] tabular-nums">
                  {val}
                </div>
                <button
                  aria-label={`Increase ${attr.label}`}
                  onClick={() => handleAdjust(attr.key as keyof typeof attributes, 1)}
                  disabled={atMax}
                  className="p-2 text-[var(--ledger-ink-soft)] hover:text-[var(--ledger-ink)] hover:bg-[var(--ledger-paper-deep)] disabled:opacity-30 disabled:hover:bg-transparent rounded transition-colors"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
            </div>
          )
        })}
      </div>

      <div className="mt-8 flex flex-wrap gap-3 justify-between flex-grow items-end border-t border-[var(--ledger-line)]/55 pt-6">
        <button onClick={onPrev} className="text-[var(--ledger-ink-soft)] hover:text-[var(--ledger-ink)] px-4 py-2 transition-colors">
          Back
        </button>
        <button
          disabled={!isDone}
          onClick={onNext}
          className="bg-[rgba(127,48,40,0.12)] hover:bg-[rgba(127,48,40,0.12)] disabled:opacity-50 disabled:cursor-not-allowed text-[var(--ledger-ink)] px-8 py-3 rounded-md font-bold transition-all"
        >
          {isDone ? "Next Step: Skills" : `Allocate ${remaining} more points`}
        </button>
      </div>
    </div>
  )
}
