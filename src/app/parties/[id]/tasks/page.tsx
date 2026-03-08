import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { redirect } from "next/navigation";
import TaskBoard from "./task-board";

export default async function TasksPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = { user: { id: "test-user-id", name: "Test Master", role: "GM" } };
  // const session = await getServerSession(authOptions);
  // if (!session) redirect("/api/auth/signin");

  const party = await prisma.party.findUnique({
    where: { id: id },
    include: {
      tasks: {
        orderBy: { createdAt: "desc" },
      },
      gm: true,
    },
  });

  if (!party) redirect("/parties");

  const isGM = party.gmId === session.user.id;

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-bold text-white">Adventure Tasks</h1>
          <p className="text-neutral-400 mt-2">Track mysteries, clues, and objectives.</p>
        </div>
      </div>

      <TaskBoard partyId={id} initialTasks={party.tasks} isGM={isGM} />
    </div>
  );
}
