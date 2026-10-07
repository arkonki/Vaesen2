import type { Talent } from "@prisma/client";
import type { WizardStepProps } from "./wizard";

export default function Step5Details({ data, update, talents, onNext, onPrev }: WizardStepProps & { talents: Talent[] }) {

  // Filter talents to general ones or ones matching this archetype
  const availableTalents = talents.filter((t) => t.type === 'GENERAL' || t.archetypeId === data.archetypeId);

  const isValid =
    data.talentId !== "" &&
    data.motivation.trim() !== "" &&
    data.trauma.trim() !== "" &&
    data.darkSecret.trim() !== "";

  return (
    <div className="space-y-8 animate-in fade-in flex flex-col h-full">
      <div>
        <h2 className="text-2xl font-bold text-[var(--ledger-ink)] mb-2">Background & Talent</h2>
        <p className="text-[var(--ledger-ink-soft)]">Define what drives you, what haunts you, and choose one starting Talent.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Text Fields */}
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-[var(--ledger-ink)] mb-1">Motivation</label>
            <textarea
              required rows={2} value={data.motivation} onChange={e => update({ motivation: e.target.value })}
              placeholder="Why do you hunt Vaesen?"
              className="w-full bg-[var(--ledger-paper)] border border-[var(--ledger-line)]/55 rounded-md px-3 py-2 text-[var(--ledger-ink)] focus:outline-none focus:border-[var(--ledger-accent)]/65"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-[var(--ledger-ink)] mb-1">Trauma</label>
            <textarea
              required rows={2} value={data.trauma} onChange={e => update({ trauma: e.target.value })}
              placeholder="What terrible event opened your eyes?"
              className="w-full bg-[var(--ledger-paper)] border border-[var(--ledger-line)]/55 rounded-md px-3 py-2 text-[var(--ledger-ink)] focus:outline-none focus:border-[var(--ledger-accent)]/65"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-[var(--ledger-ink)] mb-1">Dark Secret</label>
            <textarea
              required rows={2} value={data.darkSecret} onChange={e => update({ darkSecret: e.target.value })}
              placeholder="What are you hiding from the others?"
              className="w-full bg-[var(--ledger-paper)] border border-[var(--ledger-line)]/55 rounded-md px-3 py-2 text-[var(--ledger-ink)] focus:outline-none focus:border-[var(--ledger-accent)]/65"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-[var(--ledger-ink)] mb-1">Memento (Optional)</label>
            <input
              type="text" value={data.memento} onChange={e => update({ memento: e.target.value })}
              placeholder="An object you hold dear..."
              className="w-full bg-[var(--ledger-paper)] border border-[var(--ledger-line)]/55 rounded-md px-3 py-2 text-[var(--ledger-ink)] focus:outline-none focus:border-[var(--ledger-accent)]/65"
            />
          </div>
        </div>

        {/* Talent Selection */}
        <div>
           <label className="block text-sm font-medium text-[var(--ledger-ink)] mb-2">Starting Talent (Choose 1)</label>
           <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
             {availableTalents.map((t) => {
                const selected = data.talentId === t.id;
                return (
                  <button
                    key={t.id}
                    onClick={() => update({ talentId: t.id })}
                    className={`w-full text-left p-3 rounded-md border text-sm transition-all ${
                       selected
                        ? 'bg-[rgba(127,48,40,0.12)] border-[var(--ledger-accent)]/65 shadow-[0_0_10px_rgba(99,102,241,0.1)]'
                        : 'bg-[var(--ledger-paper)] border-[var(--ledger-line)]/55 hover:border-[var(--ledger-line)]/55'
                    }`}
                  >
                    <div className="flex justify-between items-center mb-1">
                      <span className={`font-bold ${selected ? 'text-[var(--ledger-ink)]' : 'text-[var(--ledger-ink)]'}`}>{t.name}</span>
                      <span className={`text-[10px] uppercase font-bold px-1.5 py-0.5 rounded ${t.type === 'ARCHETYPE' ? 'bg-[rgba(127,48,40,0.12)] text-[var(--ledger-accent)]' : 'bg-[var(--ledger-paper-deep)] text-[var(--ledger-ink-soft)]'}`}>{t.type}</span>
                    </div>
                    <p className="text-[var(--ledger-ink-soft)] line-clamp-2">{t.description}</p>
                  </button>
                )
             })}
             {availableTalents.length === 0 && (
               <p className="text-sm text-[var(--ledger-ink-soft)] italic">No associated talents found in the database.</p>
             )}
           </div>
        </div>
      </div>

      <div className="mt-8 flex justify-between flex-grow items-end border-t border-[var(--ledger-line)]/55 pt-6">
        <button onClick={onPrev} className="text-[var(--ledger-ink-soft)] hover:text-[var(--ledger-ink)] px-4 py-2 transition-colors">
          Back
        </button>
        <button
          disabled={!isValid}
          onClick={onNext}
          className="bg-[rgba(127,48,40,0.12)] hover:bg-[rgba(127,48,40,0.12)] disabled:opacity-50 disabled:cursor-not-allowed text-[var(--ledger-ink)] px-8 py-3 rounded-md font-bold transition-all"
        >
          {isValid ? "Next Step: Equipment" : "Fill Required Fields"}
        </button>
      </div>
    </div>
  )
}
