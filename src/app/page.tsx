import Link from "next/link";
import prisma from "@/lib/prisma";
import { getRequiredSession } from "@/lib/access";

export default async function HomePage() {
  const session = await getRequiredSession();
  const isAdmin = session.user.role === "ADMIN";
  const isGM = session.user.role === "GM" || isAdmin;

  const [characters, memberParties, gmParties, recentMysteries] = await Promise.all([
    prisma.character.findMany({
      where: { userId: session.user.id },
      include: { archetype: true },
      orderBy: { name: "asc" },
    }),
    prisma.party.findMany({
      where: {
        members: {
          some: {
            character: {
              userId: session.user.id,
            },
          },
        },
      },
      include: {
        headquarters: true,
      },
      orderBy: { name: "asc" },
    }),
    isGM ? prisma.party.findMany({
      where: {
        gmId: session.user.id,
      },
      include: {
        headquarters: true,
      },
      orderBy: { name: "asc" },
    }) : Promise.resolve([]),
    prisma.mystery.findMany({
      where: {
        party: {
          OR: [
            { gmId: session.user.id },
            {
              members: {
                some: {
                  character: {
                    userId: session.user.id,
                  },
                },
              },
            },
          ],
        },
      },
      include: {
        party: true,
      },
      orderBy: [
        { updatedAt: "desc" },
        { createdAt: "desc" },
      ],
      take: 6,
    }),
  ]);

  return (
    <main className="px-4 py-10 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl space-y-8">
        <section className="rounded-[2rem] border border-white/10 bg-[linear-gradient(135deg,rgba(172,120,60,0.22),rgba(17,17,20,0.82))] p-8 shadow-2xl">
          <div className="flex flex-wrap items-end justify-between gap-6">
            <div className="max-w-2xl">
              <p className="text-xs uppercase tracking-[0.35em] text-amber-200/80">Home Hub</p>
              <h1 className="mt-3 text-4xl font-black tracking-tight text-white">
                Welcome back, {session.user.name || "Society Member"}
              </h1>
              <p className="mt-4 text-base leading-relaxed text-neutral-200/80">
                Track your hunters, keep your parties together, and preserve the clues that stand between Upsala and the dark.
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <Link href="/characters/create" className="rounded-full border border-amber-300/30 bg-amber-500/10 px-5 py-3 text-sm font-semibold text-amber-100 transition-colors hover:bg-amber-500/20">
                New Character
              </Link>
              <Link href="/compendium" className="rounded-full border border-white/10 bg-white/5 px-5 py-3 text-sm font-semibold text-white transition-colors hover:border-white/20">
                Open Compendium
              </Link>
              {isGM ? (
                <Link href="/parties" className="rounded-full border border-white/10 bg-white/5 px-5 py-3 text-sm font-semibold text-white transition-colors hover:border-white/20">
                  Manage Parties
                </Link>
              ) : null}
            </div>
          </div>
        </section>

        <div className="grid grid-cols-1 gap-8 xl:grid-cols-[1.15fr_0.85fr]">
          <section className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold text-white">Your Characters</h2>
              <Link href="/characters" className="text-sm text-amber-200 hover:text-amber-100">
                View all
              </Link>
            </div>

            {characters.length > 0 ? (
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                {characters.map((character) => (
                  <Link key={character.id} href={`/characters/${character.id}`} className="rounded-2xl border border-white/10 bg-neutral-950/60 p-5 transition-colors hover:border-amber-400/30">
                    <p className="text-xs uppercase tracking-[0.25em] text-neutral-500">{character.archetype.name}</p>
                    <h3 className="mt-2 text-2xl font-bold text-white">{character.name}</h3>
                    <p className="mt-2 text-sm text-neutral-400">{character.ageGroup.replaceAll("_", " ")}</p>
                    <p className="mt-4 text-xs text-neutral-500">
                      XP {character.experiencePoints} · Resources {character.resources}
                    </p>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="rounded-2xl border border-dashed border-white/10 bg-neutral-950/40 p-6 text-sm text-neutral-400">
                No characters yet. Start your first hunter from the character wizard.
              </div>
            )}
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-bold text-white">Party Activity</h2>
            <div className="space-y-4">
              {(isGM ? gmParties : memberParties).map((party) => (
                <Link key={party.id} href={`/parties/${party.id}`} className="block rounded-2xl border border-white/10 bg-neutral-950/60 p-5 transition-colors hover:border-amber-400/30">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <h3 className="text-lg font-bold text-white">{party.name}</h3>
                      <p className="text-sm text-neutral-400">
                        {isGM ? "You are the GM" : "Party member"} · {party.headquarters?.developmentPoints ?? 0} DP
                      </p>
                    </div>
                  </div>
                </Link>
              ))}
              {(isGM ? gmParties : memberParties).length === 0 ? (
                <div className="rounded-2xl border border-dashed border-white/10 bg-neutral-950/40 p-6 text-sm text-neutral-400">
                  {isGM ? "No parties created yet." : "You are not in any parties yet."}
                </div>
              ) : null}
            </div>
          </section>
        </div>

        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold text-white">Recent Mysteries</h2>
            <Link href="/parties" className="text-sm text-amber-200 hover:text-amber-100">
              Open parties
            </Link>
          </div>

          {recentMysteries.length > 0 ? (
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
              {recentMysteries.map((mystery) => (
                <Link key={mystery.id} href={`/parties/${mystery.partyId}/mysteries`} className="rounded-2xl border border-white/10 bg-neutral-950/60 p-5 transition-colors hover:border-amber-400/30">
                  <p className="text-xs uppercase tracking-[0.25em] text-neutral-500">{mystery.party.name}</p>
                  <h3 className="mt-2 text-lg font-bold text-white">{mystery.title}</h3>
                  <p className="mt-2 line-clamp-3 text-sm text-neutral-400">{mystery.summary}</p>
                  <p className="mt-4 text-xs text-amber-200">{mystery.status}</p>
                </Link>
              ))}
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-white/10 bg-neutral-950/40 p-6 text-sm text-neutral-400">
              No mysteries logged yet.
            </div>
          )}
        </section>

        {isAdmin ? (
          <section className="rounded-2xl border border-white/10 bg-neutral-950/60 p-6">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h2 className="text-2xl font-bold text-white">Admin Shortcuts</h2>
                <p className="mt-1 text-sm text-neutral-400">Manage game content and society accounts.</p>
              </div>
              <div className="flex flex-wrap gap-3">
                <Link href="/admin/users" className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-white">
                  Users
                </Link>
                <Link href="/admin/items" className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-white">
                  Items
                </Link>
                <Link href="/admin/vaesen" className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-white">
                  Vaesen
                </Link>
              </div>
            </div>
          </section>
        ) : null}
      </div>
    </main>
  );
}
