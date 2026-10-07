import prisma from "@/lib/prisma";
import { redirect } from "next/navigation";
import MapViewer from "./map-viewer";
import { getPartyAccess } from "@/lib/access";

export default async function AtlasPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const access = await getPartyAccess(id);

  const party = await prisma.party.findUnique({
    where: { id: id },
    include: {
      maps: true,
      gm: true,
    },
  });

  if (!party) redirect("/parties");

  return (
    <div className="space-y-8 h-full flex flex-col">
      <div>
        <h1 className="text-3xl font-bold text-[var(--ledger-ink)]">Atlas</h1>
        <p className="text-[var(--ledger-ink-soft)] mt-2">Explore the Mythic North and mark your path.</p>
      </div>

      <MapViewer partyId={id} initialMaps={party.maps} isGM={access.isGM} />
    </div>
  );
}
