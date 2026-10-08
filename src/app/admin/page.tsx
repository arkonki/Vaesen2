import Link from "next/link";
import PageMasthead from "@/components/page-masthead";
const sections = [
  ["users", "Users & Access", "Create accounts, assign roles, and manage access to the Society."],
  ["archetypes", "Archetypes", "Define hunter archetypes and their starting attributes, skills, and resources."],
  ["items", "Items & Gear", "Manage weapons, armor, equipment, and their game statistics."],
  ["talents", "Talents", "Maintain general abilities and archetype-specific talents."],
  ["npcs", "NPCs", "Keep the GM-only cast of allies, rivals, and strangers."],
  ["vaesen", "Vaesen", "Maintain GM-only creatures, powers, rituals, and secrets."],
];
export default function AdminDashboardPage() {
  return <div className="space-y-6"><PageMasthead title="The Keeper's Desk" eyebrow="Administration" description="Maintain the Society's accounts and reference library. Content changes are available to character creation and the Compendium immediately." artwork="library" /><div className="grid gap-4 sm:grid-cols-2">{sections.map(([path,title,description]) => <Link key={path} href={"/admin/"+path} className="ledger-panel p-5 hover:bg-[var(--ledger-paper-deep)]"><h2 className="text-xl font-bold">{title}</h2><p className="mt-2 leading-relaxed">{description}</p><p className="mt-3 font-bold text-[var(--ledger-accent)]">Manage {title}</p></Link>)}</div></div>;
}
