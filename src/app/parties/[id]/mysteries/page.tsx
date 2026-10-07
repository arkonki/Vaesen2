import prisma from "@/lib/prisma";
import { getPartyAccess } from "@/lib/access";
import MysteryBoard from "./mystery-board";

export default async function MysteriesPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const access = await getPartyAccess(id);

  const mysteries = await prisma.mystery.findMany({
    where: { partyId: id, ...(!access.isGM ? { isPublished: true, status: { not: "PREP" as const } } : {}) },
    include: {
      clues: {
        where: access.isGM ? {} : { isRevealed: true },
        orderBy: { createdAt: "asc" },
      },
      entities: {
        where: access.isGM ? {} : { isRevealed: true },
        orderBy: { createdAt: "asc" },
      },
      locations: {
        where: access.isGM ? {} : { isRevealed: true },
        orderBy: { createdAt: "asc" },
      },
    },
    orderBy: [
      { status: "asc" },
      { updatedAt: "desc" },
    ],
  });

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-[var(--ledger-ink)]">Mysteries</h1>
        <p className="mt-2 text-[var(--ledger-ink-soft)]">
          Structured investigation log for hooks, clues, entities, locations, and aftermath.
        </p>
      </div>

      <MysteryBoard partyId={id} mysteries={mysteries} canEdit={access.isGM} />
    </div>
  );
}
