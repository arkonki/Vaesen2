export function jsonRecord(input: unknown): Record<string, unknown> {
  if (typeof input === "string") {
    try { input = JSON.parse(input); } catch { return {}; }
  }
  return input && typeof input === "object" && !Array.isArray(input) ? input as Record<string, unknown> : {};
}

export function numericRecord(input: unknown): Record<string, number> {
  return Object.fromEntries(Object.entries(jsonRecord(input)).filter((entry): entry is [string, number] => typeof entry[1] === "number"));
}

export function stringRecord(input: unknown): Record<string, string> {
  return Object.fromEntries(Object.entries(jsonRecord(input)).map(([key, value]) => [key, String(value ?? "")]));
}

export type Weapon = { name: string; damage: number; range: string };
export function weaponList(input: unknown): Weapon[] {
  if (typeof input === "string") {
    try { input = JSON.parse(input); } catch { return []; }
  }
  if (!Array.isArray(input)) return [];
  return input.map((value) => jsonRecord(value)).map((weapon) => ({
    name: typeof weapon.name === "string" ? weapon.name : "Unknown weapon",
    damage: typeof weapon.damage === "number" ? weapon.damage : 0,
    range: typeof weapon.range === "string" ? weapon.range : "Close",
  }));
}
