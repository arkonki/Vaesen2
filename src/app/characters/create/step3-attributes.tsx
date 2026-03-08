import { WizardState } from "./wizard";
import { Plus, Minus } from "lucide-react";

export default function Step3Attributes({ data, update, onNext, onPrev }: any) {
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
        <h2 className="text-2xl font-bold text-white mb-2">Attributes</h2>
        <p className="text-neutral-400">Distribute your {attributeAllowance} points. Range is 2-4, but your main attribute ({mainAttribute.toUpperCase()}) can reach 5.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {attrs.map((attr) => {
          const isMain = attr.key.toLowerCase() === mainAttribute.toLowerCase();
          const val = attributes[attr.key as keyof typeof attributes];
          const atMax = val === (isMain ? 5 : 4) || (remaining === 0);
          const atMin = val === 2;

          return (
            <div key={attr.key} className={`bg-neutral-900 border p-4 rounded-lg flex items-center justify-between ${isMain ? 'border-indigo-500/50 bg-indigo-950/20' : 'border-neutral-800'}`}>
              <div>
                <div className="flex items-center gap-2">
                   <h3 className="font-bold text-white text-lg">{attr.label}</h3>
                   {isMain && <span className="text-[10px] uppercase font-bold tracking-wider bg-indigo-600 text-white px-2 py-0.5 rounded shadow-sm">Main</span>}
                </div>
                <p className="text-xs text-neutral-500 mt-1">{attr.desc}</p>
              </div>

              <div className="flex items-center gap-3 bg-neutral-950 rounded-lg p-1 border border-neutral-800">
                <button 
                  onClick={() => handleAdjust(attr.key as keyof typeof attributes, -1)}
                  disabled={atMin}
                  className="p-2 text-neutral-400 hover:text-white hover:bg-neutral-800 disabled:opacity-30 disabled:hover:bg-transparent rounded transition-colors"
                >
                  <Minus className="w-4 h-4" />
                </button>
                <div className="w-6 text-center text-xl font-bold text-white tabular-nums">
                  {val}
                </div>
                <button 
                  onClick={() => handleAdjust(attr.key as keyof typeof attributes, 1)}
                  disabled={atMax}
                  className="p-2 text-neutral-400 hover:text-white hover:bg-neutral-800 disabled:opacity-30 disabled:hover:bg-transparent rounded transition-colors"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
            </div>
          )
        })}
      </div>

      <div className="mt-8 flex justify-between flex-grow items-end border-t border-neutral-800 pt-6">
        <button onClick={onPrev} className="text-neutral-400 hover:text-white px-4 py-2 transition-colors">
          Back
        </button>
        <button 
          disabled={!isDone}
          onClick={onNext}
          className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed text-white px-8 py-3 rounded-md font-bold transition-all"
        >
          {isDone ? "Next Step: Skills" : `Allocate ${remaining} more points`}
        </button>  
      </div>
    </div>
  )
}
