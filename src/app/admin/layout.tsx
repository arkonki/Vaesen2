import Link from "next/link";
import { User, Shield, Sword, Users, Ghost, LayoutDashboard } from "lucide-react";
import { requireAdminSession } from "@/lib/access";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireAdminSession();

  return (
    <div className="flex flex-col lg:flex-row min-h-screen bg-[var(--ledger-paper)] text-[var(--ledger-ink)] font-sans">
      <aside className="w-full lg:w-64 lg:shrink-0 bg-[var(--ledger-surface-strong)] border-r border-[var(--ledger-line)]/55 flex flex-col">
        <div className="p-6 border-b border-[var(--ledger-line)]/55">
          <h2 className="text-xl font-bold flex items-center gap-2 text-[var(--ledger-accent)]">
            <LayoutDashboard className="w-5 h-5" />
            Vaesen Admin
          </h2>
        </div>
        <nav className="flex flex-wrap lg:block flex-1 p-4 gap-2 lg:space-y-2">
          <NavLink href="/admin/archetypes" icon={<User className="w-4 h-4" />} label="Archetypes" />
          <NavLink href="/admin/items" icon={<Sword className="w-4 h-4" />} label="Items" />
          <NavLink href="/admin/talents" icon={<Shield className="w-4 h-4" />} label="Talents" />
          <NavLink href="/admin/npcs" icon={<Users className="w-4 h-4" />} label="NPCs" />
          <NavLink href="/admin/vaesen" icon={<Ghost className="w-4 h-4" />} label="Vaesen" />
          <NavLink href="/admin/users" icon={<Users className="w-4 h-4" />} label="Users" />
        </nav>
        <div className="p-4 border-t border-[var(--ledger-line)]/55">
          <Link href="/" className="text-sm text-[var(--ledger-ink-soft)] hover:text-[var(--ledger-ink)] transition-colors">
            &larr; Back to Main Site
          </Link>
        </div>
      </aside>

      <main className="min-w-0 flex-1 overflow-auto bg-[var(--ledger-paper)]">
        <div className="p-4 sm:p-8 max-w-6xl mx-auto">
          {children}
        </div>
      </main>
    </div>
  );
}

function NavLink({ href, icon, label }: { href: string; icon: React.ReactNode; label: string }) {
  return (
    <Link
      href={href}
      className="flex items-center gap-3 px-3 py-2 rounded-md text-[var(--ledger-ink)] hover:bg-[var(--ledger-paper-deep)] hover:text-[var(--ledger-ink)] transition-all group"
    >
      <span className="text-[var(--ledger-ink-soft)] group-hover:text-[var(--ledger-accent)] transition-colors">
        {icon}
      </span>
      {label}
    </Link>
  );
}
