import prisma from "@/lib/prisma";
import { getPartyAccess } from "@/lib/access";
import TaskBoard from "../tasks/task-board";

export default async function GoalsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const access = await getPartyAccess(id);

  const party = await prisma.party.findUnique({
    where: { id },
    include: {
      tasks: {
        orderBy: { createdAt: "desc" },
      },
    },
  });

  if (!party) {
    return null;
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-[var(--ledger-ink)]">Goals</h1>
        <p className="mt-2 text-[var(--ledger-ink-soft)]">Track active objectives, unresolved leads, and campaign follow-up work.</p>
      </div>

      <TaskBoard partyId={id} initialTasks={party.tasks} isGM={access.isGM} />
    </div>
  );
}
