import {
  HQ_UPGRADES,
  HQ_FACTS,
  type Requirement,
  type UpgradeOption,
} from "./hq-upgrades";
export type CastleContext = {
  owned: Array<{ key: string; category: string; status: string }>;
  members: Array<{ resources: number; archetype: string; inspiration: number }>;
  facts: string[];
};
export function meetsRequirement(
  requirement: Requirement,
  context: CastleContext,
): boolean {
  if ("any" in requirement)
    return requirement.any.some((r) => meetsRequirement(r, context));
  if ("upgrade" in requirement)
    return context.owned.some(
      (u) => u.key === requirement.upgrade && u.status === "ACTIVE",
    );
  if ("resources" in requirement)
    return context.members.some((m) => m.resources >= requirement.resources);
  if ("archetype" in requirement)
    return context.members.some(
      (m) => m.archetype.toLowerCase() === requirement.archetype.toLowerCase(),
    );
  if ("inspiration" in requirement)
    return context.members.some(
      (m) => m.inspiration >= requirement.inspiration,
    );
  if ("fact" in requirement) return context.facts.includes(requirement.fact);
  // Repeated levels do not count as distinct facilities for the Fixer prerequisite.
  return (
    new Set(
      context.owned
        .filter(
          (u) =>
            ["facilities", "discovered"].includes(u.category) &&
            u.status === "ACTIVE",
        )
        .map((u) => u.key),
    ).size >= requirement.facilities
  );
}
export function requirementLabel(requirement: Requirement): string {
  if ("any" in requirement)
    return requirement.any.map(requirementLabel).join(" or ");
  if ("upgrade" in requirement)
    return (
      HQ_UPGRADES.find((u) => u.key === requirement.upgrade)?.name ||
      requirement.upgrade
    );
  if ("resources" in requirement)
    return `An investigator with Resources ${requirement.resources}`;
  if ("archetype" in requirement)
    return `${requirement.archetype} in the party`;
  if ("inspiration" in requirement)
    return `An investigator with Inspiration ${requirement.inspiration}`;
  if ("fact" in requirement)
    return (
      HQ_FACTS[requirement.fact as keyof typeof HQ_FACTS] || requirement.fact
    );
  return `${requirement.facilities} distinct facilities`;
}
export function missingRequirements(
  upgrade: UpgradeOption,
  context: CastleContext,
) {
  return upgrade.requirements
    .filter((r) => !meetsRequirement(r, context))
    .map(requirementLabel);
}
export function upgradeCost(upgrade: UpgradeOption, context: CastleContext) {
  const discount =
    ["facilities", "discovered"].includes(upgrade.category) &&
    meetsRequirement({ upgrade: "difference-engine" }, context)
      ? 1
      : 0;
  return Math.max(0, upgrade.cost - discount);
}
export function storageCapacity(owned: CastleContext["owned"]) {
  return owned
    .filter((u) => u.status === "ACTIVE")
    .reduce(
      (total, row) => {
        const spec = HQ_UPGRADES.find((u) => u.key === row.key)?.storage;
        return {
          common: total.common + (spec?.common || 0),
          occult: total.occult + (spec?.occult || 0),
        };
      },
      { common: 0, occult: 0 },
    );
}
export function threatRoll(
  cost: number,
  earlierPurchases: number,
  random = Math.random,
) {
  const dice = cost + earlierPurchases;
  const rolls = Array.from(
    { length: dice },
    () => Math.floor(random() * 6) + 1,
  );
  return { dice, rolls, successes: rolls.filter((die) => die === 6).length };
}
export const ATTRIBUTE_KEYS = ["physique", "precision", "logic", "empathy"];
export const SKILL_KEYS = [
  "agility",
  "closeCombat",
  "force",
  "medicine",
  "rangedCombat",
  "stealth",
  "investigation",
  "learning",
  "vigilance",
  "inspiration",
  "manipulation",
  "observation",
];
export function validatePersonnelStats(upgrade: UpgradeOption, input: unknown) {
  const rules = upgrade.personnelStats;
  if (!rules) return {};
  if (!input || typeof input !== "object" || Array.isArray(input))
    throw new Error("Personnel statistics are required");
  const stats = input as Record<string, unknown>;
  const normalized: Record<string, Record<string, number>> = {};
  for (const [group, keys, budget, max] of [
    ["attributes", ATTRIBUTE_KEYS, rules.attributes, rules.attributeMax],
    ["skills", SKILL_KEYS, rules.skills, rules.skillMax],
  ] as const) {
    const raw = stats[group];
    if (!raw || typeof raw !== "object" || Array.isArray(raw))
      throw new Error(`Invalid ${group}`);
    const values = raw as Record<string, unknown>;
    if (Object.keys(values).some((key) => !keys.includes(key)))
      throw new Error(`Unknown ${group}`);
    normalized[group] = {};
    for (const key of keys) {
      const value = values[key] ?? (group === "skills" ? 0 : undefined);
      if (
        typeof value !== "number" ||
        !Number.isInteger(value) ||
        value < (group === "attributes" ? 1 : 0) ||
        value > max
      )
        throw new Error(`Invalid ${key}`);
      if (
        group === "skills" &&
        rules.allowedSkills &&
        !rules.allowedSkills.includes(key) &&
        value !== 0
      )
        throw new Error("Skill not available to this personnel type");
      normalized[group][key] = value;
    }
    if (Object.values(normalized[group]).reduce((a, b) => a + b, 0) !== budget)
      throw new Error(`${group} must total ${budget}`);
  }
  if (
    rules.physicalSkills &&
    SKILL_KEYS.slice(0, 3).filter((key) => normalized.skills[key] > 0).length <
      rules.physicalSkills
  )
    throw new Error("Coachman needs two Physique-based skills");
  return {
    ...normalized,
    physicalToughness: rules.physicalToughness,
    mentalToughness: rules.mentalToughness,
  };
}
export function healConditions(
  input: unknown,
  count: number,
  broken = false,
  selected?: string[],
) {
  const current =
    input && typeof input === "object" && !Array.isArray(input)
      ? { ...(input as Record<string, boolean>) }
      : {};
  const keys = Object.keys(current).filter(
    (k) => k !== "broken" && current[k] === true,
  );
  const toHeal = selected ?? keys.slice(0, count);
  if (
    toHeal.length > count ||
    toHeal.some((key) => !keys.includes(key)) ||
    new Set(toHeal).size !== toHeal.length
  )
    throw new Error("Invalid healing selection");
  for (const key of toHeal) current[key] = false;
  if (broken) current.broken = false;
  return current;
}
