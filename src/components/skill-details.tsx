import type { SkillDefinition } from "@prisma/client";
export default function SkillDetails({ skill }: { skill: SkillDefinition }) {
  return <div className="space-y-3 leading-relaxed break-words">
    <p className="text-sm font-bold capitalize">{skill.attribute} / {skill.attribute === "physique" || skill.attribute === "precision" ? "Physical" : "Mental"} Conditions</p>
    <p className="whitespace-pre-wrap">{skill.description}</p>
    {skill.extraSuccesses.length > 0 && <details><summary className="cursor-pointer font-bold">Extra Successes</summary><ul className="mt-2 list-disc pl-5 space-y-2">{skill.extraSuccesses.map((text,index)=><li key={index}>{text}</li>)}</ul></details>}
    {skill.guidance.length > 0 && <details><summary className="cursor-pointer font-bold">Requirements &amp; Rulings</summary><ul className="mt-2 list-disc pl-5 space-y-2">{skill.guidance.map((text,index)=><li key={index}>{text}</li>)}</ul></details>}
    {skill.sourceBook && <p className="text-sm text-[var(--ledger-ink-soft)]">{skill.sourceBook}{skill.sourcePages.length ? `, pp. ${skill.sourcePages.join(", ")}` : ""}</p>}
  </div>;
}
