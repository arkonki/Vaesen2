import Link from "next/link";
import PageMasthead from "@/components/page-masthead";
import prisma from "@/lib/prisma";
import { getRequiredSession } from "@/lib/access";

export default async function CharactersPage() {
  const session = await getRequiredSession();

  const characters = await prisma.character.findMany({
    where: { userId: session.user.id },
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

        {characters.length > 0 ? (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            {characters.map((character) => (
              <Link key={character.id} href={`/characters/${character.id}`} className="rounded-sm border border-[var(--ledger-line)]/55 bg-[var(--ledger-paper)] p-5 transition-colors hover:border-[var(--ledger-accent)]/65">
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
            ))}
          </div>
        ) : (
          <div className="rounded-sm border border-dashed border-[var(--ledger-line)]/55 bg-[var(--ledger-paper)] p-6 text-sm text-[var(--ledger-ink-soft)]">
            You have not created any characters yet.
          </div>
        )}
      </div>
    </main>
  );
}
