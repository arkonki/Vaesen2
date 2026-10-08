import type { Talent } from "@prisma/client";
import type { WizardStepProps } from "./wizard";
import { useState } from "react";
import { startingTalentsFor, type ArchetypeTemplate } from "@/lib/archetype-template";

export default function Step5Details({ data, update, talents, archetype, onNext, onPrev }: WizardStepProps & { talents: Talent[]; archetype?: ArchetypeTemplate }) {

  // Filter talents to general ones or ones matching this archetype
  const availableTalents = startingTalentsFor(archetype, talents);
  const [relatedPc, setRelatedPc] = useState("");
  function suggestions(label: string, options: string[] | undefined, field: "motivation" | "trauma" | "darkSecret") {
    return options?.length ? <label className="block mt-2 text-sm">Suggested {label}<select className="ledger-input mt-1 w-full" value="" onChange={event => { if(event.target.value) update({ [field]: event.target.value }); }}>
      <option value="">Choose a suggestion or write your own</option>{options.map(option => <option key={option}>{option}</option>)}
    </select></label> : null;
  }

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
            <label className="block text-sm font-medium text-[var(--ledger-ink)] mb-1" htmlFor="field-create-step5-details-tsx-0">Motivation</label>
            <textarea id="field-create-step5-details-tsx-0"
              required rows={2} value={data.motivation} onChange={e => update({ motivation: e.target.value })}
              placeholder="Why do you hunt Vaesen?"
              className="w-full bg-[var(--ledger-paper)] border border-[var(--ledger-line)]/55 rounded-md px-3 py-2 text-[var(--ledger-ink)] focus:outline-none focus:border-[var(--ledger-accent)]/65"
            />
            {suggestions("Motivation", archetype?.motivationOptions, "motivation")}
          </div>
          <div>
            <label className="block text-sm font-medium text-[var(--ledger-ink)] mb-1" htmlFor="field-create-step5-details-tsx-1">Trauma</label>
            <textarea id="field-create-step5-details-tsx-1"
              required rows={2} value={data.trauma} onChange={e => update({ trauma: e.target.value })}
              placeholder="What terrible event opened your eyes?"
              className="w-full bg-[var(--ledger-paper)] border border-[var(--ledger-line)]/55 rounded-md px-3 py-2 text-[var(--ledger-ink)] focus:outline-none focus:border-[var(--ledger-accent)]/65"
            />
            {suggestions("Trauma", archetype?.traumaOptions, "trauma")}
          </div>
          <div>
            <label className="block text-sm font-medium text-[var(--ledger-ink)] mb-1" htmlFor="field-create-step5-details-tsx-2">Dark Secret</label>
            <textarea id="field-create-step5-details-tsx-2"
              required rows={2} value={data.darkSecret} onChange={e => update({ darkSecret: e.target.value })}
              placeholder="What are you hiding from the others?"
              className="w-full bg-[var(--ledger-paper)] border border-[var(--ledger-line)]/55 rounded-md px-3 py-2 text-[var(--ledger-ink)] focus:outline-none focus:border-[var(--ledger-accent)]/65"
            />
            {suggestions("Dark Secret", archetype?.darkSecretOptions, "darkSecret")}
          </div>
          <div>
            <label className="block font-semibold">Relationships<textarea rows={4} maxLength={50000} value={data.relationships} onChange={event => update({ relationships: event.target.value })} className="ledger-textarea mt-2 w-full" placeholder="Other PC: your relationship" /></label>
            <p className="mt-2 text-sm">Write one relationship for each other PC. You can finish this later when you join a party.</p>
            {!!archetype?.relationshipOptions.length && <div className="mt-3 space-y-2">
              <label className="block text-sm">Other PC&apos;s Name<input value={relatedPc} maxLength={100} onChange={event => setRelatedPc(event.target.value)} className="ledger-input mt-1 w-full" /></label>
              <label className="block text-sm">Suggested Relationship<select value="" disabled={!relatedPc.trim()} className="ledger-input mt-1 w-full" onChange={event => { if (event.target.value && relatedPc.trim()) { update({ relationships: [data.relationships.trim(), `${relatedPc.trim()}: ${event.target.value}`].filter(Boolean).join("\n") }); setRelatedPc(""); } }}>
                <option value="">Add a relationship for this PC</option>{archetype.relationshipOptions.map(option => <option key={option}>{option}</option>)}
              </select></label>
            </div>}
          </div>
          <div>
            <label className="block text-sm font-medium text-[var(--ledger-ink)] mb-1" htmlFor="field-create-step5-details-tsx-3">Memento (Optional)</label>
            <input id="field-create-step5-details-tsx-3"
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
                   aria-pressed={selected}
                    onClick={() => update({ talentId: t.id })}
                    className={`w-full text-left p-3 rounded-md border text-sm transition-all ${
                       selected
                        ? 'bg-[rgba(127,48,40,0.12)] border-[var(--ledger-accent)]/65 shadow-[0_0_10px_rgba(99,102,241,0.1)]'
                        : 'bg-[var(--ledger-paper)] border-[var(--ledger-line)]/55 hover:border-[var(--ledger-line)]/55'
                    }`}
                  >
                    <div className="flex flex-wrap gap-3 justify-between items-center mb-1">
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

      <div className="mt-8 flex flex-wrap gap-3 justify-between flex-grow items-end border-t border-[var(--ledger-line)]/55 pt-6">
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
