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
            <p className="text-xs uppercase tracking-[0.3em] text-amber-200/80">Character Ledger</p>
            <h1 className="mt-2 text-4xl font-black tracking-tight text-white">Your Hunters</h1>
            <p className="mt-2 text-sm text-neutral-400">
              Open sheets, review party assignments, and start new investigators.
            </p>
          </div>

          <Link href="/characters/create" className="rounded-full border border-amber-300/30 bg-amber-500/10 px-5 py-3 text-sm font-semibold text-amber-100 transition-colors hover:bg-amber-500/20">
            Create Character
          </Link>
        </div>

        {characters.length > 0 ? (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            {characters.map((character) => (
              <Link key={character.id} href={`/characters/${character.id}`} className="rounded-2xl border border-white/10 bg-neutral-950/60 p-5 transition-colors hover:border-amber-400/30">
                <p className="text-xs uppercase tracking-[0.25em] text-neutral-500">{character.archetype.name}</p>
                <h2 className="mt-2 text-2xl font-bold text-white">{character.name}</h2>
                <p className="mt-2 text-sm text-neutral-400">
                  {character.ageGroup.replaceAll("_", " ")} · XP {character.experiencePoints}
                </p>
                <div className="mt-4 flex flex-wrap gap-2 text-xs text-neutral-500">
                  {character.parties.length > 0 ? (
                    character.parties.map((membership) => (
                      <span key={membership.id} className="rounded-full border border-white/10 px-2 py-1">
                        {membership.party.name}
                      </span>
                    ))
                  ) : (
                    <span className="rounded-full border border-white/10 px-2 py-1">No party</span>
                  )}
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="rounded-2xl border border-dashed border-white/10 bg-neutral-950/40 p-6 text-sm text-neutral-400">
            You have not created any characters yet.
          </div>
        )}
      </div>
    </main>
  );
}
