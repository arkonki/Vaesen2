import Link from "next/link";
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
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-[var(--ledger-accent)]">Character Ledger</p>
            <h1 className="mt-2 text-4xl font-black tracking-tight text-[var(--ledger-ink)]">Your Hunters</h1>
            <p className="mt-2 text-sm text-[var(--ledger-ink-soft)]">
              Open sheets, review party assignments, and start new investigators.
            </p>
          </div>

          <Link href="/characters/create" className="rounded-full border border-[var(--ledger-accent)]/65 bg-[rgba(127,48,40,0.12)] px-5 py-3 text-sm font-semibold text-[var(--ledger-accent)] transition-colors hover:bg-[rgba(127,48,40,0.12)]">
            Create Character
          </Link>
        </div>

        {characters.length > 0 ? (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            {characters.map((character) => (
              <Link key={character.id} href={`/characters/${character.id}`} className="rounded-2xl border border-[var(--ledger-line)]/55 bg-[var(--ledger-paper)] p-5 transition-colors hover:border-[var(--ledger-accent)]/65">
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
          <div className="rounded-2xl border border-dashed border-[var(--ledger-line)]/55 bg-[var(--ledger-paper)] p-6 text-sm text-[var(--ledger-ink-soft)]">
            You have not created any characters yet.
          </div>
        )}
      </div>
    </main>
  );
}
