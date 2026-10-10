import type { Talent } from "@prisma/client";
import type { WizardStepProps } from "./wizard";
import { useState } from "react";
import { startingTalentsFor, type ArchetypeTemplate } from "@/lib/archetype-template";
import CreationChoice from "@/components/creation-choice";
import ReferenceHelp from "@/components/reference-help";

export default function Step5Details({ data, update, talents, archetype }: WizardStepProps & { talents: Talent[]; archetype?: ArchetypeTemplate }) {
  const available = startingTalentsFor(archetype, talents);
  const [relatedPc, setRelatedPc] = useState("");
  const fields = [
    { field: "motivation", title: "Motivation", help: "What drives your hunter to investigate the supernatural?", options: archetype?.motivationOptions },
    { field: "trauma", title: "Trauma", help: "The frightening encounter that gave you the Sight: the ability to see vaesen.", options: archetype?.traumaOptions },
    { field: "darkSecret", title: "Dark secret", help: "Something your hunter wants to keep hidden. This is private character information.", options: archetype?.darkSecretOptions },
  ] as const;
  return <div className="space-y-7">
    <section className="space-y-3"><div className="flex items-center gap-2"><h2 className="creation-section-title">Starting talent</h2><ReferenceHelp label="Starting talent">Choose exactly one of the talents available to your archetype. Open an entry to read its full effect before selecting it.</ReferenceHelp></div>
      {available.map(talent => <CreationChoice key={talent.id} title={talent.name} summary={talent.type === "ARCHETYPE" ? "Archetype talent" : "General talent"} selected={data.talentId === talent.id} onChoose={() => update({ talentId: talent.id })}><p className="whitespace-pre-wrap leading-relaxed">{talent.description}</p></CreationChoice>)}
      {!available.length && <p className="ledger-status">No starting talents are configured. Ask an administrator to link talents to this archetype.</p>}
    </section>
    <section className="space-y-5"><h2 className="creation-section-title">What haunts you</h2>{fields.map(({ field, title, help, options }) => <div key={field}>
      <div className="flex items-center gap-2"><label htmlFor={`creation-${field}`} className="font-bold">{title} <span className="text-sm font-normal">(required)</span></label><ReferenceHelp label={title}>{help}</ReferenceHelp></div>
      <textarea id={`creation-${field}`} required rows={3} maxLength={10000} className="ledger-textarea w-full mt-2" value={data[field]} onChange={event => update({ [field]: event.target.value })} placeholder={help} />
      {!!options?.length && <details className="creation-nested mt-2"><summary>Explore {archetype?.name} suggestions</summary><div className="mt-3 space-y-2">{options.map(option => <button type="button" key={option} className="creation-suggestion" onClick={() => { if (!data[field].trim() || data[field] === option || window.confirm(`Replace your current ${title.toLowerCase()} with this suggestion?`)) update({ [field]: option }); }}>{option}</button>)}</div><p className="text-sm mt-2">Suggestions are optional; you may edit them or write your own.</p></details>}
    </div>)}</section>
    <section className="space-y-3"><div className="flex items-center gap-2"><label className="font-bold" htmlFor="creation-relationships">Relationships</label><ReferenceHelp label="Relationships">Describe your relationship with each other player character. You may complete this later when you join a party.</ReferenceHelp></div>
      <textarea id="creation-relationships" rows={3} maxLength={50000} value={data.relationships} onChange={event => update({ relationships: event.target.value })} className="ledger-textarea w-full" placeholder="Other PC: your relationship" />
      {!!archetype?.relationshipOptions.length && <details className="creation-nested"><summary>Suggested relationships</summary><label className="block font-bold text-sm mt-3">Other PC&apos;s name<input className="ledger-input w-full mt-2" maxLength={100} value={relatedPc} onChange={event => setRelatedPc(event.target.value)} /></label><div className="space-y-2 mt-3">{archetype.relationshipOptions.map(option => <button type="button" className="creation-suggestion" key={option} disabled={!relatedPc.trim()} onClick={() => { const value = [data.relationships.trim(), `${relatedPc.trim()}: ${option}`].filter(Boolean).join("\n"); if (value.length <= 50000) { update({ relationships: value }); setRelatedPc(""); } }}>{option}</button>)}</div></details>}
    </section>
    <section><div className="flex items-center gap-2"><label className="font-bold" htmlFor="creation-memento">Memento (optional)</label><ReferenceHelp label="Memento">An object with personal significance to your hunter. Describe your own; it is not an automatic equipment bonus.</ReferenceHelp></div><input id="creation-memento" className="ledger-input w-full mt-2" maxLength={1000} value={data.memento} onChange={event => update({ memento: event.target.value })} placeholder="An object you hold dear" /></section>
  </div>;
}
