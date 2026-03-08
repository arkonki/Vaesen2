import prisma from "@/lib/prisma";
import { redirect } from "next/navigation";
import NoteEditor from "./note-editor";
import { getPartyAccess } from "@/lib/access";

export default async function NotesPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const access = await getPartyAccess(id);

  const party = await prisma.party.findUnique({
    where: { id: id },
    select: {
      id: true,
      notes: true,
      gmId: true,
    }
  });

  if (!party) redirect("/parties");

  return (
    <div className="space-y-8 h-full flex flex-col">
      <div>
        <h1 className="text-3xl font-bold text-white">Session Notes</h1>
        <p className="text-neutral-400 mt-2">
          {access.isGM ? "Campaign notes for planning, aftermath, and shared recollection." : "Read the shared chronicle maintained by the party's GM."}
        </p>
      </div>

      <div className="flex-1 bg-neutral-900 border border-neutral-800 rounded-2xl p-8 shadow-2xl overflow-hidden min-h-[600px]">
        <NoteEditor partyId={id} initialContent={party.notes || ""} isGM={access.isGM} />
      </div>
    </div>
  );
}
