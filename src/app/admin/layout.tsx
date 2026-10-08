import Link from "next/link";
import { LayoutDashboard } from "lucide-react";
import AdminNav from "./admin-nav";
import { requireAdminSession } from "@/lib/access";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireAdminSession();

  return (
    <div className="flex flex-col lg:flex-row min-h-screen bg-[var(--ledger-paper)] text-[var(--ledger-ink)] font-sans">
      <aside className="w-full lg:w-56 lg:shrink-0 bg-[var(--ledger-surface-strong)] border-r border-[var(--ledger-line)]/55 flex flex-col">
        <div className="p-6 border-b border-[var(--ledger-line)]/55">
          <h2 className="text-xl font-bold flex items-center gap-2 text-[var(--ledger-accent)]">
            <LayoutDashboard className="w-5 h-5" />
            Vaesen Admin
          </h2>
        </div>
        <AdminNav />
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
