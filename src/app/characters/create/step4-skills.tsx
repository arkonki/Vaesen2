import type { WizardStepProps } from "./wizard";
import { normalizeRuleKey } from "@/lib/character-rules";
import { Plus, Minus } from "lucide-react";

export default function Step4Skills({ data, update, onNext, onPrev }: WizardStepProps) {
  const { skills, skillAllowance, mainSkill, resources, minResources, maxResources } = data;

  const totalUsedSkills = (Object.values(skills) as number[]).reduce((a: number, b: number) => a + b, 0);
  const totalUsedResources = resources - minResources;
  const totalUsed = totalUsedSkills + totalUsedResources;

  const remaining = skillAllowance - totalUsed;
  const isDone = remaining === 0;

  const handleAdjustSkill = (skill: string, amount: number) => {
    const current = skills[skill] || 0;
    const next = current + amount;

    if (next < 0) return;

    // Max is 2, except Main Skill which can be 3
    const isMain = normalizeRuleKey(skill) === normalizeRuleKey(mainSkill);
    const maxAllowed = isMain ? 3 : 2;
    if (next > maxAllowed) return;

    if (amount > 0 && remaining <= 0) return;

    update({ skills: { ...skills, [skill]: next } });
  };

  const handleAdjustResource = (amount: number) => {
    const next = resources + amount;
    if (next < minResources) return;
    if (next > maxResources) return;
    if (amount > 0 && remaining <= 0) return;
    update({ resources: next });
  };

  const skillGroups = [
    { attr: "Physique", list: ["Agility", "Close Combat", "Force"] },
    { attr: "Precision", list: ["Medicine", "Ranged Combat", "Stealth"] },
    { attr: "Logic", list: ["Investigation", "Learning", "Vigilance"] },
    { attr: "Empathy", list: ["Inspiration", "Manipulation", "Observation"] },
  ];

  return (
    <div className="space-y-8 animate-in fade-in flex flex-col h-full">
      <div>
        <h2 className="text-2xl font-bold text-[var(--ledger-ink)] mb-2">Skills & Resources</h2>
        <p className="text-[var(--ledger-ink-soft)]">
          Distribute {skillAllowance} points. Skills cap at 2 (Main Skill: {mainSkill.toUpperCase()} at 3).
          You can also increase your starting Resources (max {maxResources}).
        </p>
        <a href="/compendium?tab=skills" target="_blank" rel="noopener noreferrer" className="ledger-button mt-3">Open Skill Reference</a>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-x-8 gap-y-6">
        {skillGroups.map((group) => (
          <div key={group.attr} className="space-y-2">
            <h3 className="text-xs font-bold uppercase tracking-widest text-[var(--ledger-accent)]">{group.attr}</h3>
            {group.list.map(skillName => {
              const key = skillName.replace(/\s+/g, '').replace(/^[A-Z]/, c => c.toLowerCase());
              const val = skills[key] || 0;
              const isMain = normalizeRuleKey(skillName) === normalizeRuleKey(mainSkill);
              const maxAllowed = isMain ? 3 : 2;

              const atMax = val === maxAllowed || remaining === 0;
              const atMin = val === 0;

              return (
                <div key={key} className={`flex items-center justify-between bg-[var(--ledger-surface-strong)] border ${isMain ? 'border-[var(--ledger-accent)]/65 bg-[rgba(127,48,40,0.12)]' : 'border-[var(--ledger-line)]/55'} p-2 rounded-md`}>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-[var(--ledger-ink)]">{skillName}</span>
                    {isMain && <span className="text-[9px] uppercase font-bold tracking-wider bg-[rgba(127,48,40,0.12)] text-[var(--ledger-ink)] px-1.5 py-0.5 rounded shadow-sm">Main</span>}
                  </div>
                  <div className="flex items-center gap-2 bg-[var(--ledger-paper)] rounded border border-[var(--ledger-line)]/55">
                    <button aria-label={`Decrease ${skillName}`} onClick={() => handleAdjustSkill(key, -1)} disabled={atMin} className="px-2 py-1 text-[var(--ledger-ink-soft)] hover:text-[var(--ledger-ink)] disabled:opacity-30"><Minus className="w-3 h-3" /></button>
                    <span className="w-4 text-center text-sm font-bold text-[var(--ledger-ink)]">{val}</span>
                    <button aria-label={`Increase ${skillName}`} onClick={() => handleAdjustSkill(key, 1)} disabled={atMax} className="px-2 py-1 text-[var(--ledger-ink-soft)] hover:text-[var(--ledger-ink)] disabled:opacity-30"><Plus className="w-3 h-3" /></button>
                  </div>
                </div>
              )
            })}
          </div>
        ))}

        <div className="space-y-2 lg:col-span-2 mt-4 pt-4 border-t border-[var(--ledger-line)]/55">
          <h3 className="text-xs font-bold uppercase tracking-widest text-[var(--ledger-accent)]">Capital</h3>
          <div className="flex items-center justify-between bg-[var(--ledger-surface-strong)] border border-[var(--ledger-accent)]/65 bg-[rgba(127,48,40,0.12)] p-3 rounded-md">
            <div>
              <span className="text-sm font-medium text-[var(--ledger-ink)] block">Resources</span>
              <span className="text-xs text-[var(--ledger-ink-soft)]">Base: {minResources} | Max: {maxResources}. Spends from Skill allowance.</span>
            </div>
            <div className="flex items-center gap-2 bg-[var(--ledger-paper)] rounded border border-[var(--ledger-line)]/55">
              <button
                aria-label="Decrease Resources"
                onClick={() => handleAdjustResource(-1)}
                disabled={resources === minResources}
                className="px-2 py-1 text-[var(--ledger-ink-soft)] hover:text-[var(--ledger-ink)] disabled:opacity-30"
              ><Minus className="w-3 h-3" /></button>
              <span className="w-4 text-center text-sm font-bold text-[var(--ledger-ink)]">{resources}</span>
              <button
                aria-label="Increase Resources"
                onClick={() => handleAdjustResource(1)}
                disabled={resources === maxResources || remaining === 0}
                className="px-2 py-1 text-[var(--ledger-ink-soft)] hover:text-[var(--ledger-ink)] disabled:opacity-30"
              ><Plus className="w-3 h-3" /></button>
            </div>
          </div>
        </div>
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
          {isDone ? "Next Step: Background" : `Allocate ${remaining} more points`}
        </button>
      </div>
    </div>
  )
}
