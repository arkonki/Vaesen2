// Core book chapter 6, printed pages 86-95; narrative text is summarized.
export type UpgradeType = "facilities" | "contacts" | "personnel";
export type UpgradeCategory = UpgradeType | "discovered";
export type Requirement =
  | { upgrade: string }
  | { resources: number }
  | { archetype: string }
  | { inspiration: number }
  | { fact: string }
  | { facilities: number }
  | { any: Requirement[] };
export type Benefit = {
  text: string;
  scope?: "character" | "group" | "session";
  healing?: {
    domain: "physical" | "mental" | "both";
    count: number;
    broken?: boolean;
  };
  recovery?: { domain: "physical" | "mental"; bonus?: number; push?: boolean };
  resources?: number;
  capital?: number;
  advantage?: string[];
  freeSuccess?: string;
  equipment?: {
    types?: string[];
    availability?: number;
    skill?: string;
    names?: string[];
    quantity?: number;
  };
};
export type UpgradeOption = {
  key: string;
  name: string;
  category: UpgradeCategory;
  cost: number;
  page: number;
  description: string;
  requirements: Requirement[];
  max: number | null;
  function?: Benefit;
  asset?: Benefit;
  discovery?: string;
  storage?: { common?: number; occult?: number };
  starting?: boolean;
  personnelStats?: {
    attributes: number;
    attributeMax: number;
    skills: number;
    skillMax: number;
    allowedSkills?: string[];
    physicalSkills?: number;
    physicalToughness: number;
    mentalToughness: number;
  };
};
const u = (upgrade: string): Requirement => ({ upgrade });
const r = (resources: number): Requirement => ({ resources });
const a = (archetype: string): Requirement => ({ archetype });
const any = (...choices: Requirement[]): Requirement => ({ any: choices });
function entry(
  key: string,
  name: string,
  category: UpgradeCategory,
  cost: number,
  page: number,
  requirements: Requirement[],
  benefits: Partial<UpgradeOption>,
): UpgradeOption {
  return {
    key,
    name,
    category,
    cost,
    page,
    requirements,
    max: 1,
    description: name,
    ...benefits,
  };
}
export const HQ_UPGRADES: UpgradeOption[] = [
  entry(
    "armory",
    "Armory",
    "facilities",
    5,
    89,
    [r(5), u("weapons-corridor")],
    {
      max: 3,
      function: {
        text: "Prepare one availability 2 melee weapon or armor per level.",
        equipment: { types: ["WEAPON", "ARMOR"], availability: 2 },
      },
    },
  ),
  entry(
    "butterfly-house",
    "Butterfly House",
    "facilities",
    2,
    89,
    [u("botanical-garden")],
    {
      function: {
        text: "A garden scene heals two mental conditions.",
        healing: { domain: "mental", count: 2 },
      },
    },
  ),
  entry(
    "carp-pond",
    "Carp Pond",
    "facilities",
    2,
    89,
    [u("botanical-garden")],
    {
      function: {
        text: "One investigator gains Unwavering Calm before a mystery.",
        advantage: ["Unwavering Calm"],
      },
    },
  ),
  entry(
    "infirmary",
    "Infirmary",
    "facilities",
    6,
    89,
    [any(r(5), a("Doctor"))],
    {
      function: {
        text: "Each investigator may push physical recovery.",
        scope: "character",
        recovery: { domain: "physical", push: true },
      },
    },
  ),
  entry(
    "kennel",
    "Kennel",
    "facilities",
    4,
    90,
    [any(u("gamekeeper"), a("Hunter"))],
    {
      max: 3,
      asset: {
        text: "Prepare a guard dog or hunting dog per level.",
        equipment: { names: ["Guard Dog", "Hunting Dog"] },
      },
    },
  ),
  entry("library", "Library", "facilities", 0, 90, [], {
    starting: true,
    function: {
      text: "The GM can provide research clues from the Society's library.",
    },
  }),
  entry("local-tavern", "Local Tavern", "facilities", 4, 90, [], {
    max: 3,
    function: {
      text: "One investigator per level gains two physical recovery dice.",
      recovery: { domain: "physical", bonus: 2 },
    },
  }),
  entry(
    "map-room",
    "Map Room",
    "facilities",
    4,
    90,
    [any(u("library"), u("professor"))],
    {
      asset: {
        text: "One investigator gains the Old Map advantage.",
        advantage: ["Old Map"],
      },
    },
  ),
  entry(
    "observatory",
    "Observatory",
    "facilities",
    5,
    90,
    [any(u("patron"), u("inventor"))],
    {
      function: {
        text: "One investigator gains Divination or Weather Prophet.",
        advantage: ["Divination", "Weather Prophet"],
      },
      asset: {
        text: "Prepare binoculars for one investigator.",
        equipment: { names: ["Binoculars"] },
      },
    },
  ),
  entry("pigeon-loft", "Pigeon Loft", "facilities", 4, 90, [u("caretaker")], {
    asset: {
      text: "Take a homing pigeon to send for help.",
      equipment: { names: ["Homing Pigeon"] },
    },
  }),
  entry(
    "seance-parlor",
    "Seance Parlor",
    "facilities",
    5,
    90,
    [any(r(4), a("Occultist"))],
    {
      function: {
        text: "Hold a seance; the GM decides which additional clues it supplies.",
      },
    },
  ),
  entry(
    "shooting-range",
    "Shooting Range",
    "facilities",
    5,
    90,
    [u("weapons-corridor")],
    {
      max: 3,
      function: {
        text: "Castle guards carry availability 3 ranged weapons (4 with Gamekeeper).",
        scope: "group",
      },
      asset: {
        text: "Prepare an availability 1-3 ranged weapon per level (1-4 with Gamekeeper).",
        equipment: {
          types: ["WEAPON"],
          availability: 3,
          skill: "rangedCombat",
        },
      },
    },
  ),
  entry("stable", "Stable", "facilities", 4, 90, [any(r(5), a("Vagabond"))], {
    max: 3,
    asset: {
      text: "Prepare one scrawny horse per level; horses are strong with Stable Boy.",
      equipment: { names: ["Scrawny Horse", "Horse", "Strong Horse"] },
    },
  }),
  entry("annals", "The Annals of the Society", "facilities", 4, 91, [], {
    function: {
      text: "Recording a gaming session grants every investigator one XP.",
      scope: "session",
    },
  }),
  entry("weapons-corridor", "Weapons Corridor", "facilities", 4, 91, [r(4)], {
    max: 3,
    function: {
      text: "Prepare an availability 1 melee weapon per level.",
      equipment: { types: ["WEAPON"], availability: 1, skill: "closeCombat" },
    },
  }),
  entry("workshop", "Workshop", "facilities", 4, 91, [r(4)], {
    function: {
      text: "One investigator gains Well-Maintained Weapons or Well-Maintained Tools.",
      advantage: ["Well-Maintained Weapons", "Well-Maintained Tools"],
    },
  }),
  entry(
    "botanical-garden",
    "Botanical Garden",
    "discovered",
    4,
    91,
    [u("gardener")],
    {
      discovery: "Exotic plants surround the ruins of a glazed garden.",
      function: {
        text: "A garden scene heals two mental conditions.",
        healing: { domain: "mental", count: 2 },
      },
    },
  ),
  entry("cellar-vault", "Cellar Vault", "discovered", 4, 91, [], {
    max: 3,
    discovery: "A damaged cellar door opens toward a passage under the annex.",
    storage: { common: 3 },
    function: {
      text: "Each level preserves three common items or weapons between mysteries.",
      scope: "group",
    },
  }),
  entry("chapel", "Chapel", "discovered", 6, 91, [any(r(5), a("Priest"))], {
    discovery:
      "An overgrown ruin contains fragments of stained glass and an altar.",
    function: {
      text: "Each investigator may push mental recovery.",
      scope: "character",
      recovery: { domain: "mental", push: true },
    },
    asset: {
      text: "Prepare holy water.",
      scope: "character",
      equipment: { names: ["Holy Water"] },
    },
  }),
  entry(
    "difference-engine",
    "Difference Engine",
    "discovered",
    6,
    91,
    [u("inventor")],
    {
      discovery:
        "The inventor proposes a machine assembled in an unused castle hall.",
      function: {
        text: "Reduce the construction cost of facilities by one DP.",
        scope: "group",
      },
    },
  ),
  entry("dungeon", "Dungeon", "discovered", 3, 91, [u("cellar-vault")], {
    discovery: "A ruined underground stairway ends at a barred iron door.",
    function: { text: "Prisoners cannot escape without outside help." },
  }),
  entry(
    "forgotten-gallery",
    "Forgotten Gallery",
    "discovered",
    6,
    92,
    [any(u("guard"), u("occult-library"))],
    {
      discovery:
        "Marks behind an old shelf suggest an opening into another chamber.",
      function: {
        text: "One investigator gains one Resources for this mystery.",
        resources: 1,
      },
      asset: {
        text: "Old journal clues grant +1 Investigation or Observation when relevant.",
      },
    },
  ),
  entry("gymnasium", "Gymnasium", "discovered", 5, 92, [], {
    discovery:
      "A door behind stored tools leads to an abandoned exercise hall.",
    function: {
      text: "A training scene heals one physical condition.",
      healing: { domain: "physical", count: 1 },
    },
  }),
  entry(
    "occult-archive",
    "Occult Archive",
    "discovered",
    6,
    92,
    [any(u("occult-temple"), u("mystic"))],
    {
      max: 3,
      discovery:
        "Blocked alcoves behind the library conceal heavy protective doors.",
      storage: { occult: 3 },
      function: {
        text: "Each level preserves three power or magic items between mysteries.",
        scope: "group",
      },
    },
  ),
  entry(
    "occult-library",
    "Occult Library",
    "discovered",
    5,
    92,
    [{ fact: "occult-book" }],
    {
      discovery: "A library bookcase sounds hollow when tapped.",
      function: {
        text: "One investigator recalls occult information for a free success.",
        freeSuccess: "Locating or understanding occult knowledge",
      },
    },
  ),
  entry(
    "occult-temple",
    "Occult Temple",
    "discovered",
    5,
    92,
    [u("occult-library")],
    {
      discovery:
        "Loose runed stones conceal a sealed hatch under the occult library.",
      function: {
        text: "One investigator gains the Occultist advantage.",
        advantage: ["Occultist"],
      },
    },
  ),
  entry(
    "occult-workshop",
    "Occult Workshop",
    "discovered",
    5,
    92,
    [u("occult-library")],
    {
      discovery:
        "A statue conceals a sealed crafting vault marked with a rune of creation.",
      function: {
        text: "Craft one power item; the GM chooses or rolls the result.",
        equipment: { types: ["MAGIC"] },
      },
    },
  ),
  entry(
    "self-flagellation-tools",
    "Self-Flagellation Tools",
    "discovered",
    4,
    92,
    [u("dungeon")],
    {
      max: 3,
      discovery: "A basement cupboard holds instruments of bodily punishment.",
      function: {
        text: "One investigator per level gains one mental recovery die.",
        recovery: { domain: "mental", bonus: 1 },
      },
    },
  ),
  entry(
    "treasure-chamber",
    "Treasure Chamber",
    "discovered",
    6,
    92,
    [any(u("banker"), u("forgotten-gallery"))],
    {
      discovery: "A hidden iron vault is secured by a numbered dial.",
      function: {
        text: "Each investigator gains one Resources for this mystery.",
        scope: "character",
        resources: 1,
      },
    },
  ),
  entry("banker", "Banker", "contacts", 5, 93, [r(5)], {
    function: {
      text: "One investigator gains two Resources for one scene.",
      resources: 2,
    },
  }),
  entry("fixer", "Fixer", "contacts", 4, 93, [{ facilities: 6 }], {
    function: {
      text: "Restore or retrieve a lost memento after a mystery without paying XP.",
    },
  }),
  entry(
    "journalist",
    "Journalist",
    "contacts",
    4,
    93,
    [any(r(4), a("Author"))],
    {
      function: {
        text: "The journalist offers clues or accompanies the investigators.",
      },
    },
  ),
  entry(
    "patron",
    "Patron",
    "contacts",
    4,
    94,
    [any({ inspiration: 5 }, a("Military Officer"))],
    {
      function: {
        text: "A free success on Manipulation when negotiating a price.",
        freeSuccess: "Manipulation while bartering or negotiating prices",
      },
    },
  ),
  entry(
    "police-constable",
    "Police Constable",
    "contacts",
    4,
    94,
    [any(r(5), a("Private Investigator"))],
    {
      function: {
        text: "The GM adjudicates clues, fabricated evidence or police protection.",
      },
    },
  ),
  entry(
    "professor",
    "Professor",
    "contacts",
    4,
    94,
    [any(r(5), a("Academic"))],
    {
      function: {
        text: "A free success when finding or understanding information in Upsala.",
        freeSuccess: "Research in Upsala",
      },
    },
  ),
  entry(
    "psychiatrist",
    "Psychiatrist",
    "contacts",
    4,
    94,
    [{ fact: "mentally-broken" }],
    {
      function: {
        text: "One investigator gains two mental recovery dice.",
        recovery: { domain: "mental", bonus: 2 },
      },
    },
  ),
  entry("algot-frisk", "Butler Algot Frisk", "personnel", 0, 94, [], {
    starting: true,
    function: { text: "Algot manages the castle." },
  }),
  entry("caretaker", "Caretaker", "personnel", 3, 94, [u("workshop")], {
    function: { text: "Repair a damaged castle facility.", scope: "group" },
  }),
  entry("chef", "Chef", "personnel", 4, 94, [], {
    function: {
      text: "Prepare meals and maintain the household.",
      scope: "group",
    },
    asset: {
      text: "Provide simple provisions for every investigator.",
      scope: "group",
      equipment: { names: ["Simple Provisions", "Provisions"] },
    },
  }),
  entry("coachman", "Coachman", "personnel", 4, 94, [u("stable-boy")], {
    asset: {
      text: "Travel by carriage with two strong horses; a travel scene permits healing a condition.",
      scope: "group",
    },
    personnelStats: {
      attributes: 10,
      attributeMax: 4,
      skills: 8,
      skillMax: 3,
      physicalSkills: 2,
      physicalToughness: 1,
      mentalToughness: 1,
    },
  }),
  entry("gamekeeper", "Gamekeeper", "personnel", 5, 94, [u("shooting-range")], {
    function: {
      text: "Shooting Range weapons may have availability 4.",
      scope: "group",
    },
    asset: {
      text: "Prepare hunting equipment or a hunter trap.",
      equipment: {
        names: ["Hunting Equipment", "Hunter Trap", "Hunting Trap"],
      },
    },
  }),
  entry("gardener", "Gardener", "personnel", 4, 95, [r(5)], {
    function: { text: "All castle food counts as nutritious.", scope: "group" },
    asset: {
      text: "Prepare three weak poison doses (toxicity 3) or one strong dose (toxicity 6).",
      equipment: { names: ["Weak Poison", "Strong Poison"] },
    },
  }),
  entry("guard", "Guard", "personnel", 5, 95, [], {
    max: null,
    function: {
      text: "Protect the castle; effectiveness is adjudicated by the GM.",
      scope: "group",
    },
    personnelStats: {
      attributes: 12,
      attributeMax: 4,
      skills: 6,
      skillMax: 3,
      allowedSkills: [
        "closeCombat",
        "rangedCombat",
        "vigilance",
        "observation",
      ],
      physicalToughness: 2,
      mentalToughness: 1,
    },
  }),
  entry(
    "house-physician",
    "House Physician",
    "personnel",
    6,
    95,
    [u("infirmary")],
    {
      function: {
        text: "In one castle scene, treat Broken and two conditions for everyone.",
        scope: "group",
        healing: { domain: "both", count: 2, broken: true },
      },
      asset: {
        text: "Prepare medical equipment for the group.",
        equipment: { names: ["Medical Equipment"] },
      },
    },
  ),
  entry("inventor", "Inventor", "personnel", 5, 95, [u("professor")], {
    function: {
      text: "Build one mechanical item of any availability; the GM confirms the design.",
      equipment: { types: ["GEAR", "WEAPON", "ARMOR"] },
    },
    asset: {
      text: "Prepare chemical equipment.",
      equipment: { names: ["Chemical Equipment"] },
    },
  }),
  entry("mystic", "Mystic", "personnel", 5, 95, [u("occult-library")], {
    function: {
      text: "Gain a clue about a power or magic item connected to the mystery.",
    },
  }),
  entry(
    "quartermaster",
    "Quartermaster",
    "personnel",
    6,
    95,
    [any(u("banker"), u("patron"))],
    {
      function: {
        text: "All investigators gain two Capital for preparation or the mystery.",
        scope: "group",
        capital: 2,
      },
    },
  ),
  entry("recruit", "Recruit", "personnel", 5, 95, [{ inspiration: 4 }], {
    max: null,
    function: {
      text: "A person with the Sight joins expeditions; the GM controls them.",
    },
    personnelStats: {
      attributes: 12,
      attributeMax: 4,
      skills: 10,
      skillMax: 2,
      physicalToughness: 1,
      mentalToughness: 1,
    },
  }),
  entry("stable-boy", "Stable Boy", "personnel", 3, 95, [u("stable")], {
    function: {
      text: "Horses supplied by the castle count as strong.",
      scope: "group",
    },
  }),
];
export const DEVELOPMENT_QUESTIONS = [
  "Played a headquarters scene",
  "Encountered a new kind of vaesen",
  "Visited a magical place",
  "Experienced magic",
  "Returned with occult books or important items",
  "Made important contacts",
  "Faced a particularly difficult, epic mystery",
  "Solved the mystery",
];
export const HQ_FACTS = {
  "occult-book": "Recovered an occult book from a mystery",
  "mentally-broken": "An investigator was mentally Broken during a mystery",
};
export const THREAT_OPTIONS = [
  "Suspicious police investigator",
  "Castle burglary",
  "Extortion by a crime boss",
  "Investigative journalist",
  "Relative seeking an investigator's commitment",
  "Criminal acquaintance needing help",
  "Awakened vaesen obsessed with an investigator",
  "Vaesen attempting to occupy the castle",
  "Researchers planning to steal occult books",
  "Claimant to castle ownership",
  "Priest investigating a suspected cult",
  "Official planning demolition",
  "Debt collection from the former owner",
  "Rival occult society",
  "Vaesen disguised as a child",
];
export function upgradeByKey(key: string) {
  const result = HQ_UPGRADES.find((upgrade) => upgrade.key === key);
  if (!result) throw new Error("Unknown headquarters upgrade");
  return result;
}
export const UPGRADE_SHOP: Record<UpgradeType, UpgradeOption[]> = {
  facilities: HQ_UPGRADES.filter(
    (u) => u.category === "facilities" || u.category === "discovered",
  ),
  contacts: HQ_UPGRADES.filter((u) => u.category === "contacts"),
  personnel: HQ_UPGRADES.filter((u) => u.category === "personnel"),
};
export function getUpgrade(type: UpgradeType, name: string) {
  const result = UPGRADE_SHOP[type]?.find((u) => u.name === name);
  if (!result) throw new Error("Unknown headquarters upgrade");
  return result;
}
