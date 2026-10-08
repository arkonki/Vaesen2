import type { WizardState, WizardStepProps } from "./wizard";

export default function Step2Age({ data, update, onNext, onPrev }: WizardStepProps) {

  const setAge = (group: WizardState['ageGroup'], attrPts: number, skillPts: number) => {
    update({
      ageGroup: group,
      attributeAllowance: attrPts,
      skillAllowance: skillPts
    });
  };

  const ages = [
    { group: "YOUNG", label: "Young", range: "17-25", attrs: 15, skills: 10, desc: "Brimming with vitality, but lacking experience." },
    { group: "MIDDLE_AGED", label: "Middle-aged", range: "26-50", attrs: 14, skills: 12, desc: "Balanced body and mind. Have seen the world." },
    { group: "OLD", label: "Old", range: "51+", attrs: 13, skills: 14, desc: "Frail bodies, but a wealth of hard-earned knowledge." },
  ];

  const isValid = data.ageGroup !== "";

  return (
    <div className="space-y-8 animate-in fade-in flex flex-col h-full">
      <div>
        <h2 className="text-2xl font-bold text-[var(--ledger-ink)] mb-2">How old are you?</h2>
        <p className="text-[var(--ledger-ink-soft)]">Your age determines the number of Attribute and Skill points available.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {ages.map((a) => {
          const selected = data.ageGroup === a.group;
          return (
            <button
              key={a.group}
                   aria-pressed={selected}
              onClick={() => setAge(a.group as WizardState["ageGroup"], a.attrs, a.skills)}
              className={`text-left p-6 rounded-lg border transition-all flex flex-col h-full ${
                selected
                 ? 'bg-[rgba(127,48,40,0.12)] border-[var(--ledger-accent)]/65 shadow-sm'
                 : 'bg-[var(--ledger-paper)] border-[var(--ledger-line)]/55 hover:border-[var(--ledger-line)]/55'
              }`}
            >
              <h3 className={`font-bold text-xl mb-1 ${selected ? 'text-[var(--ledger-ink)]' : 'text-[var(--ledger-ink)]'}`}>{a.label}</h3>
              <p className="text-sm text-[var(--ledger-accent)] mb-4">{a.range} years</p>

              <div className="space-y-2 mt-auto text-sm">
                <div className="flex flex-wrap gap-3 justify-between items-center bg-[var(--ledger-surface-strong)] p-2 rounded border border-[var(--ledger-line)]/55">
                  <span className="text-[var(--ledger-ink-soft)]">Attributes</span>
                  <span className="font-bold text-[var(--ledger-ink)]">{a.attrs}</span>
                </div>
                <div className="flex flex-wrap gap-3 justify-between items-center bg-[var(--ledger-surface-strong)] p-2 rounded border border-[var(--ledger-line)]/55">
                  <span className="text-[var(--ledger-ink-soft)]">Skills</span>
                  <span className="font-bold text-[var(--ledger-ink)]">{a.skills}</span>
                </div>
              </div>
              <p className="text-xs text-[var(--ledger-ink-soft)] mt-4 leading-relaxed">{a.desc}</p>
            </button>
          )
        })}
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
          Next: Name
        </button>
      </div>
    </div>
  )
}
