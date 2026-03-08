import prisma from "@/lib/prisma";
import { getPartyAccess } from "@/lib/access";
import StashManager from "./stash-manager";

export default async function EquipmentPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const access = await getPartyAccess(id);

  const [stashItems, items] = await Promise.all([
    prisma.partyStashItem.findMany({
      where: { partyId: id },
      include: { item: true },
      orderBy: [{ item: { type: "asc" } }, { item: { name: "asc" } }],
    }),
    prisma.item.findMany({
      orderBy: [{ type: "asc" }, { name: "asc" }],
    }),
  ]);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-white">Equipment</h1>
        <p className="mt-2 text-neutral-400">
          Shared party stash and communal assets. Character-bound gear remains on each investigator's sheet.
        </p>
      </div>

      <StashManager partyId={id} items={items} stashItems={stashItems} canEdit={access.isGM} />
    </div>
  );
}
