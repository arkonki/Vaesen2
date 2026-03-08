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
    <div className="flex min-h-screen bg-neutral-950 text-neutral-100">
      <aside className="w-64 border-r border-neutral-800 bg-neutral-900/50 backdrop-blur-sm sticky top-0 h-screen py-8 px-4">
        <div className="mb-8">
          <Link href="/parties" className="text-neutral-500 hover:text-white text-sm flex items-center gap-2 mb-4">
            ← Back to Parties
          </Link>
          <h2 className="text-xl font-bold text-white truncate">{party.name}</h2>
          <p className="text-xs text-neutral-500 mt-1 uppercase tracking-widest font-semibold">
            {isAdmin ? "Administrator View" : isGM ? "Game Master View" : "Player View"}
          </p>
        </div>

        <SidebarNav partyId={id} />
      </aside>

      <main className="flex-1 overflow-y-auto">
        <div className="max-w-6xl mx-auto py-12 px-8">
          {children}
        </div>
      </main>
    </div>
  );
}
