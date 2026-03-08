import Link from "next/link";
import { User, Shield, Sword, Users, Ghost, LayoutDashboard } from "lucide-react";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex h-screen bg-neutral-950 text-neutral-100 font-sans">
      {/* Sidebar */}
      <aside className="w-64 bg-neutral-900 border-r border-neutral-800 flex flex-col">
        <div className="p-6 border-b border-neutral-800">
          <h2 className="text-xl font-bold flex items-center gap-2 text-indigo-400">
            <LayoutDashboard className="w-5 h-5" />
            Vaesen Admin
          </h2>
        </div>
        <nav className="flex-1 p-4 space-y-2">
          <NavLink href="/admin/archetypes" icon={<User className="w-4 h-4" />} label="Archetypes" />
          <NavLink href="/admin/items" icon={<Sword className="w-4 h-4" />} label="Items" />
          <NavLink href="/admin/talents" icon={<Shield className="w-4 h-4" />} label="Talents" />
          <NavLink href="/admin/npcs" icon={<Users className="w-4 h-4" />} label="NPCs" />
          <NavLink href="/admin/vaesen" icon={<Ghost className="w-4 h-4" />} label="Vaesen" />
        </nav>
        <div className="p-4 border-t border-neutral-800">
          <Link href="/" className="text-sm text-neutral-400 hover:text-white transition-colors">
            &larr; Back to Main Site
          </Link>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-auto bg-neutral-950">
        <div className="p-8 max-w-6xl mx-auto">
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
      className="flex items-center gap-3 px-3 py-2 rounded-md text-neutral-300 hover:bg-neutral-800 hover:text-white transition-all group"
    >
      <span className="text-neutral-500 group-hover:text-indigo-400 transition-colors">
        {icon}
      </span>
      {label}
    </Link>
  );
}
