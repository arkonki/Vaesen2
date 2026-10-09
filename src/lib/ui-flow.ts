export function safeCallbackPath(value: string | null | undefined) {
  if (!value || !value.startsWith("/") || value.startsWith("//") || /[\\\u0000-\u0020]/.test(value)) return "/";
  try {
    const url = new URL(value, "https://vaesen.invalid");
    if (url.origin !== "https://vaesen.invalid" || url.pathname === "/login" || url.pathname.startsWith("/api/")) return "/";
    return url.pathname + url.search + url.hash;
  } catch { return "/"; }
}

export const COMPENDIUM_TABS = ["rules", "skills", "items", "talents", "archetypes", "npcs", "vaesen"] as const;
export type CompendiumTab = typeof COMPENDIUM_TABS[number];
export function compendiumTab(value: string | null, canViewGmContent: boolean): CompendiumTab {
  return COMPENDIUM_TABS.includes(value as CompendiumTab) && (canViewGmContent || !["npcs", "vaesen"].includes(value!)) ? value as CompendiumTab : "rules";
}
