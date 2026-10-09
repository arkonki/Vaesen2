"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { TalentType } from "@prisma/client";
import { equipmentBonusLabel, profilesFor, type EquipmentItem } from "@/lib/equipment";
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

const SKILL_DEFINITIONS: SkillDefinition[] = [
  { key: "agility", label: "Agility", attribute: "physique", domain: "physical" },
  { key: "closeCombat", label: "Close Combat", attribute: "physique", domain: "physical" },
  { key: "force", label: "Force", attribute: "physique", domain: "physical" },
  { key: "medicine", label: "Medicine", attribute: "precision", domain: "physical" },
  { key: "rangedCombat", label: "Ranged Combat", attribute: "precision", domain: "physical" },
  { key: "stealth", label: "Stealth", attribute: "precision", domain: "physical" },
  { key: "investigation", label: "Investigation", attribute: "logic", domain: "mental" },
  { key: "learning", label: "Learning", attribute: "logic", domain: "mental" },
  { key: "vigilance", label: "Vigilance", attribute: "logic", domain: "mental" },
  { key: "inspiration", label: "Inspiration", attribute: "empathy", domain: "mental" },
  { key: "manipulation", label: "Manipulation", attribute: "empathy", domain: "mental" },
  { key: "observation", label: "Observation", attribute: "empathy", domain: "mental" },
];

function conditionSetCount(conditions: ConditionState, keys: readonly string[]) {
  return keys.filter((key) => key !== "broken" && conditions[key]).length;
}

function formatAgeGroup(value: string) {
  return value
    .replaceAll("_", " ")
    .toLowerCase()
    .replace(/^\w/, (letter) => letter.toUpperCase());
}

function splitRelationshipLines(value: string) {
  const lines = value
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  return Array.from({ length: 4 }, (_, index) => lines[index] ?? "");
}

function isTemporaryEntry(entry: InventoryEntry) {
  return Boolean(entry.notes && /temp|temporary|borrowed|loan/i.test(entry.notes));
}

function InventoryTable({
  columns,
  rows,
  emptyLabel,
}: {
  columns: string[];
  rows: string[][];
  emptyLabel: string;
}) {
  return (
    <div className="ledger-table-wrap">
      <table className="ledger-table">
        <thead>
          <tr>
            {columns.map((column) => (
              <th key={column}>{column}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.length > 0 ? (
            rows.map((row, rowIndex) => (
              <tr key={`${row.join("-")}-${rowIndex}`}>
                {row.map((cell, cellIndex) => (
                  <td key={`${cell}-${cellIndex}`}>{cell || "\u00A0"}</td>
                ))}
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan={columns.length} className="ledger-empty-cell">
                {emptyLabel}
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

function SectionBar({ title }: { title: string }) {
  return <div className="ledger-bar">{title}</div>;
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

function StatCell({ label, value }: { label: string; value: number }) {
  return (
    <div className="ledger-stat-cell">
      <span className="ledger-stat-label">{label}</span>
      <span className="ledger-stat-value">{value}</span>
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

  const groupedInventory = useMemo(() => {
    const weapons = inventory.flatMap(entry => profilesFor(entry.item).filter(profile => profile.kind === "ATTACK").map(profile => ({ ...entry, profile })));
    const armor = inventory.filter((entry) => entry.item.type === "ARMOR");
    const equipment = inventory.filter(
      (entry) => entry.item.type === "GEAR" || entry.item.type === "MAGIC"
    );

    return {
      weapons,
      armor,
      personalGear: equipment.filter((entry) => !isTemporaryEntry(entry)),
      temporaryGear: equipment.filter((entry) => isTemporaryEntry(entry)),
    };
  }, [inventory]);

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

  const physicalLoad = conditionSetCount(physicalConditions, PHYSICAL_CONDITIONS.map((entry) => entry.key));
  const mentalLoad = conditionSetCount(mentalConditions, MENTAL_CONDITIONS.map((entry) => entry.key));
  const selectedSkillDefinition =
    SKILL_DEFINITIONS.find((entry) => entry.key === selectedSkill) ?? SKILL_DEFINITIONS[0];
  const attributeValue = attributes[selectedSkillDefinition.attribute];
  const skillValue = skills[selectedSkillDefinition.key];
  const usableProfiles = inventory.flatMap(entry => profilesFor(entry.item)
    .filter(profile => profile.kind !== "NARRATIVE" && profile.skills.includes(selectedSkill) && profile.bonus !== 0)
    .map(profile => ({ key: `${entry.id}:${profile.id}`, name: `${entry.item.name}: ${profile.label}`, profile })));
  const conditionPenalty = selectedSkillDefinition.domain === "physical" ? physicalLoad : mentalLoad;
  const selectedProfile = usableProfiles.find(entry => entry.key === selectedEquipment);
  const appliedItemBonus = selectedProfile?.profile.bonus ?? itemBonus;
  const dicePool = Math.max(0, attributeValue + skillValue + appliedItemBonus + advantages - conditionPenalty);
  const relationshipLines = splitRelationshipLines(relationships);

  return (
    <div className="ledger-page space-y-6">
      <nav className="ledger-section-nav" aria-label="Character sheet sections">
        <a href="#sheet-play">Skills & Conditions</a><a href="#sheet-background">Background</a><a href="#sheet-equipment">Equipment</a><a href="#sheet-notes">Notes</a>
      </nav>
      {mutationError && <p role="alert" className="ledger-panel p-3">{mutationError}</p>}
      <section className="ledger-sheet">
        <div className="ledger-top-grid">
          <div className="space-y-2">
            <FieldBlock label="Name">
              <span className="ledger-field-text">{name}</span>
            </FieldBlock>

            <div className="grid grid-cols-[0.7fr_1.3fr] gap-2">
              <FieldBlock label="Age/Age Group" compact>
                <span className="ledger-field-text">{formatAgeGroup(ageGroup)}</span>
              </FieldBlock>
              <FieldBlock label="Archetype" compact>
                <span className="ledger-field-text">{archetypeName}</span>
              </FieldBlock>
            </div>
          </div>

          <div className="ledger-title-block">
            <p className="ledger-kicker">Society Ledger</p>
            <h1>VAESEN</h1>
            <p className="ledger-subtitle">Character Sheet</p>
          </div>

          <div>
            <SectionBar title="Experience" />
            <div className="ledger-xp-wrap">
              <div className="ledger-xp-grid">
                {Array.from({ length: MAX_XP_TRACKER }).map((_, index) => (
                  <button
                    key={index}
                    type="button"
                    disabled={!canEdit || xpSaving || advancementBusy || experiencePoints > MAX_XP_TRACKER}
                    onClick={() => handleXpToggle(index)}
                    className={cn("ledger-xp-mark", index < experiencePoints && "is-filled")}
                    aria-label={`Experience slot ${index + 1}`}
                    aria-pressed={index < experiencePoints}
                  />
                ))}
              </div>
              <p className="ledger-helper-copy">
                {experiencePoints} unspent XP{experiencePoints > MAX_XP_TRACKER ? ' (above the checkbox tracker; no XP is discarded)' : `/${MAX_XP_TRACKER}`}
                {xpSaving ? " saving..." : ""}
              </p>
              <CharacterAdvancement characterId={characterId} canEdit={canEdit} experiencePoints={experiencePoints} experienceVersion={experienceVersion}
                skills={skills} hasSkillRecord={props.hasSkillRecord} availableTalents={props.availableTalents}
                history={props.advancementHistory} hasMore={props.hasMoreAdvancements} disabled={xpSaving || advancementBusy}
                onBusy={setAdvancementBusy} onUpdated={(xp, version) => { setExperiencePoints(xp); setExperienceVersion(version); }} />
            </div>
          </div>
        </div>

        <div className="ledger-sheet-columns">
          <div id="sheet-background" className="ledger-character-story space-y-4">
            <FieldBlock label="Motivation">
              <span className="ledger-multiline-text">{motivation}</span>
            </FieldBlock>
            <FieldBlock label="Trauma">
              <div className="space-y-2">
                <span className="ledger-multiline-text">{trauma}</span>
                <div className="ledger-note-callout">
                  The Sight: all player characters carry the ability to perceive Vaesen, awakened by trauma.
                </div>
              </div>
            </FieldBlock>
            <FieldBlock label="Dark Secret">
              <span className="ledger-multiline-text">{darkSecret}</span>
            </FieldBlock>

            <div className="ledger-panel">
              <SectionBar title="Relationships" />
              <div className="ledger-panel-body">
                {canEdit ? (
                  <textarea
                    rows={8}
                    aria-label="Relationships"
                    value={relationships}
                    onChange={(event) => setRelationships(event.target.value)}
                    className="ledger-textarea h-44"
                    placeholder={"PC 1:\nPC 2:\nPC 3:\nPC 4:"}
                  />
                ) : (
                  <div className="space-y-2">
                    {relationshipLines.map((line, index) => (
                      <div key={`${line}-${index}`} className="ledger-line-row">
                        <span className="ledger-line-prefix">PC {index + 1}:</span>
                        <span className="ledger-line-fill">{line || " "}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="ledger-panel">
              <SectionBar title="Resources" />
              <div className="ledger-panel-body">
                <div className="grid grid-cols-[0.35fr_1fr_0.35fr] gap-2">
                  <FieldBlock label="Value" compact>
                    <span className="ledger-field-text">{resources}</span>
                  </FieldBlock>
                  <FieldBlock label="Living Standards" compact>
                    <span className="ledger-field-text">{resources > 4 ? "Comfortable" : resources > 2 ? "Modest" : "Sparse"}</span>
                  </FieldBlock>
                  <FieldBlock label="Capital" compact>
                    <span className="ledger-field-text">{capital}</span>
                  </FieldBlock>
                </div>
              </div>
            </div>

            <div className="ledger-panel">
              <SectionBar title="Personal Gear" />
              <div className="ledger-panel-body">
                <InventoryTable
                  columns={["Item", "Bonus"]}
                  rows={groupedInventory.personalGear.map((entry) => [
                    `${entry.item.name}${entry.quantity > 1 ? ` x${entry.quantity}` : ""}`,
                    equipmentBonusLabel(entry.item),
                  ])}
                  emptyLabel="No personal gear recorded."
                />
              </div>
            </div>
          </div>

          <div className="ledger-character-play space-y-4">
            <div id="sheet-play" className="ledger-panel">
              <SectionBar title="Attributes" />
              <div className="ledger-panel-body">
                <div className="grid grid-cols-2 gap-2 xl:grid-cols-4">
                  <StatCell label="Physique" value={attributes.physique} />
                  <StatCell label="Precision" value={attributes.precision} />
                  <StatCell label="Logic" value={attributes.logic} />
                  <StatCell label="Empathy" value={attributes.empathy} />
                </div>
              </div>

              <div className="grid gap-4 border-t border-[var(--ledger-line)]/70 px-3 py-3 xl:grid-cols-2">
                <div>
                  <SectionBar title={`Physical Conditions${conditionSaving ? " / Saving" : ""}`} />
                  <div className="ledger-condition-row">
                    {PHYSICAL_CONDITIONS.map((condition) => (
                      <ConditionToggle
                        key={condition.key}
                        label={condition.label}
                        checked={Boolean(physicalConditions[condition.key])}
                        disabled={!canEdit || conditionSaving}
                        onChange={() => handleConditionToggle("physical", condition.key)}
                      />
                    ))}
                  </div>
                </div>

                <div>
                  <SectionBar title="Mental Conditions" />
                  <div className="ledger-condition-row">
                    {MENTAL_CONDITIONS.map((condition) => (
                      <ConditionToggle
                        key={condition.key}
                        label={condition.label}
                        checked={Boolean(mentalConditions[condition.key])}
                        disabled={!canEdit || conditionSaving}
                        onChange={() => handleConditionToggle("mental", condition.key)}
                      />
                    ))}
                  </div>
                </div>
              </div>

              <div className="border-t border-[var(--ledger-line)]/70 px-3 py-3">
                <SectionBar title="Skills" />
                <div className="mt-3 grid grid-cols-2 gap-3 xl:grid-cols-4">
                  {(["physique", "precision", "logic", "empathy"] as const).map((attributeKey) => (
                    <div key={attributeKey} className="space-y-2">
                      {SKILL_DEFINITIONS.filter((entry) => entry.attribute === attributeKey).map((entry) => (
                        <DiceRollerModal key={entry.key} triggerVariant="skill"
                          initialDiceCount={Math.max(0, attributes[entry.attribute] + skills[entry.key] - (entry.domain === "physical" ? physicalLoad : mentalLoad))}
                          title={`${entry.label} Roll`}
                          triggerLabel={<><span className="flex-1">{entry.label}</span><small className="text-[var(--ledger-ink-soft)]">{Math.max(0, attributes[entry.attribute] + skills[entry.key] - (entry.domain === "physical" ? physicalLoad : mentalLoad))}d6</small><span className="ledger-skill-value">{skills[entry.key]}</span></>}
                        />
                      ))}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="grid gap-4 xl:grid-cols-2">
              <div className="ledger-panel">
                <SectionBar title="Talents" />
                <div className="ledger-panel-body">
                  {talents.length > 0 ? (
                    <div className="space-y-2">
                      {talents.map((talent) => (
                        <div key={talent.id} className="ledger-note-block">
                          <p className="font-semibold">{talent.name}</p>
                          <p className="text-xs uppercase tracking-[0.2em] text-[var(--ledger-ink-soft)]">
                            {talent.type}
                          </p>
                          <p className="mt-1">{talent.description}</p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="ledger-empty-lines">
                      <span>No talents recorded.</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="ledger-panel">
                <SectionBar title="Insights & Afflictions" />
                <div className="ledger-panel-body">
                  {insightsAfflictions.length > 0 ? (
                    <div className="space-y-2">
                      {insightsAfflictions.map((line, index) => (
                        <div key={`${line}-${index}`} className="ledger-line-row">
                          <span className="ledger-line-fill">{line}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="ledger-empty-lines">
                      <span>No insights or afflictions recorded.</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="grid gap-4 xl:grid-cols-2">
              <div className="ledger-panel">
                <SectionBar title="Memento" />
                <div className="ledger-panel-body">
                  <div className="ledger-empty-lines">
                    <span>{memento || "No memento recorded."}</span>
                  </div>
                </div>
              </div>

              <div className="ledger-panel">
                <SectionBar title="Dice Pool Builder" />
                <div className="ledger-panel-body space-y-3">
                  <div className="grid gap-3 md:grid-cols-[1.2fr_0.55fr_0.55fr]">
                    <label className="ledger-input-group">
                      <span>Skill Check</span>
                      <select
                        value={selectedSkill}
                        onChange={(event) => setSelectedSkill(event.target.value as SkillKey)}
                        className="ledger-input"
                      >
                        {SKILL_DEFINITIONS.map((entry) => (
                          <option key={entry.key} value={entry.key}>
                            {entry.label}
                          </option>
                        ))}
                      </select>
                    </label>

                    <label className="ledger-input-group">
                      <span>Item Bonus</span>
                      <input
                        type="number"
                        value={appliedItemBonus}
                        onChange={(event) => { setSelectedEquipment(""); setItemBonus(Number(event.target.value) || 0); }}
                        className="ledger-input"
                      />
                    </label>

                    <label className="ledger-input-group">
                      <span>Advantages</span>
                      <input
                        type="number"
                        value={advantages}
                        onChange={(event) => setAdvantages(Number(event.target.value) || 0)}
                        className="ledger-input"
                      />
                    </label>
                  </div>

                  <p className="ledger-helper-copy">Tap a skill for a quick roll including conditions. Use this builder for gear and advantages.</p>
                  <label className="ledger-input-group"><span>Use applicable equipment</span>
                    <select className="ledger-input" value={selectedEquipment} onChange={event => setSelectedEquipment(event.target.value)}>
                      <option value="">No equipment selected</option>
                      {usableProfiles.map(entry => <option key={entry.key} value={entry.key}>{entry.name} ({entry.profile.bonus >= 0 ? "+" : ""}{entry.profile.bonus})</option>)}
                    </select>
                    {selectedProfile && <small className="ledger-helper-copy">{selectedProfile.profile.effect} {selectedProfile.profile.requirements}</small>}
                    <small className="ledger-helper-copy">Choose one applicable profile; the GM confirms its context. Armor penalties require worn-armor tracking and are not automatically applied here.</small>
                  </label>
                  <div className="ledger-helper-copy space-y-1">
                    <a href={`/compendium?tab=skills&q=${encodeURIComponent(selectedSkillDefinition.label)}`} target="_blank" rel="noopener noreferrer" className="underline">Read {selectedSkillDefinition.label} rules</a>
                    <p>Dice Pool = Attribute + Skill + Item Bonus + Advantages - Conditions</p>
                    <p>
                      {selectedSkillDefinition.attribute}: {attributeValue} / skill: {skillValue} / condition penalty: -
                      {conditionPenalty}
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-3">
                    <div className="ledger-pool-result">{dicePool}d6</div>
                    <DiceRollerModal
                      initialDiceCount={dicePool}
                      title={`${selectedSkillDefinition.label} Roll`}
                      triggerLabel="Roll This Pool"
                    />
                  </div>
                </div>
              </div>
            </div>

            {inventory.length > 0 && <details className="ledger-panel p-4"><summary className="font-bold cursor-pointer">Equipment Uses &amp; Requirements</summary><div className="mt-3 grid gap-4 sm:grid-cols-2">{inventory.map(entry => <article key={entry.id} className="ledger-panel p-3"><h3 className="font-bold">{entry.item.name}</h3><EquipmentDetails item={entry.item} /></article>)}</div></details>}
            <div id="sheet-equipment" className="grid gap-4 xl:grid-cols-2">
              <div className="ledger-panel">
                <SectionBar title="Temporary Gear" />
                <div className="ledger-panel-body">
                  <InventoryTable
                    columns={["Item", "Bonus"]}
                    rows={groupedInventory.temporaryGear.map((entry) => [
                      `${entry.item.name}${entry.quantity > 1 ? ` x${entry.quantity}` : ""}`,
                      equipmentBonusLabel(entry.item),
                    ])}
                    emptyLabel="Mark temporary gear by adding 'temporary' in its inventory notes."
                  />
                </div>
              </div>

              <div className="space-y-4">
                <div className="ledger-panel">
                  <SectionBar title="Weapons" />
                  <div className="ledger-panel-body">
                    <InventoryTable
                      columns={["Weapon", "Damage", "Range", "Bonus"]}
                      rows={groupedInventory.weapons.map((entry) => [
                        `${entry.item.name}${entry.quantity > 1 ? ` x${entry.quantity}` : ""}`,
                        entry.profile.damage !== null ? `${entry.profile.damage}` : "-",
                        entry.profile.rangeMin === null ? entry.item.range || "Needs review" : `${entry.profile.rangeMin}${entry.profile.rangeMax === entry.profile.rangeMin ? "" : `-${entry.profile.rangeMax}`}`,
                        entry.profile.bonus > 0 ? `+${entry.profile.bonus}` : `${entry.profile.bonus}`,
                      ])}
                      emptyLabel="No weapons assigned."
                    />
                  </div>
                </div>

                <div className="ledger-panel">
                  <SectionBar title="Armor" />
                  <div className="ledger-panel-body">
                    <InventoryTable
                      columns={["Type", "Protection", "Agility"]}
                      rows={groupedInventory.armor.map((entry) => [
                        `${entry.item.name}${entry.quantity > 1 ? ` x${entry.quantity}` : ""}`,
                        entry.item.protection !== null ? `${entry.item.protection}d6` : "Needs review",
                        entry.item.agilityPenalty !== null ? `-${entry.item.agilityPenalty}` : "Needs review",
                      ])}
                      emptyLabel="No armor assigned."
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="sheet-notes" className="ledger-sheet">
        {recoveredJournal && <p className="ledger-status mb-3">Recovered unsaved notes from this tab. They will be saved automatically.</p>}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <SectionBar title="Campaign Notes" />
          <p role="status" className="ledger-helper-copy">
            {journalStatus === "saving" && "Saving"}
            {journalStatus === "saved" && "Saved"}
            {journalStatus === "error" && "Save failed"}
            {journalStatus === "idle" && (canEdit ? "Autosaves as you type" : "Read-only")}
          </p>
          {canEdit && <button type="button" className="ledger-button" disabled={journalStatus === "saving"} onClick={() => setJournalRetry(value => value + 1)}>{journalStatus === "error" ? "Retry Save" : "Save Notes & Relationships"}</button>}
        </div>

        <div className="mt-4">
          <textarea
            rows={10}
            aria-label="Campaign notes"
            value={notes}
            disabled={!canEdit}
            onChange={(event) => setNotes(event.target.value)}
            className="ledger-textarea h-64"
            placeholder="Session notes, clues, debts, suspicions, and private reminders..."
          />
        </div>
      </section>
    </div>
  );
}
