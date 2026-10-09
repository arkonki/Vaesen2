import { CARRIED_TYPES } from "@/lib/equipment";
import prisma from "@/lib/prisma";
import { getPartyAccess } from "@/lib/access";
import StashManager from "./stash-manager";
import StorageReview from './storage-review';
import { storageCapacity } from '@/lib/hq-rules';

export default async function EquipmentPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const access = await getPartyAccess(id);
  const castle = await prisma.headquarters.findUnique({ where: { partyId: id }, include: { castleUpgrades: true } });

  const [stashItems, items] = await Promise.all([
    prisma.partyStashItem.findMany({
      where: { partyId: id },
      include: { item: true },
      orderBy: [{ item: { type: "asc" } }, { item: { name: "asc" } }],
    }),
    prisma.item.findMany({
      where: { type: { in: [...CARRIED_TYPES] } },
      orderBy: [{ type: "asc" }, { name: "asc" }],
    }),
  ]);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-[var(--ledger-ink)]">Equipment</h1>
        <p className="mt-2 text-[var(--ledger-ink-soft)]">
          Shared party stash and communal assets. Character-bound gear remains on each investigator&apos;s sheet.
        </p>
      </div>

      <StashManager partyId={id} items={items} stashItems={stashItems} canEdit={access.isGM} />
      {castle && <StorageReview key={JSON.stringify(stashItems.map((s) => [s.id,s.quantity,s.retainedQuantity]))} hqId={castle.id} rows={stashItems.map((s) => ({ id: s.id, name: s.item.name, type: s.item.type, quantity: s.quantity, retainedQuantity: s.retainedQuantity }))} capacity={storageCapacity(castle.castleUpgrades)} canEdit={access.isGM} />}
    </div>
  );
}
