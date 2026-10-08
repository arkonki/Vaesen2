"use client";

import type { Item, Talent } from "@prisma/client";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createPlayerCharacter } from "../actions";
import { initialState, firstIncompleteStep, restoreCharacterDraft, type WizardState } from "@/lib/character-draft";
import { characterCreationSchema, validateCharacterAllocation } from "@/lib/character-rules";
import { resolveStartingEquipment, type ArchetypeTemplate } from "@/lib/archetype-template";
import StepName from "./step-name";
import Step1Archetype from "./step1-archetype";
import Step2Age from "./step2-age";
import Step3Attributes from "./step3-attributes";
import Step4Skills from "./step4-skills";
import Step5Details from "./step5-details";
import Step6Equipment from "./step6-equipment";

export type { WizardState } from "@/lib/character-draft";
export type WizardStepProps = { data: WizardState; update: (fields: Partial<WizardState>) => void; onNext: () => void; onPrev: () => void };
const steps = ["Archetype", "Age", "Name", "Attributes", "Skills", "Background", "Equipment", "Review"];

export default function Wizard({ archetypes, talents, items, userId }: { archetypes: ArchetypeTemplate[]; talents: Talent[]; items: Item[]; userId: string }) {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [furthest, setFurthest] = useState(1);
  const [data, setData] = useState<WizardState>(initialState);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [draftNotice, setDraftNotice] = useState("");
  const [ready, setReady] = useState(false);
  const completed = useRef(false);
  const contentRef = useRef<HTMLDivElement>(null);
  const archetype = archetypes.find(entry => entry.id === data.archetypeId);
  const draftKey = `vaesen-character-draft:${userId}`;

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

  const moveTo = (next: number) => {
    setStep(next); setFurthest(value => Math.max(value, next)); setError("");
    contentRef.current?.scrollIntoView({ behavior: "auto", block: "start" });
    contentRef.current?.focus({ preventScroll: true });
  };
  const updateData = (fields: Partial<WizardState>) => {
    if ((data.archetypeId && fields.archetypeId && fields.archetypeId !== data.archetypeId) || (data.ageGroup && fields.ageGroup && fields.ageGroup !== data.ageGroup)) setDraftNotice("Changing archetype or age resets allocations, resources, equipment, and talent. Your background is kept.");
    setData(prev => {
    const reset = (fields.archetypeId && fields.archetypeId !== prev.archetypeId) || (fields.ageGroup && fields.ageGroup !== prev.ageGroup);
    return { ...prev, ...(reset ? { attributes: { ...initialState.attributes }, skills: { ...initialState.skills }, talentId: "", equipment: [], equipmentChoices: {}, resources: fields.minResources ?? prev.minResources } : {}), ...fields };
    });
  };
  const nextStep = () => moveTo(Math.min(step + 1, 8));
  const prevStep = () => moveTo(Math.max(step - 1, 1));

  async function submit() {
    setError("");
    const missing = firstIncompleteStep(data, archetype);
    if (missing < 8) { moveTo(missing); setError("Complete this step before creating your character."); return; }
    setLoading(true);
    try {
      const parsed = characterCreationSchema.parse(data);
      validateCharacterAllocation(parsed, archetypes.find(a => a.id === data.archetypeId)!);
      const characterId = await createPlayerCharacter(parsed);
      completed.current = true;
      try { sessionStorage.removeItem(draftKey); } catch { /* Storage may be disabled. */ }
      router.push(`/characters/${characterId}`);
    } catch (e) { setError(e instanceof Error ? e.message : "Character creation failed. Please try again."); setLoading(false); }
  }

  if (!ready) return <p role="status" className="p-6">Loading character draft...</p>;
  return (
    <div className="ledger-wizard">
      <nav className="ledger-wizard-progress" aria-label="Character creation steps">
        {steps.map((title, index) => <button key={title} type="button" aria-current={step === index + 1 ? "step" : undefined} disabled={loading || index + 1 > Math.min(furthest, firstIncompleteStep(data, archetype))} onClick={() => moveTo(index + 1)}>{index + 1}. {title}</button>)}
      </nav>
      <div className="border-b border-[var(--ledger-line)] px-4 py-3 text-sm">
        <p role="status">{draftNotice || "Draft stored only in this browser tab and cleared on logout."}</p>
        <p className="mt-1">Step {step} of 8: {steps[step - 1]}</p>
        {(step === 4 || step === 5) && <p className="mt-1 font-bold text-[var(--ledger-accent)]">{step === 4 ? data.attributeAllowance - Object.values(data.attributes).reduce((a,b) => a+b,0) : data.skillAllowance - Object.values(data.skills).reduce((a,b) => a+b,0) - data.resources + data.minResources} points remaining</p>}
      </div>
      <div ref={contentRef} tabIndex={-1} className="ledger-wizard-content scroll-mt-36">
        {error && <p role="alert" className="ledger-status mb-4 text-[var(--ledger-danger)]">{error}</p>}
        {step === 1 && <Step1Archetype data={data} update={updateData} archetypes={archetypes} onNext={nextStep} />}
        {step === 2 && <Step2Age data={data} update={updateData} onNext={nextStep} onPrev={prevStep} />}
        {step === 3 && <StepName data={data} update={updateData} archetype={archetype} onNext={nextStep} onPrev={prevStep} />}
        {step === 4 && <Step3Attributes data={data} update={updateData} onNext={nextStep} onPrev={prevStep} />}
        {step === 5 && <Step4Skills data={data} update={updateData} onNext={nextStep} onPrev={prevStep} />}
        {step === 6 && <Step5Details data={data} update={updateData} talents={talents} archetype={archetype} onNext={nextStep} onPrev={prevStep} />}
        {step === 7 && <Step6Equipment data={data} update={updateData} items={items} archetype={archetype} onSubmit={nextStep} onPrev={prevStep} loading={loading} />}
        {step === 8 && <div className="space-y-5">
          <h2 className="text-2xl font-bold">Review Your Hunter</h2><p>Check the sheet before creating it. Use the steps above to make changes.</p>
          <div className="ledger-review">
            <dl><dt>Name</dt><dd>{data.name}</dd><dt>Archetype</dt><dd>{archetypes.find(a => a.id === data.archetypeId)?.name}</dd><dt>Age group</dt><dd>{data.ageGroup.replaceAll("_", " ")}</dd><dt>Resources</dt><dd>{data.resources}</dd></dl>
            <dl>{Object.entries(data.attributes).map(([key,value]) => <div key={key}><dt className="capitalize">{key}</dt><dd>{value}</dd></div>)}</dl>
            <dl>{Object.entries(data.skills).filter(([,value]) => value > 0).map(([key,value]) => <div key={key}><dt>{key.replace(/([A-Z])/g," $1")}</dt><dd>{value}</dd></div>)}</dl>
            <dl><dt>Talent</dt><dd>{talents.find(t => t.id === data.talentId)?.name}</dd><dt>Equipment</dt><dd>{archetype?.equipmentGroups?.length ? resolveStartingEquipment(archetype, data.equipmentChoices).map(entry => `${items.find(item => item.id === entry.itemId)?.name ?? "Item"} x${entry.quantity}`).join(", ") : data.equipment.map(item => item.name).join(", ") || "None selected"}</dd><dt>Memento</dt><dd>{data.memento || "None"}</dd></dl>
            <dl><dt>Motivation</dt><dd>{data.motivation}</dd><dt>Trauma</dt><dd>{data.trauma}</dd><dt>Dark secret (private)</dt><dd>{data.darkSecret}</dd><dt>Relationships</dt><dd className="whitespace-pre-wrap">{data.relationships || "To be established with the other PCs"}</dd></dl>
          </div>
          <div className="flex flex-wrap justify-between gap-3"><button type="button" className="ledger-button" onClick={prevStep} disabled={loading}>Back to Equipment</button><button type="button" className="ledger-button ledger-button-primary" onClick={submit} disabled={loading}>{loading ? "Creating..." : "Create Character"}</button></div>
        </div>}
      </div>
    </div>
  );
}
