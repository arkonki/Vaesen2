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
  { name: "Management", href: "/management", icon: Users },
  { name: "Mysteries", href: "/mysteries", icon: Search },
  { name: "Goals", href: "/goals", icon: ListTodo },
  { name: "Equipment", href: "/equipment", icon: Package },
  { name: "Headquarters", href: "/hq", icon: Castle },
  { name: "Notes", href: "/notes", icon: StickyNote },
  { name: "Atlas", href: "/atlas", icon: ScrollText },
];

export default function SidebarNav({ partyId }: { partyId: string }) {
  const pathname = usePathname();

  return (
    <nav className="flex flex-wrap lg:block gap-2 lg:space-y-1">
      {navigations.map((item) => {
        const fullHref = `/parties/${partyId}${item.href}`;
        const isActive = pathname.startsWith(fullHref);

        return (
          <Link
            key={item.name}
            href={fullHref}
            className={cn(
              "flex items-center gap-3 px-4 py-3 text-sm font-medium rounded-lg transition-all duration-200",
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
