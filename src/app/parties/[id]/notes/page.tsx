import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { redirect } from "next/navigation";
import NoteEditor from "./note-editor";

export default async function NotesPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = { user: { id: "test-user-id", name: "Test Master", role: "GM" } };
  // const session = await getServerSession(authOptions);
  // if (!session) redirect("/api/auth/signin");

  const party = await prisma.party.findUnique({
    where: { id: id },
    select: {
      id: true,
      notes: true,
      gmId: true,
    }
  });

  if (!party) redirect("/parties");

  const isGM = party.gmId === session.user.id;

  return (
    <div className="space-y-8 h-full flex flex-col">
      <div>
        <h1 className="text-3xl font-bold text-white">Session Notes</h1>
        <p className="text-neutral-400 mt-2">Collaborative chronicles of your journey.</p>
      </div>

      <div className="flex-1 bg-neutral-900 border border-neutral-800 rounded-2xl p-8 shadow-2xl overflow-hidden min-h-[600px]">
        <NoteEditor partyId={id} initialContent={party.notes || ""} isGM={isGM} />
      </div>
    </div>
  );
}
