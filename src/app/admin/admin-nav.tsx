"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
const links = [["", "Overview"], ["/users", "Users"], ["/archetypes", "Archetypes"], ["/skills", "Skills"], ["/items", "Items"], ["/talents", "Talents"], ["/npcs", "NPCs"], ["/vaesen", "Vaesen"]];
export default function AdminNav() {
  const pathname = usePathname();
  return <nav className="ledger-subnav p-3" aria-label="Admin navigation">{links.map(([suffix,label]) => <Link key={label} href={"/admin"+suffix} aria-current={(suffix ? pathname.startsWith("/admin"+suffix) : pathname === "/admin") ? "page" : undefined}>{label}</Link>)}</nav>;
}
