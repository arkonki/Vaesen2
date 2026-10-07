import prisma from "@/lib/prisma";
import { redirect } from "next/navigation";
import HQDashboard from "./hq-dashboard";
import { getPartyAccess } from "@/lib/access";

export default async function HQPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const access = await getPartyAccess(id);

  const party = await prisma.party.findUnique({
    where: { id: id },
    include: {
      headquarters: { include: { ledgerEntries: { orderBy: { createdAt: "desc" }, take: 30 } } },
    },
  });

  if (!party || !party.headquarters) redirect(`/parties/${id}/management`);

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-bold text-[var(--ledger-ink)]">Headquarters</h1>
          <p className="text-[var(--ledger-ink-soft)] mt-2">{party.headquarters.name}</p>
        </div>
        <div className="bg-[rgba(127,48,40,0.12)] border border-[var(--ledger-accent)]/65 rounded-lg px-4 py-2 flex items-center gap-3">
          <span className="text-[var(--ledger-accent)] font-bold text-xl">{party.headquarters.developmentPoints}</span>
          <span className="text-xs text-[var(--ledger-accent)] uppercase tracking-widest font-semibold leading-none">
            Development<br/>Points
          </span>
        </div>
      </div>

      <HQDashboard hq={{ ...party.headquarters, threats: access.isGM ? party.headquarters.threats : [] }} isGM={access.isGM} />
    </div>
  );
}
