import prisma from "@/lib/prisma";
import { redirect } from "next/navigation";
import NoteEditor from "./note-editor";
import { getPartyAccess } from "@/lib/access";
import { sanitizeNotes } from "@/lib/notes";

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
        <h1 className="text-3xl font-bold text-[var(--ledger-ink)]">Session Notes</h1>
        <p className="text-[var(--ledger-ink-soft)] mt-2">
          {access.isGM ? "Campaign notes for planning, aftermath, and shared recollection." : "Read the shared chronicle maintained by the party's GM."}
        </p>
      </div>

      <div className="flex-1 bg-[var(--ledger-surface-strong)] border border-[var(--ledger-line)]/55 rounded-2xl p-8 shadow-2xl overflow-hidden min-h-[600px]">
        <NoteEditor partyId={id} initialContent={sanitizeNotes(party.notes || "")} isGM={access.isGM} />
      </div>
    </div>
  );
}
