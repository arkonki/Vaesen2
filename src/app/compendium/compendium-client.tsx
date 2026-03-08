"use client";

import { useMemo, useState } from "react";
import { Archetype, Item, ItemType, NPC, Talent, TalentType, Vaesen } from "@prisma/client";

type TabId = "rules" | "items" | "talents" | "archetypes" | "npcs" | "vaesen";

type CompendiumClientProps = {
  role: string;
  canViewGmContent: boolean;
  items: Item[];
  talents: Talent[];
  archetypes: Archetype[];
  npcs: NPC[];
  vaesen: Vaesen[];
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
  role,
  canViewGmContent,
  items,
  talents,
  archetypes,
  npcs,
  vaesen,
}: CompendiumClientProps) {
  const tabs = useMemo(
    () =>
      [
        { id: "rules" as TabId, label: "General Rules" },
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

  const [activeTab, setActiveTab] = useState<TabId>(tabs[0].id);
  const [query, setQuery] = useState("");
  const [itemTypeFilter, setItemTypeFilter] = useState<"ALL" | ItemType>("ALL");
  const [talentTypeFilter, setTalentTypeFilter] = useState<"ALL" | TalentType>("ALL");

  const normalizedQuery = query.trim().toLowerCase();

  const filteredItems = useMemo(
    () =>
      items.filter(
        (item) =>
          (itemTypeFilter === "ALL" || item.type === itemTypeFilter) &&
          matchesQuery([item.name, item.description, item.skill, item.range], normalizedQuery)
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
        matchesQuery([archetype.name, archetype.mainAttribute, archetype.mainSkill], normalizedQuery)
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

  return (
    <div className="space-y-6">
      <header className="rounded-2xl border border-neutral-800 bg-neutral-900 p-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-4xl font-extrabold tracking-tight text-white">Compendium</h1>
            <p className="mt-2 text-neutral-400">
              Searchable rules and world reference for players, game masters, and admins.
            </p>
          </div>
          <span className="rounded-full border border-neutral-700 bg-neutral-950 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-neutral-300">
            Role: {role}
          </span>
        </div>

        <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search current category..."
            className="rounded-md border border-neutral-700 bg-neutral-950 px-3 py-2 text-sm text-neutral-100 outline-none focus:border-indigo-500"
          />

          {activeTab === "items" ? (
            <select
              value={itemTypeFilter}
              onChange={(event) => setItemTypeFilter(event.target.value as "ALL" | ItemType)}
              className="rounded-md border border-neutral-700 bg-neutral-950 px-3 py-2 text-sm text-neutral-100 outline-none focus:border-indigo-500"
            >
              <option value="ALL">All Item Types</option>
              <option value="WEAPON">Weapons</option>
              <option value="ARMOR">Armor</option>
              <option value="GEAR">Gear</option>
              <option value="MAGIC">Magic</option>
            </select>
          ) : null}

          {activeTab === "talents" ? (
            <select
              value={talentTypeFilter}
              onChange={(event) => setTalentTypeFilter(event.target.value as "ALL" | TalentType)}
              className="rounded-md border border-neutral-700 bg-neutral-950 px-3 py-2 text-sm text-neutral-100 outline-none focus:border-indigo-500"
            >
              <option value="ALL">All Talent Types</option>
              <option value="GENERAL">General</option>
              <option value="ARCHETYPE">Archetype</option>
            </select>
          ) : null}
        </div>
      </header>

      <nav className="flex flex-wrap gap-2">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            className={`rounded-md border px-4 py-2 text-sm font-semibold transition-colors ${
              activeTab === tab.id
                ? "border-indigo-400 bg-indigo-500/20 text-indigo-100"
                : "border-neutral-700 bg-neutral-900 text-neutral-400 hover:text-white"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </nav>

      {activeTab === "rules" ? (
        <section className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {GENERAL_RULES_SECTIONS.map((section) => (
            <article key={section.title} className="rounded-xl border border-neutral-800 bg-neutral-900 p-5">
              <h2 className="text-lg font-bold text-white">{section.title}</h2>
              <p className="mt-2 text-sm leading-relaxed text-neutral-300">{section.body}</p>
            </article>
          ))}
        </section>
      ) : null}

      {activeTab === "items" ? (
        <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {filteredItems.map((item) => (
            <article key={item.id} className="rounded-xl border border-neutral-800 bg-neutral-900 p-5">
              <div className="flex items-start justify-between gap-2">
                <h2 className="text-lg font-bold text-white">{item.name}</h2>
                <span className="rounded-full bg-neutral-800 px-2 py-1 text-xs font-semibold text-neutral-300">
                  {item.type}
                </span>
              </div>
              <p className="mt-2 text-sm text-neutral-300">{item.description || "No description."}</p>
              <div className="mt-3 flex flex-wrap gap-2 text-xs text-neutral-400">
                <span>Bonus +{item.bonus}</span>
                <span>Availability {item.availability}</span>
                {item.damage !== null ? <span>Damage {item.damage}</span> : null}
                {item.range ? <span>Range {item.range}</span> : null}
                {item.skill ? <span>Skill {item.skill}</span> : null}
              </div>
            </article>
          ))}
          {filteredItems.length === 0 ? <p className="text-sm text-neutral-500">No items match this filter.</p> : null}
        </section>
      ) : null}

      {activeTab === "talents" ? (
        <section className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {filteredTalents.map((talent) => (
            <article key={talent.id} className="rounded-xl border border-neutral-800 bg-neutral-900 p-5">
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-lg font-bold text-white">{talent.name}</h2>
                <span className="rounded-full bg-neutral-800 px-2 py-1 text-xs font-semibold text-neutral-300">
                  {talent.type}
                </span>
              </div>
              <p className="mt-2 text-sm text-neutral-300">{talent.description}</p>
            </article>
          ))}
          {filteredTalents.length === 0 ? <p className="text-sm text-neutral-500">No talents match this filter.</p> : null}
        </section>
      ) : null}

      {activeTab === "archetypes" ? (
        <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {filteredArchetypes.map((archetype) => (
            <article key={archetype.id} className="rounded-xl border border-neutral-800 bg-neutral-900 p-5">
              <h2 className="text-lg font-bold text-white">{archetype.name}</h2>
              <p className="mt-2 text-sm text-neutral-300">Main Attribute: {archetype.mainAttribute}</p>
              <p className="text-sm text-neutral-300">Main Skill: {archetype.mainSkill}</p>
              <p className="mt-2 text-xs text-neutral-400">
                Starting resources: {archetype.startingResourcesMin} - {archetype.startingResourcesMax}
              </p>
            </article>
          ))}
          {filteredArchetypes.length === 0 ? <p className="text-sm text-neutral-500">No archetypes match this search.</p> : null}
        </section>
      ) : null}

      {activeTab === "npcs" && canViewGmContent ? (
        <section className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {filteredNpcs.map((npc) => (
            <article key={npc.id} className="rounded-xl border border-amber-700/30 bg-neutral-900 p-5">
              <h2 className="text-lg font-bold text-white">{npc.name}</h2>
              <p className="mt-2 text-sm text-neutral-300">{npc.description}</p>
              <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-neutral-400">
                <span>Physique {npc.physique}</span>
                <span>Precision {npc.precision}</span>
                <span>Logic {npc.logic}</span>
                <span>Empathy {npc.empathy}</span>
                <span>Physical Toughness {npc.physicalToughness}</span>
                <span>Mental Toughness {npc.mentalToughness}</span>
              </div>
            </article>
          ))}
          {filteredNpcs.length === 0 ? <p className="text-sm text-neutral-500">No NPCs match this search.</p> : null}
        </section>
      ) : null}

      {activeTab === "vaesen" && canViewGmContent ? (
        <section className="grid grid-cols-1 gap-4">
          {filteredVaesen.map((entry) => (
            <article key={entry.id} className="rounded-xl border border-red-700/30 bg-neutral-900 p-5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h2 className="text-2xl font-bold text-white">{entry.name}</h2>
                <span className="rounded-full border border-red-500/30 bg-red-500/10 px-2 py-1 text-xs font-semibold text-red-200">
                  Fear {entry.fear}
                </span>
              </div>
              <p className="mt-2 text-sm text-neutral-300">{entry.description}</p>
              <div className="mt-4 grid grid-cols-2 gap-2 text-xs text-neutral-400 sm:grid-cols-4">
                <span>Might {entry.might}</span>
                <span>Body {entry.bodyControl}</span>
                <span>Magic {entry.magic}</span>
                <span>Manipulation {entry.manipulation}</span>
              </div>
              <div className="mt-4 space-y-2 text-sm">
                <p><span className="font-semibold text-neutral-200">Magical Powers:</span> {entry.magicalPowers}</p>
                <p><span className="font-semibold text-neutral-200">Ritual:</span> {entry.ritual}</p>
                <p><span className="font-semibold text-neutral-200">Secret:</span> {entry.secret}</p>
              </div>
            </article>
          ))}
          {filteredVaesen.length === 0 ? <p className="text-sm text-neutral-500">No Vaesen match this search.</p> : null}
        </section>
      ) : null}
    </div>
  );
}
