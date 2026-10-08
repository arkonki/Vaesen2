import Link from "next/link";
import SidebarNav from "./sidebar-nav";
import { getPartyAccess } from "@/lib/access";

export default async function PartyLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { party, isGM, isAdmin } = await getPartyAccess(id);

  return (
    <div className="flex flex-col lg:flex-row min-h-screen bg-[var(--ledger-paper)] text-[var(--ledger-ink)]">
      <aside className="w-full lg:w-56 lg:shrink-0 border-b lg:border-b-0 lg:border-r border-[var(--ledger-line)]/55 bg-[var(--ledger-surface-strong)] lg:sticky lg:top-28 lg:h-[calc(100vh-7rem)] py-4 px-4">
        <div className="mb-3">
          <Link href="/parties" className="text-[var(--ledger-ink-soft)] hover:text-[var(--ledger-ink)] text-sm flex items-center gap-2 mb-4">
            ← Back to Parties
          </Link>
          <h2 className="text-xl font-bold text-[var(--ledger-ink)] break-words">{party.name}</h2>
          <p className="text-xs text-[var(--ledger-ink-soft)] mt-1 uppercase tracking-widest font-semibold">
            {isAdmin ? "Administrator View" : isGM ? "Game Master View" : "Player View"}
          </p>
        </div>

        <SidebarNav partyId={id} />
      </aside>

      <main className="min-w-0 flex-1 overflow-y-auto">
        <div className="max-w-6xl mx-auto py-6 px-4 sm:py-10 sm:px-8">
          {children}
        </div>
      </main>
    </div>
  );
}
