import type { WizardStepProps } from "./wizard";
import { Plus, Minus } from "lucide-react";
import { normalizeRuleKey } from "@/lib/character-rules";
import ReferenceHelp from "@/components/reference-help";

const attributes = [
  { key: "physique", label: "Physique", description: "Physical strength and endurance.", skills: "Agility, Close Combat, Force" },
  { key: "precision", label: "Precision", description: "Coordination and fine motor control.", skills: "Medicine, Ranged Combat, Stealth" },
  { key: "logic", label: "Logic", description: "Reasoning, knowledge, and attention.", skills: "Investigation, Learning, Vigilance" },
  { key: "empathy", label: "Empathy", description: "Understanding and influencing others.", skills: "Inspiration, Manipulation, Observation" },
] as const;
export default function Step3Attributes({ data, update }: WizardStepProps) {
  const remaining = data.attributeAllowance - Object.values(data.attributes).reduce((sum, value) => sum + value, 0);
  function adjust(key: keyof typeof data.attributes, amount: number) {
    const next = data.attributes[key] + amount;
    const max = normalizeRuleKey(key) === normalizeRuleKey(data.mainAttribute) ? 5 : 4;
    if (next < 2 || next > max || (amount > 0 && remaining <= 0)) return;
    update({ attributes: { ...data.attributes, [key]: next } });
  }
  return <div className="space-y-5">
    <div className="flex items-center gap-2"><h2 className="creation-section-title">A hunter&apos;s strengths</h2><ReferenceHelp label="Attributes">Attributes start at 2 and normally cap at 4. Your main attribute can reach 5. A skill check starts with attribute + skill dice, before applicable bonuses and condition penalties.</ReferenceHelp></div>
    <p>Spend all {data.attributeAllowance} points, including the starting values. Main attribute: <strong className="capitalize">{data.mainAttribute}</strong>.</p>
    {attributes.map(attribute => {
      const main = normalizeRuleKey(attribute.key) === normalizeRuleKey(data.mainAttribute);
      return <section key={attribute.key} className={`creation-stat ${main ? "creation-stat-main" : ""}`}>
        <div className="min-w-0"><div className="flex items-center flex-wrap gap-2"><h3 className="font-bold text-xl">{attribute.label}</h3>{main && <span className="creation-badge">Main</span>}<ReferenceHelp label={attribute.label}><p>{attribute.description}</p><p className="mt-2">Skills: {attribute.skills}.</p><p className="mt-2">{attribute.key === "physique" || attribute.key === "precision" ? "Physical" : "Mental"} conditions penalize these skills.</p></ReferenceHelp></div><p className="text-sm text-[var(--ledger-ink-soft)]">{attribute.skills}</p></div>
        <div className="creation-counter"><button type="button" aria-label={`Decrease ${attribute.label}`} disabled={data.attributes[attribute.key] <= 2} onClick={() => adjust(attribute.key, -1)}><Minus size={16} /></button><output aria-label={`${attribute.label} value`}>{data.attributes[attribute.key]}</output><button type="button" aria-label={`Increase ${attribute.label}`} disabled={remaining <= 0 || data.attributes[attribute.key] >= (main ? 5 : 4)} onClick={() => adjust(attribute.key, 1)}><Plus size={16} /></button></div>
      </section>;
    })}
  </div>;
}
