import prisma from "@/lib/prisma";
import { redirect } from "next/navigation";
import MemberList from "./member-list";
import { getPartyAccess } from "@/lib/access";
import { partyCharacterSelect } from "@/lib/security";

export default async function ManagementPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const access = await getPartyAccess(id);

  const party = await prisma.party.findUnique({
    where: { id: id },
    include: {
      members: {
        where: { character: { archivedAt: null } },
        include: {
          character: {
            select: partyCharacterSelect,
          },
        },
      },
    },
  });

  if (!party) redirect("/parties");

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-[var(--ledger-ink)]">Party Management</h1>
        <p className="text-[var(--ledger-ink-soft)] mt-2">
          {access.isGM ? "Manage members and recruits for the current party." : "Review the investigators currently attached to this party."}
        </p>
      </div>

      <MemberList party={party} isGM={access.isGM} />
    </div>
  );
}
