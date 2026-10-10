"use client";

import type { Item, SkillDefinition, Talent } from "@prisma/client";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Check, ChevronLeft, ChevronRight } from "lucide-react";
import { createPlayerCharacter } from "../actions";
import { initialState, firstIncompleteStep, restoreCharacterDraft, type WizardState } from "@/lib/character-draft";
import { characterCreationSchema, validateCharacterAllocation } from "@/lib/character-rules";
import { resolveStartingEquipment, type ArchetypeTemplate } from "@/lib/archetype-template";
import { CREATION_STEPS, CREATION_HINTS, changesCreationFoundation, hasDependentChoices, updateCreationState, canContinueCreation } from "@/lib/creation-flow";
import VaesenMark from "@/components/vaesen-mark";
import StepName from "./step-name";
import Step1Archetype from "./step1-archetype";
import Step2Age from "./step2-age";
import Step3Attributes from "./step3-attributes";
import Step4Skills from "./step4-skills";
import Step5Details from "./step5-details";
import Step6Equipment from "./step6-equipment";

export type { WizardState } from "@/lib/character-draft";
export type WizardStepProps = { data: WizardState; update: (fields: Partial<WizardState>) => void; onNext: () => void; onPrev: () => void };
const displayKey = (value: string) => value.replace(/([A-Z])/g, " $1");

export default function Wizard({ archetypes, talents, items, skills, userId }: { archetypes: ArchetypeTemplate[]; talents: Talent[]; items: Item[]; skills: SkillDefinition[]; userId: string }) {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [furthest, setFurthest] = useState(1);
  const [data, setData] = useState<WizardState>(initialState);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [draftNotice, setDraftNotice] = useState("");
  const [ready, setReady] = useState(false);
  const [pendingChange, setPendingChange] = useState<Partial<WizardState> | null>(null);
  const completed = useRef(false);
  const contentRef = useRef<HTMLDivElement>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const archetype = archetypes.find(entry => entry.id === data.archetypeId);
  const draftKey = `vaesen-character-draft:${userId}`;
  const incomplete = firstIncompleteStep(data, archetype);
  const attributeRemaining = data.attributeAllowance - Object.values(data.attributes).reduce((a,b) => a+b,0);
  const skillRemaining = data.skillAllowance - Object.values(data.skills).reduce((a,b) => a+b,0) - data.resources + data.minResources;
  const canProceed = canContinueCreation(step, data, archetype);
  const talent = talents.find(entry => entry.id === data.talentId);
  let gear: { id: string; name: string; quantity: number }[] = data.equipment.map(item => ({ id: item.id, name: item.name, quantity: 1 }));
  if (archetype?.equipmentGroups?.length) {
    // Include resolved groups in the live preview even before all alternatives are chosen.
    const quantities = new Map<string, { id: string; name: string; quantity: number }>();
    for (const group of archetype.equipmentGroups) {
      const selected = group.options.find(option => option.itemId === data.equipmentChoices[group.id]) ?? (group.options.length === 1 ? group.options[0] : undefined);
      if (selected) quantities.set(selected.itemId, { id: selected.itemId, name: selected.item.name, quantity: (quantities.get(selected.itemId)?.quantity ?? 0) + group.quantity });
    }
    gear = [...quantities.values()];
  }

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(draftKey);
      if (raw) {
        const draft = restoreCharacterDraft(raw, archetypes, talents, items);
        if (draft) { setData(draft.data); setStep(draft.step); setFurthest(draft.step); setDraftNotice("Your draft was restored."); }
        else sessionStorage.removeItem(draftKey);
      }
    } catch { setDraftNotice("Draft storage is unavailable. Keep this page open until creation is complete."); }
    setReady(true);
  }, [draftKey, archetypes, talents, items]);

  useEffect(() => {
    if (!ready || completed.current) return;
    try { sessionStorage.setItem(draftKey, JSON.stringify({ version: 2, step, data: { ...data, equipment: data.equipment.map(({id}) => ({id})) } })); }
    catch { setDraftNotice("Draft storage is unavailable. Keep this page open until creation is complete."); }
  }, [ready, draftKey, data, step]);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (pendingChange && !dialog?.open) dialog?.showModal();
    else if (!pendingChange && dialog?.open) dialog.close();
  }, [pendingChange]);

  const moveTo = (next: number) => {
    setStep(next); setFurthest(value => Math.max(value, next)); setError("");
    contentRef.current?.scrollIntoView({ behavior: "auto", block: "start" });
    contentRef.current?.focus({ preventScroll: true });
  };
  function applyChange(fields: Partial<WizardState>) {
    if (changesCreationFoundation(data, fields)) {
      if (hasDependentChoices(data) || (fields.archetypeId ? data.archetypeId : data.ageGroup)) setDraftNotice("Allocations, Resources, equipment, and talent were reset. Your name and written background were kept.");
      setFurthest(value => Math.min(value, fields.archetypeId ? 1 : 2));
    }
    setData(previous => updateCreationState(previous, fields));
    setPendingChange(null);
  }
  function updateData(fields: Partial<WizardState>) {
    const alternativeChosen = archetype?.equipmentGroups?.some(group => group.options.length > 1 && data.equipmentChoices[group.id]);
    if (changesCreationFoundation(data, fields) && (hasDependentChoices(data) || alternativeChosen)) setPendingChange(fields);
    else applyChange(fields);
  }
  const nextStep = () => { if (canProceed) moveTo(Math.min(step + 1, 8)); };
  const prevStep = () => moveTo(Math.max(step - 1, 1));
  const props = { data, update: updateData, onNext: nextStep, onPrev: prevStep };

  async function submit() {
    setError("");
    const missing = firstIncompleteStep(data, archetype);
    if (missing < 8) { moveTo(missing); setError("Complete this step before creating your character."); return; }
    setLoading(true);
    try {
      const parsed = characterCreationSchema.parse(data);
      validateCharacterAllocation(parsed, archetype!);
      if (archetype?.equipmentGroups?.length) resolveStartingEquipment(archetype, data.equipmentChoices);
      const characterId = await createPlayerCharacter(parsed);
      completed.current = true;
      try { sessionStorage.removeItem(draftKey); } catch { /* Storage may be disabled. */ }
      router.push(`/characters/${characterId}`);
    } catch (e) { setError(e instanceof Error ? e.message : "Character creation failed. Please try again."); setLoading(false); }
  }

  function preview() {
    return <div className="creation-preview-content">
      <div className="flex items-center gap-3"><VaesenMark className="h-8 w-8" /><div><h2 className="font-bold text-xl">Character so far</h2><p className="text-sm">Your choices, recorded as you go.</p></div></div>
      <h3 className="creation-preview-name">{data.name || "An unknown hunter"}</h3>
      <dl className="space-y-3"><div><dt>Archetype</dt><dd>{archetype?.name || "Not chosen"}</dd></div><div><dt>Age</dt><dd>{data.ageGroup ? data.ageGroup.replaceAll("_", " ").toLowerCase() : "Not chosen"}</dd></div></dl>
      <div className="creation-preview-attributes">{Object.entries(data.attributes).map(([key,value]) => <div key={key}><span>{key}</span><strong>{value}</strong></div>)}</div>
      <dl className="space-y-3"><div><dt>Skills</dt><dd>{Object.entries(data.skills).filter(([,value]) => value > 0).map(([key,value]) => `${displayKey(key)} ${value}`).join(", ") || "Not allocated"}</dd></div><div><dt>Resources</dt><dd>{archetype ? data.resources : "Not set"}</dd></div><div><dt>Talent</dt><dd>{talent?.name || "Not chosen"}</dd></div><div><dt>Equipment</dt><dd>{gear.map(item => `${item.name}${item.quantity > 1 ? ` x${item.quantity}` : ""}`).join(", ") || "Not chosen"}</dd></div></dl>
      <p className="text-sm border-t border-[var(--ledger-line)] pt-3 mt-5">Your private background appears only in the final review, not this preview.</p>
    </div>;
  }
  function reviewSection(title: string, target: number, children: ReactNode) {
    return <section className="creation-review-section"><div className="flex justify-between items-center gap-3"><h3 className="creation-group-title">{title}</h3><button type="button" className="creation-edit" onClick={() => moveTo(target)} aria-label={`Edit ${title}`}>Edit</button></div>{children}</section>;
  }

  if (!ready) return <p role="status" className="p-6">Loading character draft...</p>;
  return <div className="ledger-wizard creation-layout">
    <nav className="creation-progress" aria-label="Character creation steps">
      <p className="creation-group-title">Create your hunter</p>
      {CREATION_STEPS.map((title,index) => <button key={title} type="button" aria-current={step === index + 1 ? "step" : undefined} disabled={loading || index + 1 > Math.min(furthest, incomplete)} onClick={() => moveTo(index + 1)}>
        <span className="creation-step-number">{index + 1 < incomplete ? <Check size={16} aria-hidden="true" /> : index + 1}</span><span>{title}</span>
      </button>)}
      <Link href="/characters" className="creation-exit">Back to characters</Link>
    </nav>
    <section className="creation-main" aria-label="Character wizard">
      <header className="creation-header"><p className="creation-group-title">Step {step} of 8</p><h1>{CREATION_STEPS[step - 1]}</h1><p>{CREATION_HINTS[step - 1]}</p>
        <p className="creation-draft-notice" role="status">{draftNotice || "Draft saved in this browser tab and cleared on logout."}</p>
      </header>
      <details className="creation-preview-mobile"><summary>Character so far</summary>{preview()}</details>
      <div ref={contentRef} tabIndex={-1} className="ledger-wizard-content creation-content">
        {error && <p role="alert" className="ledger-status mb-4 text-[var(--ledger-danger)]">{error}</p>}
        <fieldset disabled={loading} className="min-w-0">
          {step === 1 && <Step1Archetype {...props} archetypes={archetypes} />}
          {step === 2 && <Step2Age {...props} />}
          {step === 3 && <StepName {...props} archetype={archetype} />}
          {step === 4 && <Step3Attributes {...props} />}
          {step === 5 && <Step4Skills {...props} definitions={skills} />}
          {step === 6 && <Step5Details {...props} talents={talents} archetype={archetype} />}
          {step === 7 && <Step6Equipment {...props} items={items} archetype={archetype} onSubmit={nextStep} loading={loading} />}
          {step === 8 && <div className="space-y-4"><h2 className="creation-section-title">Review your hunter</h2><p>Nothing is saved to your character roster until you select Create Character.</p>
            {reviewSection("Identity",3,<dl className="creation-review-dl"><dt>Name</dt><dd>{data.name}</dd><dt>Archetype</dt><dd>{archetype?.name} <button type="button" className="creation-edit" onClick={() => moveTo(1)}>Change archetype</button></dd><dt>Age</dt><dd>{data.ageGroup.replaceAll("_", " ")} <button type="button" className="creation-edit" onClick={() => moveTo(2)}>Change age</button></dd></dl>)}
            {reviewSection("Attributes",4,<dl className="creation-review-dl">{Object.entries(data.attributes).map(([key,value]) => <div key={key}><dt className="capitalize">{key}</dt><dd>{value}</dd></div>)}</dl>)}
            {reviewSection("Skills & Resources",5,<dl className="creation-review-dl">{Object.entries(data.skills).map(([key,value]) => <div key={key}><dt className="capitalize">{displayKey(key)}</dt><dd>{value}</dd></div>)}<div><dt>Resources</dt><dd>{data.resources}</dd></div></dl>)}
            {reviewSection("Background & Talent (private)",6,<dl className="space-y-3 mt-3">{[["Talent",talent?.name],["Motivation",data.motivation],["Trauma",data.trauma],["Dark secret",data.darkSecret],["Relationships",data.relationships || "To be established with the other PCs"],["Memento",data.memento || "None"]].map(([label,value]) => <div key={label}><dt className="font-bold">{label}</dt><dd className="whitespace-pre-wrap break-words">{value}</dd></div>)}</dl>)}
            {reviewSection("Equipment",7,<ul className="list-disc pl-5 mt-3">{gear.length ? gear.map(item => <li key={item.id}>{item.name} x{item.quantity}</li>) : <li>No equipment selected</li>}</ul>)}
          </div>}
        </fieldset>
      </div>
      <footer className="creation-footer">
        <div className="creation-footer-status" role="status">{step === 4 || step === 5 ? <><strong>{step === 4 ? attributeRemaining : skillRemaining}</strong> points remaining</> : step === 8 ? "Ready to record your hunter" : canProceed ? "Step complete" : step === 1 ? "Choose an archetype to continue" : step === 2 ? "Choose an age to continue" : step === 3 ? "Enter a name to continue" : step === 6 ? "Choose a talent and fill the required background" : "Choose equipment from each alternative group"}</div>
        <div className="creation-footer-buttons"><button type="button" className="ledger-button" disabled={step === 1 || loading} onClick={prevStep}><ChevronLeft size={16} />Back</button>
          {step === 8 ? <button type="button" className="ledger-button ledger-button-primary" onClick={submit} disabled={loading}>{loading ? "Creating..." : "Create Character"}</button> : <button type="button" className="ledger-button ledger-button-primary" disabled={loading || !canProceed} onClick={nextStep}>Continue<ChevronRight size={16} /></button>}
        </div>
      </footer>
    </section>
    <aside className="creation-preview-desktop">{preview()}</aside>
    <dialog ref={dialogRef} className="creation-reset-dialog" aria-labelledby="creation-reset-title" onCancel={() => setPendingChange(null)} onClose={() => setPendingChange(null)}>
      <h2 id="creation-reset-title" className="text-2xl font-bold">Change {pendingChange?.archetypeId ? "archetype" : "age"}?</h2>
      <p className="mt-4">This resets your attribute and skill allocations, Resources, starting talent, and equipment choices.</p><p className="mt-3">Your name, motivation, trauma, dark secret, relationships, and memento will be kept.</p>
      <div className="flex flex-wrap gap-3 justify-end mt-6"><button type="button" className="ledger-button" onClick={() => setPendingChange(null)}>Keep current choices</button><button type="button" className="ledger-button ledger-button-primary" onClick={() => { if (pendingChange) applyChange(pendingChange); }}>Change and reset</button></div>
    </dialog>
  </div>;
}
