import type { SkillDefinition } from "@prisma/client";
import type { WizardStepProps } from "./wizard";
import { normalizeRuleKey } from "@/lib/character-rules";
import { Plus, Minus } from "lucide-react";
import SkillDetails from "@/components/skill-details";
import ReferenceHelp from "@/components/reference-help";

const groups = [
  { attribute: "physique", label: "Physique", skills: ["Agility", "Close Combat", "Force"] },
  { attribute: "precision", label: "Precision", skills: ["Medicine", "Ranged Combat", "Stealth"] },
  { attribute: "logic", label: "Logic", skills: ["Investigation", "Learning", "Vigilance"] },
  { attribute: "empathy", label: "Empathy", skills: ["Inspiration", "Manipulation", "Observation"] },
] as const;
export default function Step4Skills({ data, update, definitions }: WizardStepProps & { definitions: SkillDefinition[] }) {
  const remaining = data.skillAllowance - Object.values(data.skills).reduce((sum, value) => sum + value, 0) - data.resources + data.minResources;
  function adjust(key: string, amount: number) {
    const next = (data.skills[key] || 0) + amount;
    const max = normalizeRuleKey(key) === normalizeRuleKey(data.mainSkill) ? 3 : 2;
    if (next < 0 || next > max || (amount > 0 && remaining <= 0)) return;
    update({ skills: { ...data.skills, [key]: next } });
  }
  return <div className="space-y-5">
    <div className="flex items-center gap-2"><h2 className="creation-section-title">Skills & Resources</h2><ReferenceHelp label="Skill allocation">Skills start at 0 and cap at 2, except your main skill which can start at 3. Each Resources point above your archetype minimum costs one skill point.</ReferenceHelp></div>
    <p>Spend {data.skillAllowance} points. Main skill: <strong>{data.mainSkill.replace(/([A-Z])/g, " $1")}</strong>. Open a skill for its full rules.</p>
    {groups.map(group => <section key={group.attribute} className="space-y-2"><h3 className="creation-group-title">{group.label} / {group.attribute === "physique" || group.attribute === "precision" ? "Physical" : "Mental"}</h3>
      {group.skills.map(name => {
        const key = name.replace(/\s+/g, "").replace(/^[A-Z]/, c => c.toLowerCase());
        const main = normalizeRuleKey(key) === normalizeRuleKey(data.mainSkill);
        const value = data.skills[key] || 0;
        const definition = definitions.find(entry => normalizeRuleKey(entry.key) === normalizeRuleKey(key));
        return <article key={key} className={`creation-skill ${main ? "creation-stat-main" : ""}`}>
          <details><summary><span>{name}{main && <span className="creation-badge ml-2">Main</span>}<span className="block text-xs font-normal mt-1">Base pool: {data.attributes[group.attribute]} + {value} = {data.attributes[group.attribute] + value} dice</span></span></summary>
            <div className="p-4 border-t border-[var(--ledger-line)]">{definition ? <SkillDetails skill={definition} /> : <p>No skill reference is entered yet. Ask your GM for guidance.</p>}</div>
          </details>
          <div className="creation-counter"><button type="button" aria-label={`Decrease ${name}`} disabled={value <= 0} onClick={() => adjust(key, -1)}><Minus size={16} /></button><output aria-label={`${name} value`}>{value}</output><button type="button" aria-label={`Increase ${name}`} disabled={remaining <= 0 || value >= (main ? 3 : 2)} onClick={() => adjust(key, 1)}><Plus size={16} /></button></div>
        </article>;
      })}
    </section>)}
    <section className="creation-stat creation-stat-main"><div className="min-w-0"><div className="flex items-center gap-2"><h3 className="text-xl font-bold">Resources</h3><ReferenceHelp label="Resources">Resources describe your economic means, not a coin balance. Start at your archetype minimum; increases cost skill points and cannot exceed its maximum.</ReferenceHelp></div><p className="text-sm">Range {data.minResources}-{data.maxResources} / {data.resources - data.minResources} skill points spent</p></div><div className="creation-counter"><button type="button" aria-label="Decrease Resources" disabled={data.resources <= data.minResources} onClick={() => update({ resources: data.resources - 1 })}><Minus size={16} /></button><output aria-label="Resources value">{data.resources}</output><button type="button" aria-label="Increase Resources" disabled={remaining <= 0 || data.resources >= data.maxResources} onClick={() => update({ resources: data.resources + 1 })}><Plus size={16} /></button></div></section>
  </div>;
}
