"use client";

import type { Archetype, Item, Talent } from "@prisma/client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { createPlayerCharacter } from "../actions";
import { motion, AnimatePresence } from "framer-motion";

import Step1Archetype from "./step1-archetype";
import Step2Age from "./step2-age";
import Step3Attributes from "./step3-attributes";
import Step4Skills from "./step4-skills";
import Step5Details from "./step5-details";
import Step6Equipment from "./step6-equipment";

export type WizardState = {
  name: string;
  archetypeId: string;
  mainAttribute: string;
  mainSkill: string;
  minResources: number;
  maxResources: number;

  ageGroup: "YOUNG" | "MIDDLE_AGED" | "OLD" | "";
  attributeAllowance: number;
  skillAllowance: number;

  attributes: {
    physique: number;
    precision: number;
    logic: number;
    empathy: number;
  };

  skills: Record<string, number>;
  resources: number;

  talentId: string;
  motivation: string;
  trauma: string;
  darkSecret: string;
  memento: string;

  equipment: Item[];
};

const initialState: WizardState = {
  name: "",
  archetypeId: "",
  mainAttribute: "",
  mainSkill: "",
  minResources: 0,
  maxResources: 0,
  ageGroup: "",
  attributeAllowance: 0,
  skillAllowance: 0,
  attributes: { physique: 2, precision: 2, logic: 2, empathy: 2 },
  skills: {
    agility: 0, closeCombat: 0, force: 0, medicine: 0, rangedCombat: 0, stealth: 0,
    investigation: 0, learning: 0, vigilance: 0, inspiration: 0, manipulation: 0, observation: 0
  },
  resources: 0,
  talentId: "",
  motivation: "",
  trauma: "",
  darkSecret: "",
  memento: "",
  equipment: []
};

export type WizardStepProps = { data: WizardState; update: (fields: Partial<WizardState>) => void; onNext: () => void; onPrev: () => void };

export default function Wizard({ archetypes, talents, items, userId }: { archetypes: Archetype[]; talents: Talent[]; items: Item[]; userId: string }) {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [data, setData] = useState<WizardState>(initialState);
  const [loading, setLoading] = useState(false);

  const totalSteps = 6;

  const updateData = (fields: Partial<WizardState>) => {
    setData(prev => {
      const reset = (fields.archetypeId && fields.archetypeId !== prev.archetypeId) ||
        (fields.ageGroup && fields.ageGroup !== prev.ageGroup);
      return { ...prev, ...(reset ? {
        attributes: { ...initialState.attributes }, skills: { ...initialState.skills },
        talentId: "", equipment: [], resources: fields.minResources ?? prev.minResources,
      } : {}), ...fields };
    });
  };

  const nextStep = () => setStep(s => Math.min(s + 1, totalSteps));
  const prevStep = () => setStep(s => Math.max(s - 1, 1));

  const submit = async () => {
    setLoading(true);
    try {
      const characterId = await createPlayerCharacter({ ...data, userId });
      router.push(`/characters/${characterId}`);
    } catch (e) {
      alert(e instanceof Error ? e.message : "Character creation failed");
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col md:flex-row min-h-[600px] bg-[var(--ledger-surface-strong)] overflow-hidden">
      {/* Sidebar Progress Tracker */}
      <div className="w-full md:w-64 bg-[var(--ledger-paper)] border-r border-[var(--ledger-line)]/55 p-6 flex flex-col">
        <h3 className="text-lg font-bold text-[var(--ledger-accent)] mb-6 tracking-wide uppercase">Creation Steps</h3>
        <nav className="space-y-4 flex-1">
          <StepLink num={1} current={step} title="Archetype & Name" />
          <StepLink num={2} current={step} title="Age & Allowances" />
          <StepLink num={3} current={step} title="Attributes" />
          <StepLink num={4} current={step} title="Skills & Resources" />
          <StepLink num={5} current={step} title="Background & Talent" />
          <StepLink num={6} current={step} title="Equipment" />
        </nav>

        {/* Live Counters */}
        {(step === 3 || step === 4) && (
          <div className="mt-8 pt-6 border-t border-[var(--ledger-line)]/55">
             <h4 className="text-sm font-semibold text-[var(--ledger-ink-soft)] uppercase tracking-wider mb-3">Allocations</h4>
             {step === 3 && (
               <PointTracker
                 label="Attributes"
                 used={Object.values(data.attributes).reduce((a, b) => a + b, 0)}
                 max={data.attributeAllowance}
               />
             )}
             {step === 4 && (
               <PointTracker
                 label="Skills"
                 used={Object.values(data.skills).reduce((a, b) => a + b, 0) + (data.resources - data.minResources)}
                 max={data.skillAllowance}
               />
             )}
          </div>
        )}
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col p-6 md:p-10 bg-[var(--ledger-surface-strong)] relative">
        <div className="flex-1">
          <AnimatePresence mode="wait">
            <motion.div
              key={step}
              initial={{ x: 20, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: -20, opacity: 0 }}
              transition={{ duration: 0.2 }}
            >
              {step === 1 && <Step1Archetype data={data} update={updateData} archetypes={archetypes} onNext={nextStep} />}
              {step === 2 && <Step2Age data={data} update={updateData} onNext={nextStep} onPrev={prevStep} />}
              {step === 3 && <Step3Attributes data={data} update={updateData} onNext={nextStep} onPrev={prevStep} />}
              {step === 4 && <Step4Skills data={data} update={updateData} onNext={nextStep} onPrev={prevStep} />}
              {step === 5 && <Step5Details data={data} update={updateData} talents={talents} onNext={nextStep} onPrev={prevStep} />}
              {step === 6 && <Step6Equipment data={data} update={updateData} items={items} onSubmit={submit} onPrev={prevStep} loading={loading} />}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}

function StepLink({ num, current, title }: { num: number; current: number; title: string }) {
  const isActive = current === num;
  const isPast = current > num;
  return (
    <div className={`flex items-center gap-3 ${isActive ? 'text-[var(--ledger-ink)]' : isPast ? 'text-[var(--ledger-accent)]' : 'text-[var(--ledger-ink-soft)]'} transition-colors`}>
      <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${isActive ? 'bg-[rgba(127,48,40,0.12)] text-[var(--ledger-ink)]' : isPast ? 'bg-[rgba(127,48,40,0.12)] text-[var(--ledger-accent)]' : 'bg-[var(--ledger-paper-deep)] text-[var(--ledger-ink-soft)]'}`}>
        {num}
      </div>
      <span className={`text-sm ${isActive ? 'font-semibold' : 'font-medium'}`}>{title}</span>
    </div>
  );
}

function PointTracker({ label, used, max }: { label: string; used: number; max: number }) {
  const remaining = max - used;
  const isOver = remaining < 0;
  const isDone = remaining === 0;

  return (
    <div className="bg-[var(--ledger-paper)] p-4 rounded-md border border-[var(--ledger-line)]/55">
      <div className="flex justify-between items-end mb-2">
         <span className="text-sm font-medium text-[var(--ledger-ink)]">{label}</span>
         <span className={`text-2xl font-bold ${isOver ? 'text-[var(--ledger-danger)]' : isDone ? 'text-[var(--ledger-success)]' : 'text-[var(--ledger-accent)]'}`}>
           {remaining}
         </span>
      </div>
      <div className="w-full bg-[var(--ledger-paper-deep)] h-2 rounded-full overflow-hidden">
        <div
          className={`h-full transition-all duration-300 ${isOver ? 'bg-red-500' : isDone ? 'bg-green-500' : 'bg-[rgba(127,48,40,0.12)]'}`}
          style={{ width: `${Math.min((used / max) * 100, 100)}%` }}
        />
      </div>
    </div>
  );
}
