import Link from "next/link";
import prisma from "@/lib/prisma";
import { SKILL_KEYS } from "@/lib/character-rules";
import { SKILL_ATTRIBUTES } from "@/lib/skill-reference";
import { skillName } from "@/lib/equipment";
import SkillForm from "./form";

export default async function SkillsPage({ searchParams }: { searchParams: Promise<{ key?: string }> }) {
  const { key } = await searchParams;
  const skills = await prisma.skillDefinition.findMany({ orderBy: { name: "asc" } });
  const selected = SKILL_KEYS.find(value => value === key);
  return <div className="space-y-5"><h1 className="text-3xl font-bold">Skills</h1><p>The twelve game skills and their attribute mappings are fixed. Edit their reference text without changing character ranks or dice calculations.</p>
    {selected ? <SkillForm skill={skills.find(s=>s.key===selected) ?? {key:selected,name:skillName(selected),attribute:SKILL_ATTRIBUTES[selected],description:"",extraSuccesses:[],guidance:[],sourceBook:null,sourcePages:[]}}/> : <div className="grid gap-4 sm:grid-cols-2">{SKILL_KEYS.map(key=><Link key={key} href={`?key=${key}`} className="ledger-panel p-4"><h2 className="text-xl font-bold">{skillName(key)}</h2><p className="capitalize">{SKILL_ATTRIBUTES[key]}</p><p className="mt-2">{skills.some(s=>s.key===key) ? "Edit Reference" : "Add Reference"}</p></Link>)}</div>}
  </div>;
}
