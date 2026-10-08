"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Users,
  Castle,
  ScrollText,
  ListTodo,
  StickyNote,
  Package,
  Search
} from "lucide-react";
import { cn } from "@/lib/utils";

const navigations = [
  { name: "Overview", href: "", icon: ScrollText },
  { name: "Mysteries", href: "/mysteries", icon: Search },
  { name: "Goals", href: "/goals", icon: ListTodo },
  { name: "Equipment", href: "/equipment", icon: Package },
  { name: "Headquarters", href: "/hq", icon: Castle },
  { name: "Notes", href: "/notes", icon: StickyNote },
  { name: "Atlas", href: "/atlas", icon: ScrollText },
  { name: "Members", href: "/management", icon: Users },
];

export default function SidebarNav({ partyId }: { partyId: string }) {
  const pathname = usePathname();

  return (
    <nav className="ledger-subnav" aria-label="Party navigation">
      {navigations.map((item) => {
        const fullHref = `/parties/${partyId}${item.href}`;
        const isActive = item.href ? pathname.startsWith(fullHref) : pathname === fullHref;

        return (
          <Link
            key={item.name}
            href={fullHref}
            aria-current={isActive ? "page" : undefined}
            className={cn(
              "text-sm transition-colors",
              isActive
                ? "bg-[var(--ledger-paper-deep)] text-[var(--ledger-ink)] shadow-lg shadow-black/20 ring-1 ring-[var(--ledger-focus)]"
                : "text-[var(--ledger-ink-soft)] hover:text-[var(--ledger-ink)] hover:bg-[var(--ledger-paper-deep)]"
            )}
          >
            <item.icon className={cn("w-5 h-5", isActive ? "text-[var(--ledger-accent)]" : "text-[var(--ledger-ink-soft)]")} />
            {item.name}
          </Link>
        );
      })}
    </nav>
  );
}
