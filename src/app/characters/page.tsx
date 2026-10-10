import Link from "next/link";
import PageMasthead from "@/components/page-masthead";
import prisma from "@/lib/prisma";
import { getRequiredSession } from "@/lib/access";
import CharacterArchiveControl from "@/components/character-archive-control";

export default async function CharactersPage({ searchParams }: { searchParams: Promise<{ view?: string; scope?: string }> }) {
  const session = await getRequiredSession();
  const query = await searchParams;
  const archived = query.view === "archived";
  const allArchived = archived && query.scope === "all" && session.user.role === "ADMIN";
  const [activeCount, archivedCount] = await Promise.all([
    prisma.character.count({ where: { userId: session.user.id, archivedAt: null } }),
    prisma.character.count({ where: { userId: session.user.id, archivedAt: { not: null } } }),
  ]);

  const characters = await prisma.character.findMany({
    where: { ...(!allArchived ? { userId: session.user.id } : {}), archivedAt: archived ? { not: null } : null },
    include: {
      archetype: true,
      parties: {
        include: {
          party: true,
        },
      },
    },
    orderBy: { name: "asc" },
  });

  return (
    <main className="px-4 py-10 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <PageMasthead title="Your Hunters" eyebrow="Character Ledger" description="The people who see beyond the ordinary. Open a sheet to roll, track conditions, and record what you uncover."><Link className="ledger-button ledger-button-primary" href="/characters/create">New Character</Link></PageMasthead>
        <nav aria-label="Character status" className="flex flex-wrap gap-3"><Link href="/characters" className="ledger-button" aria-current={!archived ? "page" : undefined}>Active ({activeCount})</Link><Link href="/characters?view=archived" className="ledger-button" aria-current={archived && !allArchived ? "page" : undefined}>Archived ({archivedCount})</Link>{session.user.role === "ADMIN" && <Link href="/characters?view=archived&scope=all" className="ledger-button" aria-current={allArchived ? "page" : undefined}>All Archived (Admin)</Link>}</nav>
        <p className="ledger-status">{archived ? "Archived characters are read-only and excluded from active party rosters. Restore them without losing their saved sheet or equipment." : "Remove archives a character, never permanently deletes it. Saved party links and campaign history are preserved."}</p>

        {characters.length > 0 ? (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            {characters.map((character) => (
              <article key={character.id} className="rounded-sm border border-[var(--ledger-line)]/55 bg-[var(--ledger-paper)] p-5">
                <Link href={`/characters/${character.id}`} className="block hover:text-[var(--ledger-accent)]">
                <p className="text-xs uppercase tracking-[0.25em] text-[var(--ledger-ink-soft)]">{character.archetype.name}</p>
                <h2 className="mt-2 text-2xl font-bold text-[var(--ledger-ink)]">{character.name}</h2>
                <p className="mt-2 text-sm text-[var(--ledger-ink-soft)]">
                  {character.ageGroup.replaceAll("_", " ")} · XP {character.experiencePoints}
                </p>
                <div className="mt-4 flex flex-wrap gap-2 text-xs text-[var(--ledger-ink-soft)]">
                  {character.parties.length > 0 ? (
                    character.parties.map((membership) => (
                      <span key={membership.id} className="rounded-full border border-[var(--ledger-line)]/55 px-2 py-1">
                        {membership.party.name}
                      </span>
                    ))
                  ) : (
                    <span className="rounded-full border border-[var(--ledger-line)]/55 px-2 py-1">No party</span>
                  )}
                </div>
                </Link>
                <div className="mt-4"><CharacterArchiveControl id={character.id} name={character.name} version={character.archiveVersion} archived={Boolean(character.archivedAt)} partyCount={character.parties.length} /></div>
              </article>
            ))}
          </div>
        ) : (
          <div className="rounded-sm border border-dashed border-[var(--ledger-line)]/55 bg-[var(--ledger-paper)] p-6 text-sm text-[var(--ledger-ink-soft)]">
            {archived ? "No archived characters found." : "You have not created any active characters yet."}
          </div>
        )}
      </div>
    </main>
  );
}
