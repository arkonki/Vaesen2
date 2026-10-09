"use client";

import { useMemo } from "react";
import { useSearchParams } from "next/navigation";
import PageMasthead from "@/components/page-masthead";
import { compendiumTab } from "@/lib/ui-flow";
import { ItemType, NPC, Talent, TalentType, Vaesen, SkillDefinition } from "@prisma/client";
import SkillDetails from "@/components/skill-details";
import { ATTRIBUTE_KEYS } from "@/lib/character-rules";
import EquipmentDetails from "@/components/equipment-details";
import { EQUIPMENT_TYPES, typeName, type EquipmentItem } from "@/lib/equipment";
import type { ArchetypeTemplate } from "@/lib/archetype-template";

type TabId = "rules" | "skills" | "items" | "talents" | "archetypes" | "npcs" | "vaesen";

type CompendiumClientProps = {
  role: string;
  canViewGmContent: boolean;
  items: EquipmentItem[];
  talents: Talent[];
  archetypes: ArchetypeTemplate[];
  npcs: NPC[];
  vaesen: Vaesen[];
  skills: SkillDefinition[];
};

const GENERAL_RULES_SECTIONS = [
  {
    title: "Core Resolution",
    body:
      "Roll a pool of d6 equal to Attribute + Skill + gear bonuses. Every 6 is a success. More successes improve effect, speed, or precision.",
  },
  {
    title: "Pushing Rolls",
    body:
      "Failed rolls may be pushed when fiction allows. Re-roll non-success dice, but gain a Condition tied to the Attribute used.",
  },
  {
    title: "Conditions",
    body:
      "Physical and Mental conditions each have three escalating states. Marking too many can break a character and force recovery scenes.",
  },
  {
    title: "Fear & Mystery",
    body:
      "Confronting Vaesen can trigger fear and social fallout. Investigations reward caution, preparation, and good roleplay choices.",
  },
];

function matchesQuery(values: Array<string | null | undefined>, query: string) {
  if (!query) {
    return true;
  }

  return values.some((value) => (value ?? "").toLowerCase().includes(query));
}

export default function CompendiumClient({
  canViewGmContent,
  items,
  talents,
  archetypes,
  npcs,
  vaesen,
  skills,
}: CompendiumClientProps) {
  const tabs = useMemo(
    () =>
      [
        { id: "rules" as TabId, label: "General Rules" },
        { id: "skills" as TabId, label: "Skills" },
        { id: "items" as TabId, label: "Items" },
        { id: "talents" as TabId, label: "Talents" },
        { id: "archetypes" as TabId, label: "Archetypes" },
        ...(canViewGmContent
          ? [
              { id: "npcs" as TabId, label: "NPCs" },
              { id: "vaesen" as TabId, label: "Vaesen" },
            ]
          : []),
      ],
    [canViewGmContent]
  );

  const params = useSearchParams();
  const activeTab = compendiumTab(params.get("tab"), canViewGmContent);
  const query = params.get("q") || "";
  const itemTypeFilter = (EQUIPMENT_TYPES as readonly string[]).includes(params.get("type") || "") ? params.get("type") as ItemType : "ALL";
  const talentTypeFilter = ["GENERAL", "ARCHETYPE"].includes(params.get("talent") || "") ? params.get("talent") as TalentType : "ALL";
  function updateUrl(key: string, value: string, push = false) {
    const next = new URLSearchParams(window.location.search);
    if (!value || value === "ALL") next.delete(key); else next.set(key, value);
    const url = "/compendium" + (next.size ? "?" + next.toString() : "");
    if (push) window.history.pushState(null, "", url); else window.history.replaceState(null, "", url);
  }

  const normalizedQuery = query.trim().toLowerCase();
  const attributeFilter = (ATTRIBUTE_KEYS as readonly string[]).includes(params.get("attribute") || "") ? params.get("attribute")! : "ALL";
  const filteredSkills = skills.filter(skill => (attributeFilter === "ALL" || skill.attribute === attributeFilter) && matchesQuery([skill.name,skill.attribute,skill.description,...skill.extraSuccesses,...skill.guidance], normalizedQuery));

  const filteredItems = useMemo(
    () =>
      items.filter(
        (item) =>
          (itemTypeFilter === "ALL" || item.type === itemTypeFilter) &&
          matchesQuery([item.name, item.description, item.skill, item.range, ...(item.usages ?? []).flatMap(u => [u.label, u.effect, u.requirements, ...u.skills])], normalizedQuery)
      ),
    [items, itemTypeFilter, normalizedQuery]
  );

  const filteredTalents = useMemo(
    () =>
      talents.filter(
        (talent) =>
          (talentTypeFilter === "ALL" || talent.type === talentTypeFilter) &&
          matchesQuery([talent.name, talent.description], normalizedQuery)
      ),
    [talents, talentTypeFilter, normalizedQuery]
  );

  const filteredArchetypes = useMemo(
    () =>
      archetypes.filter((archetype) =>
        matchesQuery([archetype.name, archetype.mainAttribute, archetype.mainSkill, archetype.flavorText,
          ...archetype.firstNameOptions, ...archetype.lastNameOptions, ...archetype.motivationOptions, ...archetype.traumaOptions, ...archetype.darkSecretOptions, ...archetype.relationshipOptions,
          ...(archetype.startingTalents ?? []).map(entry => entry.talent.name), ...(archetype.equipmentGroups ?? []).flatMap(group => group.options.map(option => option.item.name))], normalizedQuery)
      ),
    [archetypes, normalizedQuery]
  );

  const filteredNpcs = useMemo(
    () => npcs.filter((npc) => matchesQuery([npc.name, npc.description], normalizedQuery)),
    [npcs, normalizedQuery]
  );

  const filteredVaesen = useMemo(
    () => vaesen.filter((entry) => matchesQuery([entry.name, entry.description, entry.magicalPowers], normalizedQuery)),
    [vaesen, normalizedQuery]
  );

  const filteredRules = GENERAL_RULES_SECTIONS.filter(section => matchesQuery([section.title,section.body],normalizedQuery));
  const resultCount = { rules: filteredRules.length, skills: filteredSkills.length, items: filteredItems.length, talents: filteredTalents.length, archetypes: filteredArchetypes.length, npcs: filteredNpcs.length, vaesen: filteredVaesen.length }[activeTab];

  return (
    <div className="space-y-6">
      <PageMasthead title="Compendium" eyebrow="The Society's Library" description="Rules, equipment, and lore at your fingertips. Search a category to find what you need at the table." artwork="library" />
      <div className="ledger-search-toolbar">
        <label>Search {tabs.find(tab => tab.id === activeTab)?.label}<input type="search" value={query} onChange={event => updateUrl("q",event.target.value)} placeholder="Name, rule, or keyword..." /></label>
        {activeTab === "items" && <label>Item type<select value={itemTypeFilter} onChange={event => updateUrl("type",event.target.value)}><option value="ALL">All items</option>{EQUIPMENT_TYPES.map(type => <option key={type} value={type}>{typeName(type)}</option>)}</select></label>}
        {activeTab === "talents" && <label>Talent type<select value={talentTypeFilter} onChange={event => updateUrl("talent",event.target.value)}><option value="ALL">All talents</option><option value="GENERAL">General</option><option value="ARCHETYPE">Archetype</option></select></label>}
        {activeTab === "skills" && <label>Attribute<select className="capitalize" value={attributeFilter} onChange={event => updateUrl("attribute",event.target.value)}><option value="ALL">All attributes</option>{ATTRIBUTE_KEYS.map(key=><option key={key} value={key}>{key[0].toUpperCase()+key.slice(1)}</option>)}</select></label>}
        {(query || itemTypeFilter !== "ALL" || talentTypeFilter !== "ALL" || attributeFilter !== "ALL") && <button type="button" className="ledger-button" onClick={() => {const next = new URLSearchParams(window.location.search); for (const key of ["q","type","talent","attribute"]) next.delete(key);window.history.replaceState(null,"","/compendium?"+next.toString());}}>Clear Filters</button>}
      </div>

      <nav className="ledger-tabs" aria-label="Compendium categories">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            aria-pressed={activeTab === tab.id}
            onClick={() => updateUrl("tab", tab.id, true)}
            className={`rounded-md border px-4 py-2 text-sm font-semibold transition-colors ${
              activeTab === tab.id
                ? "border-[var(--ledger-accent)]/65 bg-[rgba(127,48,40,0.12)] text-[var(--ledger-accent)]"
                : "border-[var(--ledger-line)]/55 bg-[var(--ledger-surface-strong)] text-[var(--ledger-ink-soft)] hover:text-[var(--ledger-ink)]"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </nav>

      <p role="status" className="ledger-helper-copy">{resultCount} {resultCount === 1 ? "entry" : "entries"}{query ? ` matching "${query}"` : ""}</p>
      {resultCount === 0 && <p className="ledger-status">No matching entries. Try a different keyword or clear the filters.</p>}
      {activeTab === "rules" ? (
        <section className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {filteredRules.map((section) => (
            <article key={section.title} className="rounded-sm border border-[var(--ledger-line)]/55 bg-[var(--ledger-surface-strong)] p-5">
              <h2 className="text-lg font-bold text-[var(--ledger-ink)]">{section.title}</h2>
              <p className="mt-2 text-sm leading-relaxed text-[var(--ledger-ink)]">{section.body}</p>
            </article>
          ))}
        </section>
      ) : null}

      {activeTab === "skills" && <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{filteredSkills.map(skill=><article key={skill.key} className="ledger-panel p-5"><h2 className="text-xl font-bold mb-3">{skill.name}</h2><SkillDetails skill={skill}/></article>)}</section>}
      {activeTab === "items" ? (
        <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {filteredItems.map((item) => (
            <article key={item.id} className="rounded-sm border border-[var(--ledger-line)]/55 bg-[var(--ledger-surface-strong)] p-5">
              <div className="flex items-start justify-between gap-2">
                <h2 className="text-lg font-bold text-[var(--ledger-ink)]">{item.name}</h2>
                <span className="rounded-full bg-[var(--ledger-paper-deep)] px-2 py-1 text-xs font-semibold text-[var(--ledger-ink)]">
                  {typeName(item.type)}
                </span>
              </div>
              <div className="mt-3"><EquipmentDetails item={item} /></div>
            </article>
          ))}
          {filteredItems.length === 0 ? <p className="text-sm text-[var(--ledger-ink-soft)]">No items match this filter.</p> : null}
        </section>
      ) : null}

      {activeTab === "talents" ? (
        <section className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {filteredTalents.map((talent) => (
            <article key={talent.id} className="rounded-sm border border-[var(--ledger-line)]/55 bg-[var(--ledger-surface-strong)] p-5">
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-lg font-bold text-[var(--ledger-ink)]">{talent.name}</h2>
                <span className="rounded-full bg-[var(--ledger-paper-deep)] px-2 py-1 text-xs font-semibold text-[var(--ledger-ink)]">
                  {talent.type}
                </span>
              </div>
              <p className="mt-2 text-sm text-[var(--ledger-ink)]">{talent.description}</p>
            </article>
          ))}
          {filteredTalents.length === 0 ? <p className="text-sm text-[var(--ledger-ink-soft)]">No talents match this filter.</p> : null}
        </section>
      ) : null}

      {activeTab === "archetypes" ? (
        <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {filteredArchetypes.map((archetype) => (
            <article key={archetype.id} className="rounded-sm border border-[var(--ledger-line)]/55 bg-[var(--ledger-surface-strong)] p-5">
              <h2 className="text-lg font-bold text-[var(--ledger-ink)]">{archetype.name}</h2>
              {archetype.sourceBook && <p className="mt-2 text-xs text-[var(--ledger-ink-soft)]">{archetype.sourceBook}, p. {archetype.sourcePage}</p>}
              {archetype.flavorText && <p className="mt-3 italic whitespace-pre-wrap leading-relaxed">{archetype.flavorText}</p>}
              <p className="mt-2 text-sm text-[var(--ledger-ink)]">Main Attribute: {archetype.mainAttribute}</p>
              <p className="text-sm text-[var(--ledger-ink)]">Main Skill: {archetype.mainSkill}</p>
              <p className="mt-2 text-xs text-[var(--ledger-ink-soft)]">
                Starting resources: {archetype.startingResourcesMin} - {archetype.startingResourcesMax}
              </p>
              <p className="mt-2 text-sm">Talents: {archetype.startingTalents?.map(entry => entry.talent.name).join(", ") || "No starting list configured"}</p>
              <p className="mt-2 text-sm">Equipment: {archetype.equipmentGroups?.map(group => `${group.options.map(option => option.item.name).join(" or ")} (x${group.quantity})`).join("; ") || "No equipment template configured"}</p>
              <details className="mt-4 border-t border-[var(--ledger-line)] pt-3"><summary className="cursor-pointer font-bold">Character Suggestions</summary>
                <dl className="mt-3 space-y-3">{([
                  ["First Names", archetype.firstNameOptions], ["Last Names", archetype.lastNameOptions],
                  ["Motivations", archetype.motivationOptions], ["Traumas", archetype.traumaOptions],
                  ["Dark Secrets", archetype.darkSecretOptions], ["Relationships", archetype.relationshipOptions],
                ] as [string, string[]][]).map(([label, options]) => <div key={label}><dt className="font-bold">{label}</dt><dd>{options.length ? options.join("; ") : "Write your own"}</dd></div>)}</dl>
              </details>
            </article>
          ))}
          {filteredArchetypes.length === 0 ? <p className="text-sm text-[var(--ledger-ink-soft)]">No archetypes match this search.</p> : null}
        </section>
      ) : null}

      {activeTab === "npcs" && canViewGmContent ? (
        <section className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {filteredNpcs.map((npc) => (
            <article key={npc.id} className="rounded-sm border border-[var(--ledger-accent)]/65 bg-[var(--ledger-surface-strong)] p-5">
              <h2 className="text-lg font-bold text-[var(--ledger-ink)]">{npc.name}</h2>
              <p className="mt-2 text-sm text-[var(--ledger-ink)]">{npc.description}</p>
              <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-[var(--ledger-ink-soft)]">
                <span>Physique {npc.physique}</span>
                <span>Precision {npc.precision}</span>
                <span>Logic {npc.logic}</span>
                <span>Empathy {npc.empathy}</span>
                <span>Physical Toughness {npc.physicalToughness}</span>
                <span>Mental Toughness {npc.mentalToughness}</span>
              </div>
            </article>
          ))}
          {filteredNpcs.length === 0 ? <p className="text-sm text-[var(--ledger-ink-soft)]">No NPCs match this search.</p> : null}
        </section>
      ) : null}

      {activeTab === "vaesen" && canViewGmContent ? (
        <section className="grid grid-cols-1 gap-4">
          {filteredVaesen.map((entry) => (
            <article key={entry.id} className="rounded-sm border border-red-700/30 bg-[var(--ledger-surface-strong)] p-5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h2 className="text-2xl font-bold text-[var(--ledger-ink)]">{entry.name}</h2>
                <span className="rounded-full border border-red-500/30 bg-red-500/10 px-2 py-1 text-xs font-semibold text-[var(--ledger-danger)]">
                  Fear {entry.fear}
                </span>
              </div>
              <p className="mt-2 text-sm text-[var(--ledger-ink)]">{entry.description}</p>
              <div className="mt-4 grid grid-cols-2 gap-2 text-xs text-[var(--ledger-ink-soft)] sm:grid-cols-4">
                <span>Might {entry.might}</span>
                <span>Body {entry.bodyControl}</span>
                <span>Magic {entry.magic}</span>
                <span>Manipulation {entry.manipulation}</span>
              </div>
              <div className="mt-4 space-y-2 text-sm">
                <p><span className="font-semibold text-[var(--ledger-ink)]">Magical Powers:</span> {entry.magicalPowers}</p>
                <p><span className="font-semibold text-[var(--ledger-ink)]">Ritual:</span> {entry.ritual}</p>
                <p><span className="font-semibold text-[var(--ledger-ink)]">Secret:</span> {entry.secret}</p>
              </div>
            </article>
          ))}
          {filteredVaesen.length === 0 ? <p className="text-sm text-[var(--ledger-ink-soft)]">No Vaesen match this search.</p> : null}
        </section>
      ) : null}
    </div>
  );
}
