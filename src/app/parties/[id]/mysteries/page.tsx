import prisma from "@/lib/prisma";
import { getPartyAccess } from "@/lib/access";
import MysteryBoard from "./mystery-board";

export default async function MysteriesPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const access = await getPartyAccess(id);

  const mysteries = await prisma.mystery.findMany({
    where: { partyId: id },
    include: {
      clues: {
        orderBy: { createdAt: "asc" },
      },
      entities: {
        orderBy: { createdAt: "asc" },
      },
      locations: {
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
        <h1 className="text-3xl font-bold text-white">Mysteries</h1>
        <p className="mt-2 text-neutral-400">
          Structured investigation log for hooks, clues, entities, locations, and aftermath.
        </p>
      </div>

      <MysteryBoard partyId={id} mysteries={mysteries} canEdit={access.isGM} />
    </div>
  );
}
