export type UpgradeType = "facilities" | "contacts" | "personnel";
export type UpgradeOption = { name: string; cost: number; description: string };

export const UPGRADE_SHOP: Record<UpgradeType, UpgradeOption[]> = {
  facilities: [
    { name: "Infirmary", cost: 6, description: "Heal physical conditions faster between mysteries." },
    { name: "Botanical Garden", cost: 4, description: "Gather rare ingredients and improve field recovery." },
    { name: "Library", cost: 4, description: "Gain better context for research-heavy investigations." },
    { name: "Workshop", cost: 5, description: "Maintain and customize gear for expeditions." },
  ],
  contacts: [
    { name: "Police Inspector", cost: 3, description: "Access official reports and active investigations." },
    { name: "University Professor", cost: 3, description: "Academic insight into occult, folklore, and history." },
    { name: "Local Merchant", cost: 2, description: "Reliable channel to acquire scarce items quickly." },
  ],
  personnel: [
    { name: "Guard", cost: 3, description: "Improves HQ safety and response to hostile incidents." },
    { name: "Butler", cost: 2, description: "Keeps HQ operations stable during long investigations." },
    { name: "Coachman", cost: 2, description: "Enables faster departure when time pressure is high." },
  ],
};

export function getUpgrade(type: UpgradeType, name: string) {
  if (!["facilities", "contacts", "personnel"].includes(type)) throw new Error("Invalid upgrade category");
  const upgrade = UPGRADE_SHOP[type].find((entry) => entry.name === name);
  if (!upgrade) throw new Error("Unknown headquarters upgrade");
  return upgrade;
}
