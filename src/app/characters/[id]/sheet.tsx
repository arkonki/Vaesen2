"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";
import { TalentType, type SkillDefinition as SkillReference } from "@prisma/client";
import { equipmentBonusLabel, profilesFor, skillName, typeName, type EquipmentItem } from "@/lib/equipment";
import EquipmentDetails from "@/components/equipment-details";
import {
  updateCharacterConditions,
  updateCharacterExperience,
  updateCharacterJournal,
} from "@/app/characters/actions";
import { cn } from "@/lib/utils";
import DiceRollerModal from "@/components/dice-roller-modal";
import CharacterAdvancement from "@/components/character-advancement";
import type { AdvancementEntry } from "@/lib/advancement-rules";
import { useRouter } from "next/navigation";

import ReferenceHelp from "@/components/reference-help";
import CreationChoice from "@/components/creation-choice";
import SkillDetails from "@/components/skill-details";
import VaesenMark from "@/components/vaesen-mark";
import CharacterCastleBenefits, { type CharacterCastleBenefit } from "@/components/character-castle-benefits";
import { SHEET_SKILLS, applicableGear, isTemporaryGear, rollModifier, sheetPool } from "@/lib/character-sheet-rules";
import { summarizeConditions } from "@/lib/character-rules";

type ConditionState = Record<string, boolean>;

type Attributes = {
  physique: number;
  precision: number;
  logic: number;
  empathy: number;
};

type Skills = {
  agility: number;
  closeCombat: number;
  force: number;
  medicine: number;
  rangedCombat: number;
  stealth: number;
  investigation: number;
  learning: number;
  vigilance: number;
  inspiration: number;
  manipulation: number;
  observation: number;
};

type SkillKey = keyof Skills;

type SkillDefinition = {
  key: SkillKey;
  label: string;
  attribute: keyof Attributes;
  domain: "physical" | "mental";
};

type TalentSummary = {
  id: string;
  name: string;
  description: string;
  type: TalentType;
};

type InventoryEntry = {
  id: string;
  quantity: number;
  notes: string | null;
  item: EquipmentItem;
};

type CharacterSheetProps = {
  characterId: string;
  viewerId: string;
  canEdit: boolean;
  name: string;
  ageGroup: string;
  archetypeName: string;
  archetypeArchived?: boolean;
  motivation: string;
  trauma: string;
  darkSecret: string;
  memento: string | null;
  resources: number;
  capital: number;
  notes: string;
  relationships: string;
  experiencePoints: number;
  experienceVersion: number;
  advancementHistory: AdvancementEntry[];
  hasMoreAdvancements: boolean;
  availableTalents: TalentSummary[];
  hasSkillRecord: boolean;
  physicalConditions: ConditionState;
  mentalConditions: ConditionState;
  attributes: Attributes;
  skills: Skills;
  talents: TalentSummary[];
  inventory: InventoryEntry[];
  insightsAfflictions: string[];
  skillReferences: SkillReference[];
  castleBenefits: CharacterCastleBenefit[];
};

const MAX_XP_TRACKER = 10;

const PHYSICAL_CONDITIONS = [
  { key: "exhausted", label: "Exhausted" },
  { key: "battered", label: "Battered" },
  { key: "wounded", label: "Wounded" },
  { key: "broken", label: "Broken" },
] as const;

const MENTAL_CONDITIONS = [
  { key: "angry", label: "Angry" },
  { key: "frightened", label: "Frightened" },
  { key: "hopeless", label: "Hopeless" },
  { key: "broken", label: "Broken" },
] as const;

const SKILL_DEFINITIONS: SkillDefinition[] = SHEET_SKILLS;

function formatAgeGroup(value: string) {
  return value
    .replaceAll("_", " ")
    .toLowerCase()
    .replace(/^\w/, (letter) => letter.toUpperCase());
}

function FieldBlock({
  label,
  children,
  compact = false,
}: {
  label: string;
  children: React.ReactNode;
  compact?: boolean;
}) {
  return (
    <div className={cn("ledger-field", compact && "ledger-field-compact")}>
      <span className="ledger-field-label">{label}</span>
      <div className="ledger-field-body">{children}</div>
    </div>
  );
}

function ConditionToggle({
  label,
  checked,
  disabled,
  onChange,
}: {
  label: string;
  checked: boolean;
  disabled: boolean;
  onChange: () => void;
}) {
  return (
    <label className="ledger-condition">
      <input type="checkbox" checked={checked} disabled={disabled} onChange={onChange} />
      <span className="ledger-condition-mark" />
      <span>{label}</span>
    </label>
  );
}

export default function CharacterSheet(props: CharacterSheetProps) {
  const {
    characterId,
    canEdit,
    name,
    ageGroup,
    archetypeName,
    motivation,
    trauma,
    darkSecret,
    memento,
    resources,
    capital,
    attributes,
    skills,
    talents,
    inventory,
    insightsAfflictions,
  } = props;

  const [physicalConditions, setPhysicalConditions] = useState<ConditionState>(props.physicalConditions);
  const [mentalConditions, setMentalConditions] = useState<ConditionState>(props.mentalConditions);
  const [experiencePoints, setExperiencePoints] = useState<number>(props.experiencePoints);
  const [experienceVersion, setExperienceVersion] = useState(props.experienceVersion);
  const [advancementBusy, setAdvancementBusy] = useState(false);
  const router = useRouter();
  useEffect(() => { setExperiencePoints(props.experiencePoints); setExperienceVersion(props.experienceVersion); }, [props.experiencePoints, props.experienceVersion]);
  const [notes, setNotes] = useState<string>(props.notes);
  const [relationships, setRelationships] = useState<string>(props.relationships);
  const [selectedSkill, setSelectedSkill] = useState<SkillKey>("agility");
  const [itemBonus, setItemBonus] = useState<number>(0);
  const [selectedEquipment, setSelectedEquipment] = useState("");
  const [advantages, setAdvantages] = useState<number>(0);
  const [selectedArmor, setSelectedArmor] = useState("");
  const [activeTab, setActiveTab] = useState<"play" | "equipment" | "background" | "notes">("play");
  const [experienceExpanded, setExperienceExpanded] = useState(false);
  const [headerHeight, setHeaderHeight] = useState(108);
  useEffect(() => {
    const header = document.querySelector(".society-header");
    if (!header) return;
    const measure = () => setHeaderHeight(header.getBoundingClientRect().height);
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(header);
    return () => observer.disconnect();
  }, []);
  const [equipmentQuery, setEquipmentQuery] = useState("");
  const [equipmentCategory, setEquipmentCategory] = useState("all");
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const checkHeading = useRef<HTMLHeadingElement>(null);
  const [focusCheck, setFocusCheck] = useState(false);
  useEffect(() => {
    if (activeTab === "play" && focusCheck) {
      checkHeading.current?.focus({ preventScroll: true });
      checkHeading.current?.scrollIntoView({ block: "start" });
      setFocusCheck(false);
    }
  }, [activeTab, focusCheck]);

  const [conditionSaving, setConditionSaving] = useState(false);
  const [xpSaving, setXpSaving] = useState(false);
  const [journalStatus, setJournalStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");

  const initialJournalState = useRef(true);
  const journalQueue = useRef<Promise<unknown>>(Promise.resolve());
  const [mutationError, setMutationError] = useState("");
  const [journalRetry, setJournalRetry] = useState(0);
  const [journalLoaded, setJournalLoaded] = useState(false);
  const [recoveredJournal, setRecoveredJournal] = useState(false);
  const journalKey = `vaesen-journal-draft:${props.viewerId}:${characterId}`;
  const latestJournal = useRef({ notes, relationships });
  latestJournal.current = { notes, relationships };

  useEffect(() => {
    if (!canEdit) return;
    try {
      const raw = sessionStorage.getItem(journalKey);
      if (raw) {
        const draft = JSON.parse(raw);
        if (typeof draft.notes === "string" && typeof draft.relationships === "string" && draft.notes.length <= 50000 && draft.relationships.length <= 50000) {
          if (draft.notes !== props.notes || draft.relationships !== props.relationships) {
            setNotes(draft.notes); setRelationships(draft.relationships);
            initialJournalState.current = false; setRecoveredJournal(true);
          } else sessionStorage.removeItem(journalKey);
        }
      }
    } catch { /* Autosave still works when browser storage is unavailable. */ }
    setJournalLoaded(true);
  }, [canEdit, journalKey, props.notes, props.relationships]);

  async function persistConditions(nextPhysical: ConditionState, nextMental: ConditionState) {
    const previousPhysical = physicalConditions;
    const previousMental = mentalConditions;
    setMutationError("");
    setConditionSaving(true);
    try {
      await updateCharacterConditions(characterId, {
        physicalConditions: nextPhysical,
        mentalConditions: nextMental,
      });
    } catch {
      setPhysicalConditions(previousPhysical);
      setMentalConditions(previousMental);
      setMutationError("Conditions could not be saved. Please try again.");
    } finally {
      setConditionSaving(false);
    }
  }

  async function handleConditionToggle(scope: "physical" | "mental", key: string) {
    if (!canEdit || conditionSaving) {
      return;
    }

    if (scope === "physical") {
      const next = { ...physicalConditions, [key]: !physicalConditions[key] };
      setPhysicalConditions(next);
      await persistConditions(next, mentalConditions);
      return;
    }

    const next = { ...mentalConditions, [key]: !mentalConditions[key] };
    setMentalConditions(next);
    await persistConditions(physicalConditions, next);
  }

  async function handleXpToggle(slot: number) {
    if (!canEdit || xpSaving || advancementBusy) {
      return;
    }

    const nextXp = slot < experiencePoints ? slot : slot + 1;
    setXpSaving(true);
    setMutationError("");
    try {
      const result = await updateCharacterExperience(characterId, nextXp, experienceVersion);
      setExperiencePoints(result.experiencePoints); setExperienceVersion(result.experienceVersion);
    } catch {
      setMutationError("Experience could not be saved. The sheet may have changed; refresh and try again.");
      router.refresh();
    } finally {
      setXpSaving(false);
    }
  }

  useEffect(() => {
    if (!canEdit || !journalLoaded) {
      return;
    }

    if (initialJournalState.current) {
      initialJournalState.current = false;
      return;
    }

    let cancelled = false;
    setJournalStatus("saving");
    try { sessionStorage.setItem(journalKey, JSON.stringify({ notes, relationships })); } catch { /* Storage is optional. */ }

    const timer = setTimeout(async () => {
      try {
        const save = journalQueue.current.catch(() => undefined).then(() => updateCharacterJournal(characterId, { notes, relationships }));
        journalQueue.current = save;
        await save;
        if (latestJournal.current.notes === notes && latestJournal.current.relationships === relationships) {
          try { sessionStorage.removeItem(journalKey); } catch { /* Storage is optional. */ }
        }
        if (!cancelled) {
          setJournalStatus("saved");
        }
      } catch {
        if (!cancelled) {
          setJournalStatus("error");
        }
      }
    }, 600);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [canEdit, characterId, notes, relationships, journalRetry, journalLoaded, journalKey]);

  useEffect(() => {
    if (journalStatus !== "saving" && journalStatus !== "error") return;
    const warn = (event: BeforeUnloadEvent) => { event.preventDefault(); };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [journalStatus]);

  const selectedSkillDefinition = SKILL_DEFINITIONS.find(entry => entry.key === selectedSkill)!;
  const physicalLoad = summarizeConditions(physicalConditions, mentalConditions).physical;
  const mentalLoad = summarizeConditions(physicalConditions, mentalConditions).mental;
  const usableProfiles = applicableGear(inventory, selectedSkill);
  const selectedProfile = usableProfiles.find(entry => entry.key === selectedEquipment);
  const armor = inventory.find(entry => entry.id === selectedArmor && entry.quantity > 0 && entry.item.type === "ARMOR")?.item;
  const appliedItemBonus = selectedProfile?.profile.bonus ?? itemBonus;
  const pool = sheetPool({ skill: selectedSkill, attributes, skills, physical: physicalConditions, mental: mentalConditions, itemBonus: appliedItemBonus, advantages, armor });
  const visibleInventory = inventory.filter(entry => {
    const matchesCategory = equipmentCategory === "all" || (equipmentCategory === "temporary" ? isTemporaryGear(entry) : entry.item.type === equipmentCategory);
    const text = [entry.item.name, entry.item.description, entry.notes, ...profilesFor(entry.item).flatMap(profile => [profile.label, profile.effect, profile.requirements, ...profile.skills.map(skillName)])].join(" ").toLowerCase();
    return matchesCategory && text.includes(equipmentQuery.trim().toLowerCase());
  });
  const journalLabel = journalStatus === "saving" ? "Saving notes & relationships..." : journalStatus === "saved" ? "Notes & relationships saved" : journalStatus === "error" ? "Notes not saved. Retry below." : canEdit ? "Notes & relationships autosave" : "Read-only journal";

  function prepareCheck(skill: SkillKey, equipment = "") {
    setSelectedSkill(skill);
    setSelectedEquipment(equipment);
    setSelectedArmor("");
    setItemBonus(0);
    setAdvantages(0);
    setActiveTab("play");
    setFocusCheck(true);
  }

  const panels = ["play", "equipment", "background", "notes"] as const;
  return <div className="ledger-page character-sheet-v2" style={{ "--sheet-header-height": `${headerHeight}px` } as CSSProperties}>
    {mutationError && <p role="alert" className="ledger-panel p-3">{mutationError}</p>}
    <section className="ledger-sheet sheet-identity" aria-label="Character overview">
      <div className="sheet-identity-main">
        <VaesenMark className="sheet-identity-mark" />
        <div className="min-w-0"><p className="ledger-kicker">Society Ledger / Character Sheet</p><h1>{name}</h1><p>{archetypeName} <span aria-hidden="true">/</span> {formatAgeGroup(ageGroup)}{props.archetypeArchived && <span className="block text-sm">Archived template / character preserved</span>}</p></div>
      </div>
      <div className="sheet-experience">
        <button type="button" className="sheet-xp-disclosure" aria-expanded={experienceExpanded} aria-controls="sheet-xp-controls" onClick={() => setExperienceExpanded(value => !value)}>Experience / {experiencePoints} unspent XP <span aria-hidden="true">{experienceExpanded ? "-" : "+"}</span></button>
        <div id="sheet-xp-controls" className={cn("sheet-xp-controls", !experienceExpanded && "is-collapsed")}>
        <div className="sheet-heading"><h2>Experience</h2><ReferenceHelp label="Experience"><p>Track unspent XP here. Advancement spends XP through the separate advancement controls and records each purchase in your history.</p><p>Clicking a marked slot reduces the balance; clicking an empty one fills through that slot.</p></ReferenceHelp></div>
        <div className="ledger-xp-grid">{Array.from({ length: MAX_XP_TRACKER }).map((_, index) => <button key={index} type="button" disabled={!canEdit || xpSaving || advancementBusy || experiencePoints > MAX_XP_TRACKER} onClick={() => handleXpToggle(index)} className={cn("ledger-xp-mark", index < experiencePoints && "is-filled")} aria-label={`Experience slot ${index + 1}`} aria-pressed={index < experiencePoints} />)}</div>
        <p className="ledger-helper-copy">{experiencePoints} unspent XP{experiencePoints > MAX_XP_TRACKER ? " (above tracker; no XP discarded)" : ` / ${MAX_XP_TRACKER}`}{xpSaving ? " / Saving..." : ""}</p>
        <CharacterAdvancement characterId={characterId} canEdit={canEdit} experiencePoints={experiencePoints} experienceVersion={experienceVersion} skills={skills} hasSkillRecord={props.hasSkillRecord} availableTalents={props.availableTalents} history={props.advancementHistory} hasMore={props.hasMoreAdvancements} disabled={xpSaving || advancementBusy} onBusy={setAdvancementBusy} onUpdated={(xp, version) => { setExperiencePoints(xp); setExperienceVersion(version); }} />
        </div>
      </div>
    </section>

    <div className="sheet-tabbar" role="tablist" aria-label="Character sheet sections">{panels.map((tab, index) => <button key={tab} id={`sheet-tab-${tab}`} ref={element => { tabRefs.current[index] = element; }} type="button" role="tab" aria-label={tab === "equipment" ? `Equipment (${inventory.length})` : tab[0].toUpperCase() + tab.slice(1)} aria-selected={activeTab === tab} aria-controls={`sheet-panel-${tab}`} tabIndex={activeTab === tab ? 0 : -1} onClick={() => setActiveTab(tab)} onKeyDown={event => {
      const next = event.key === "ArrowRight" ? (index + 1) % panels.length : event.key === "ArrowLeft" ? (index + panels.length - 1) % panels.length : event.key === "Home" ? 0 : event.key === "End" ? panels.length - 1 : -1;
      if (next >= 0) { event.preventDefault(); setActiveTab(panels[next]); tabRefs.current[next]?.focus(); }
    }}><span className="sheet-tab-label-full">{tab === "equipment" ? `Equipment (${inventory.length})` : tab[0].toUpperCase() + tab.slice(1)}</span><span className="sheet-tab-label-short" aria-hidden="true">{tab === "equipment" ? `Gear (${inventory.length})` : tab === "background" ? "Story" : tab[0].toUpperCase() + tab.slice(1)}</span>{tab === "notes" && journalStatus === "error" && <span aria-label="Save failed"> !</span>}</button>)}</div>
    <div className="sheet-session-strip"><span>Physical: -{physicalLoad} dice{physicalConditions.broken ? " / Broken" : ""}</span><span>Mental: -{mentalLoad} dice{mentalConditions.broken ? " / Broken" : ""}</span><span role="status" className={journalStatus === "error" ? "text-[var(--ledger-danger)]" : ""}>{journalLabel}</span></div>
    {recoveredJournal && <p className="ledger-status">Recovered unsaved journal from this tab. It will save automatically.</p>}
    {journalStatus === "error" && <button type="button" className="ledger-button" onClick={() => setJournalRetry(value => value + 1)}>Retry Journal Save</button>}

    <section id="sheet-panel-play" role="tabpanel" aria-labelledby="sheet-tab-play" hidden={activeTab !== "play"} tabIndex={0} className="sheet-tabpanel">
      <div className="sheet-play-grid">
        <div className="space-y-4 min-w-0">
          <section className="ledger-sheet" aria-label="Attributes and conditions">
            <div className="sheet-heading"><h2>Attributes & Conditions</h2><ReferenceHelp label="Conditions"><p>Each marked physical condition removes one die from Physique and Precision skills. Each mental condition removes one die from Logic and Empathy skills.</p><p>Broken is tracked separately, not a fourth penalty die. Consult the GM before acting while Broken.</p></ReferenceHelp></div>
            <div className="sheet-attributes">{(["physique", "precision", "logic", "empathy"] as const).map(key => <div key={key} className="sheet-attribute"><div className="sheet-heading"><span className="capitalize">{key}</span><ReferenceHelp label={skillName(key)}><p>{SKILL_DEFINITIONS.filter(entry => entry.attribute === key).map(entry => entry.label).join(", ")}</p><p>This attribute contributes {attributes[key]} dice to its skills, before conditions and other modifiers.</p></ReferenceHelp></div><strong>{attributes[key]}</strong></div>)}</div>
            <div className="sheet-conditions">{(["physical", "mental"] as const).map(domain => <div key={domain} className="sheet-condition-group" role="group" aria-label={`${domain} conditions`}><h3>{domain === "physical" ? "Physical / Physique & Precision" : "Mental / Logic & Empathy"}<span>-{domain === "physical" ? physicalLoad : mentalLoad} dice</span></h3><div className="ledger-condition-row">{(domain === "physical" ? PHYSICAL_CONDITIONS : MENTAL_CONDITIONS).map(condition => <ConditionToggle key={condition.key} label={condition.label} checked={Boolean((domain === "physical" ? physicalConditions : mentalConditions)[condition.key])} disabled={!canEdit || conditionSaving} onChange={() => handleConditionToggle(domain, condition.key)} />)}</div></div>)}</div>
            {conditionSaving && <p role="status" className="ledger-helper-copy">Saving conditions...</p>}
          </section>
          <section className="ledger-sheet" aria-label="Skills">
            <div className="sheet-heading"><h2>Skills</h2><ReferenceHelp label="Skill checks"><p>Prepare a skill to choose applicable gear and advantages. Quick roll uses only Attribute + Skill - Conditions, plus the armor you explicitly selected for this check.</p><p>Open a skill row to read its full rules. Inspecting does not change your prepared roll.</p></ReferenceHelp></div>
            <p className="ledger-helper-copy mb-3">Rating in the square. Base dice beside it. Open for rules; Prepare for gear.</p>
            <div className="sheet-skills-grid">{(["physique", "precision", "logic", "empathy"] as const).map(attribute => <div key={attribute} className="sheet-skill-group"><h3 className="capitalize">{attribute} <span>{attributes[attribute]}</span></h3>{SKILL_DEFINITIONS.filter(entry => entry.attribute === attribute).map(entry => {
              const reference = props.skillReferences.find(skill => skill.key === entry.key);
              const base = sheetPool({ skill: entry.key, attributes, skills, physical: physicalConditions, mental: mentalConditions, itemBonus: 0, advantages: 0, armor });
              return <article key={entry.key} className={cn("sheet-skill", selectedSkill === entry.key && "is-prepared")}>
                <div className="sheet-skill-overview"><details><summary><span>{entry.label}</span><small>{base.dice}d6 base</small><span className="ledger-skill-value">{skills[entry.key]}</span></summary><div className="sheet-reference-body">{reference ? <SkillDetails skill={reference} /> : <p>No reference entered yet. {entry.label} uses {attribute} and {entry.domain} conditions.</p>}</div></details><ReferenceHelp label={entry.label}><p>{reference?.description || `${entry.label} uses ${attribute}.`}</p><p>{base.attribute} attribute + {base.skill} skill - {base.conditions} conditions{base.armorPenalty ? ` - ${base.armorPenalty} armor` : ""} = {base.dice}d6 base.</p></ReferenceHelp></div>
                <div className="sheet-skill-actions"><button type="button" className="sheet-prepare" aria-label={`Prepare ${entry.label}`} onClick={() => prepareCheck(entry.key)}>Prepare</button><DiceRollerModal initialDiceCount={base.dice} title={`${entry.label} / base check`} triggerAriaLabel={`Quick roll ${entry.label} / ${base.dice}d6`} triggerLabel={`${base.dice}d6`} /></div>
              </article>;
            })}</div>)}</div>
          </section>
          <section className="ledger-sheet" aria-label="Talents and effects"><div className="sheet-heading"><h2>Talents & Effects</h2><ReferenceHelp label="Talents"><p>Talents apply only in their described circumstances. Add a relevant dice modifier to Advantages after confirming it with the GM; they are not added automatically.</p></ReferenceHelp></div>
            <div className="space-y-2 mt-3">{talents.length ? talents.map(talent => <div key={talent.id} className="sheet-reference-row"><CreationChoice title={talent.name} summary={talent.type.replaceAll("_", " ")}><p className="whitespace-pre-wrap">{talent.description}</p></CreationChoice><ReferenceHelp label={talent.name}><p>{talent.description}</p></ReferenceHelp></div>) : <p className="ledger-helper-copy">No talents recorded.</p>}</div>
            <details className="sheet-secondary-details"><summary>Insights & Afflictions ({insightsAfflictions.length})</summary>{insightsAfflictions.length ? <ul className="list-disc pl-5 space-y-2">{insightsAfflictions.map((line, index) => <li key={index}>{line}</li>)}</ul> : <p>None recorded.</p>}</details>
            <details className="sheet-secondary-details"><summary>Memento</summary><p>{memento || "No memento recorded."}</p></details>
          </section>
          {props.castleBenefits.length > 0 && <details className="ledger-panel p-4"><summary className="font-bold cursor-pointer">Castle Benefits ({props.castleBenefits.length})</summary><CharacterCastleBenefits benefits={props.castleBenefits} physicalBase={attributes.physique + attributes.precision} mentalBase={attributes.logic + attributes.empathy} /></details>}
        </div>
        <aside className="ledger-sheet sheet-check" aria-label="Prepared skill check">
          <div className="sheet-heading"><h2 ref={checkHeading} tabIndex={-1}>Prepared Check</h2><ReferenceHelp label="Dice pool"><p>Attribute + Skill + one applicable gear profile + Advantages - Conditions - selected armor&apos;s Agility penalty.</p><p>Modifiers are for this check only; nothing is spent or consumed. The GM confirms context, range, and requirements.</p></ReferenceHelp></div>
          <div className="sheet-roll-total"><output aria-live="polite" aria-label="Prepared dice pool"><strong>{pool.dice}</strong> d6</output><DiceRollerModal initialDiceCount={pool.dice} title={`${selectedSkillDefinition.label}${selectedProfile ? ` / ${selectedProfile.name}` : ""}`} triggerLabel="Roll prepared check" /></div>
          <label className="ledger-input-group"><span>Skill check</span><select value={selectedSkill} onChange={event => { setSelectedSkill(event.target.value as SkillKey); setSelectedEquipment(""); setSelectedArmor(""); setItemBonus(0); setAdvantages(0); }} className="ledger-input">{SKILL_DEFINITIONS.map(entry => <option key={entry.key} value={entry.key}>{entry.label}</option>)}</select></label>
          <label className="ledger-input-group"><span>Applicable gear / one profile</span><select className="ledger-input" value={selectedProfile ? selectedEquipment : ""} onChange={event => { setSelectedEquipment(event.target.value); setItemBonus(0); }}><option value="">No gear / manual bonus</option>{usableProfiles.map(entry => <option key={entry.key} value={entry.key}>{entry.name} ({entry.profile.bonus >= 0 ? "+" : ""}{entry.profile.bonus})</option>)}</select></label>
          {!usableProfiles.length && <p className="ledger-helper-copy">No carried gear has a profile for this skill.</p>}
          {selectedProfile && <div className="sheet-use-callout"><strong>{selectedProfile.name}</strong>{selectedProfile.profile.kind === "ATTACK" && <p>Damage {selectedProfile.profile.damage ?? "?"} Conditions / Zones {selectedProfile.profile.rangeMin === null ? "Needs GM review" : `${selectedProfile.profile.rangeMin}${selectedProfile.profile.rangeMax === selectedProfile.profile.rangeMin ? "" : `-${selectedProfile.profile.rangeMax}`}`}</p>}<p>{selectedProfile.profile.effect}</p>{selectedProfile.profile.requirements && <p className="italic">{selectedProfile.profile.requirements}</p>}</div>}
          <div className="grid grid-cols-2 gap-3"><label className="ledger-input-group"><span>{selectedProfile ? "Gear bonus" : "Manual gear bonus"}</span><input type="number" min={-20} max={20} step={1} value={appliedItemBonus} disabled={!!selectedProfile} onChange={event => setItemBonus(rollModifier(Number(event.target.value)))} className="ledger-input" /></label><label className="ledger-input-group"><span>Advantages / other</span><input type="number" min={-20} max={20} step={1} value={advantages} onChange={event => setAdvantages(rollModifier(Number(event.target.value)))} className="ledger-input" /></label></div>
          <p className="ledger-helper-copy">Gear replaces the manual bonus; it never stacks with itself. Other situational modifiers and talents need GM confirmation.</p>
          {inventory.some(entry => entry.quantity > 0 && entry.item.type === "ARMOR") && <label className="ledger-input-group"><span>Armor for this check (not saved)</span><select className="ledger-input" value={selectedArmor} onChange={event => setSelectedArmor(event.target.value)}><option value="">No armor selected</option>{inventory.filter(entry => entry.quantity > 0 && entry.item.type === "ARMOR").map(entry => <option key={entry.id} value={entry.id}>{entry.item.name} / Agility {entry.item.agilityPenalty === null ? "needs review" : `-${entry.item.agilityPenalty}`}</option>)}</select><small className="ledger-helper-copy">Only reduces Agility. Armor protection is rolled separately in Equipment.</small></label>}
          {armor?.agilityPenalty === null && selectedSkill === "agility" && <p className="ledger-status">This armor&apos;s penalty needs review. Confirm a manual adjustment with the GM.</p>}
          <dl className="sheet-pool-breakdown"><div><dt className="capitalize">{selectedSkillDefinition.attribute}</dt><dd>{pool.attribute}</dd></div><div><dt>{selectedSkillDefinition.label}</dt><dd>+{pool.skill}</dd></div><div><dt>Gear</dt><dd>{appliedItemBonus >= 0 ? "+" : ""}{appliedItemBonus}</dd></div><div><dt>Advantages / other</dt><dd>{advantages >= 0 ? "+" : ""}{advantages}</dd></div><div><dt>{selectedSkillDefinition.domain === "physical" ? "Physical" : "Mental"} conditions</dt><dd>-{pool.conditions}</dd></div>{pool.armorPenalty > 0 && <div><dt>Selected armor</dt><dd>-{pool.armorPenalty}</dd></div>}</dl>
          {(physicalConditions.broken || mentalConditions.broken) && <p className="ledger-status">Broken is marked. Confirm with the GM whether this action is possible.</p>}
          {pool.raw <= 0 && <p className="ledger-helper-copy">No dice remain. Confirm modifiers or the action with the GM.</p>}
          {pool.raw > 50 && <p className="ledger-helper-copy">The roller is limited to 50 dice.</p>}
          <button type="button" className="ledger-button" onClick={() => { setSelectedEquipment(""); setSelectedArmor(""); setItemBonus(0); setAdvantages(0); }}>Clear check modifiers</button>
        </aside>
      </div>
      <div className="sheet-mobile-check" aria-label="Mobile prepared check">
        <div><strong>{selectedSkillDefinition.label}</strong><span>{pool.dice}d6 prepared</span></div>
        <button type="button" className="ledger-button" onClick={() => setFocusCheck(true)}>Edit check</button>
        <DiceRollerModal initialDiceCount={pool.dice} title={`${selectedSkillDefinition.label}${selectedProfile ? ` / ${selectedProfile.name}` : ""}`} triggerLabel="Roll" />
      </div>
    </section>

    <section id="sheet-panel-equipment" role="tabpanel" aria-labelledby="sheet-tab-equipment" hidden={activeTab !== "equipment"} tabIndex={0} className="sheet-tabpanel ledger-sheet">
      <div className="sheet-heading"><h2>Equipment</h2><ReferenceHelp label="Equipment"><p>Choose a use profile to prepare the relevant skill check. Zero-bonus profiles still show attack damage, range, and requirements.</p><p>Quantity is carried stock, not an automatic count of remaining doses. These buttons do not spend gear, ammunition, or doses.</p></ReferenceHelp></div>
      <div className="sheet-equipment-toolbar"><label className="ledger-input-group"><span>Find carried equipment</span><input type="search" className="ledger-input" placeholder="Name, skill, effect..." value={equipmentQuery} onChange={event => setEquipmentQuery(event.target.value)} /></label><label className="ledger-input-group"><span>Equipment category</span><select className="ledger-input" value={equipmentCategory} onChange={event => setEquipmentCategory(event.target.value)}><option value="all">All carried equipment</option><option value="WEAPON">Weapons</option><option value="ARMOR">Armor</option><option value="GEAR">Equipment</option><option value="MAGIC">Magic items</option><option value="temporary">Temporary / borrowed</option></select></label></div>
      <p role="status" className="ledger-helper-copy mb-3">{visibleInventory.length} of {inventory.length} inventory entries / Resources {resources} / Capital {capital}</p>
      <div className="sheet-equipment-grid">{visibleInventory.map(entry => <article key={entry.id} className="sheet-equipment-entry">
        <div className="sheet-reference-row"><CreationChoice title={entry.item.name} summary={<>{typeName(entry.item.type)} / Quantity {entry.quantity}{isTemporaryGear(entry) ? " / Temporary" : ""}{entry.item.type === "ARMOR" ? ` / Protection ${entry.item.protection ?? "?"}d6` : ` / ${equipmentBonusLabel(entry.item)}${profilesFor(entry.item).some(profile => profile.kind !== "NARRATIVE") ? " dice" : ""}`}</>}><EquipmentDetails item={entry.item} />{entry.notes && <p className="sheet-use-callout whitespace-pre-wrap">Inventory notes: {entry.notes}</p>}</CreationChoice><ReferenceHelp label={entry.item.name}><EquipmentDetails item={entry.item} /></ReferenceHelp></div>
        <div className="sheet-gear-actions">{profilesFor(entry.item).filter(profile => profile.kind !== "NARRATIVE").flatMap(profile => profile.skills.filter((key): key is SkillKey => SKILL_DEFINITIONS.some(skill => skill.key === key)).map(key => <button key={`${profile.id}:${key}`} type="button" className="ledger-button" aria-label={`Use ${entry.item.name}: ${profile.label} / ${skillName(key)}`} disabled={entry.quantity <= 0} onClick={() => prepareCheck(key, `${entry.id}:${profile.id}`)}>Use for {skillName(key)}{profilesFor(entry.item).filter(use => use.kind !== "NARRATIVE").length > 1 ? ` / ${profile.label}` : ""}</button>))}{entry.item.type === "ARMOR" && entry.item.protection !== null && entry.quantity > 0 && <DiceRollerModal initialDiceCount={entry.item.protection} title={`${entry.item.name} / protection`} triggerLabel={`Roll protection ${entry.item.protection}d6`} allowPush={false} />}</div>
      </article>)}</div>
      {!visibleInventory.length && <p className="sheet-empty">{inventory.length ? "No equipment matches. Try a different category or search." : "No equipment recorded. Party stash equipment is managed separately on the party page."}</p>}
    </section>

    <section id="sheet-panel-background" role="tabpanel" aria-labelledby="sheet-tab-background" hidden={activeTab !== "background"} tabIndex={0} className="sheet-tabpanel ledger-sheet">
      <div className="sheet-heading"><h2>Background & Relationships</h2><ReferenceHelp label="The Sight"><p>All player characters can perceive Vaesen. Your trauma describes how the Sight awakened.</p></ReferenceHelp></div>
      <div className="sheet-background-grid"><div className="space-y-4"><FieldBlock label="Motivation"><span className="ledger-multiline-text">{motivation}</span></FieldBlock><FieldBlock label="Trauma / The Sight"><span className="ledger-multiline-text">{trauma}</span></FieldBlock><FieldBlock label="Dark Secret"><span className="ledger-multiline-text">{darkSecret}</span></FieldBlock><FieldBlock label="Memento"><span className="ledger-multiline-text">{memento || "No memento recorded."}</span></FieldBlock><div className="sheet-heading"><h3>Resources {resources} / Capital {capital}</h3><ReferenceHelp label="Resources"><p>Resources and Capital are your recorded values. Equipment availability and temporary castle benefits do not automatically change either value.</p></ReferenceHelp></div></div><div><label className="ledger-input-group"><span>Relationships</span><textarea rows={12} maxLength={50000} value={relationships} readOnly={!canEdit} onChange={event => setRelationships(event.target.value)} className="ledger-textarea" placeholder="Relationships with the other player characters..." /></label><p className="ledger-helper-copy mt-2">{canEdit ? "Autosaves as you type. Switching tabs keeps your draft." : "Read-only."}</p></div></div>
    </section>
    <section id="sheet-panel-notes" role="tabpanel" aria-labelledby="sheet-tab-notes" hidden={activeTab !== "notes"} tabIndex={0} className="sheet-tabpanel ledger-sheet">
      <div className="sheet-heading"><h2>Campaign Notes</h2>{canEdit && <button type="button" className="ledger-button" disabled={journalStatus === "saving"} onClick={() => setJournalRetry(value => value + 1)}>{journalStatus === "error" ? "Retry Save" : "Save Notes & Relationships"}</button>}</div><label className="ledger-input-group"><span>Private journal</span><textarea rows={16} maxLength={50000} value={notes} readOnly={!canEdit} onChange={event => setNotes(event.target.value)} className="ledger-textarea" placeholder="Session notes, clues, debts, suspicions, and private reminders..." aria-label="Campaign notes" /></label>
    </section>
  </div>;
}
