"use client";
import { useState, type FormEvent } from "react";
import Link from "next/link";
import type { SkillDefinition } from "@prisma/client";
import { saveSkillReference } from "../actions";
import { suggestionLines } from "@/lib/archetype-template";
import { skillReferenceSchema } from "@/lib/skill-reference";
export default function SkillForm({ skill }: { skill: SkillDefinition }) {
  const [error,setError]=useState(""); const [saving,setSaving]=useState(false);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); const form=new FormData(event.currentTarget);
    const parsed=skillReferenceSchema.safeParse({key:skill.key,description:form.get("description"),extraSuccesses:suggestionLines(String(form.get("extraSuccesses"))),guidance:suggestionLines(String(form.get("guidance"))),sourceBook:String(form.get("sourceBook")) || null,sourcePages:String(form.get("sourcePages")).split(/[,\s]+/).filter(Boolean).map(Number)});
    if(!parsed.success) {setError(parsed.error.issues.map(i=>i.message).join("; "));return;}
    setError("");setSaving(true);
    try {await saveSkillReference(parsed.data);window.location.assign("/admin/skills");} catch(e) {setError(e instanceof Error?e.message:"Could not save this skill.");setSaving(false);}
  }
  return <form onSubmit={submit} className="ledger-panel p-5 space-y-4"><h2 className="text-2xl font-bold">{skill.name}</h2><p className="capitalize">Attribute: {skill.attribute}</p>
    {error && <p role="alert" className="ledger-status">{error}</p>}
    <label className="block space-y-1"><span className="font-bold">Description</span><textarea name="description" required defaultValue={skill.description} rows={7} className="ledger-input w-full"/></label>
    <label className="block space-y-1"><span className="font-bold">Extra successes (one per line)</span><textarea name="extraSuccesses" defaultValue={skill.extraSuccesses.join("\n")} rows={6} className="ledger-input w-full"/></label>
    <label className="block space-y-1"><span className="font-bold">Requirements and rulings (one per line)</span><textarea name="guidance" defaultValue={skill.guidance.join("\n")} rows={6} className="ledger-input w-full"/></label>
    <div className="grid gap-4 sm:grid-cols-2"><label className="block space-y-1"><span className="font-bold">Source book</span><input name="sourceBook" defaultValue={skill.sourceBook || ""} className="ledger-input w-full"/></label><label className="block space-y-1"><span className="font-bold">Printed pages (comma separated)</span><input name="sourcePages" defaultValue={skill.sourcePages.join(", ")} className="ledger-input w-full"/></label></div>
    <div className="flex flex-wrap gap-3"><button className="ledger-button ledger-button-primary" disabled={saving}>{saving?"Saving...":"Save Reference"}</button><Link href="/admin/skills" className="ledger-button">Cancel</Link></div>
  </form>;
}
