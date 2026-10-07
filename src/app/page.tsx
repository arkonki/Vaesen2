import Link from "next/link";
import prisma from "@/lib/prisma";
import { getRequiredSession } from "@/lib/access";
import PartyInvitations from "./party-invitations";

export default async function HomePage() {
  const session = await getRequiredSession();
  const isAdmin = session.user.role === "ADMIN";
  const isGM = session.user.role === "GM" || isAdmin;
  const invitations = await prisma.characterInvitation.findMany({
    where: { character: { userId: session.user.id } },
    select: { id: true, party: { select: { name: true } }, character: { select: { name: true } } },
  });

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
        ...(!isAdmin ? { OR: [
          ...(session.user.role === "GM" ? [{ party: { gmId: session.user.id } }] : []),
          { isPublished: true, status: { not: "PREP" as const } },
        ] } : {}),
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
        <PartyInvitations invitations={invitations} />
        <section className="rounded-[2rem] border border-[var(--ledger-line)]/55 bg-[linear-gradient(135deg,rgba(127,48,40,0.08),rgba(255,252,246,0.9))] p-8 shadow-2xl">
          <div className="flex flex-wrap items-end justify-between gap-6">
            <div className="max-w-2xl">
              <p className="text-xs uppercase tracking-[0.35em] text-[var(--ledger-accent)]">Home Hub</p>
              <h1 className="mt-3 text-4xl font-black tracking-tight text-[var(--ledger-ink)]">
                Welcome back, {session.user.name || "Society Member"}
              </h1>
              <p className="mt-4 text-base leading-relaxed text-[var(--ledger-ink)]">
                Track your hunters, keep your parties together, and preserve the clues that stand between Upsala and the dark.
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <Link href="/characters/create" className="rounded-full border border-[var(--ledger-accent)]/65 bg-[rgba(127,48,40,0.12)] px-5 py-3 text-sm font-semibold text-[var(--ledger-accent)] transition-colors hover:bg-[rgba(127,48,40,0.12)]">
                New Character
              </Link>
              <Link href="/compendium" className="rounded-full border border-[var(--ledger-line)]/55 bg-[var(--ledger-surface)] px-5 py-3 text-sm font-semibold text-[var(--ledger-ink)] transition-colors hover:border-[var(--ledger-line)]/55">
                Open Compendium
              </Link>
              {isGM ? (
                <Link href="/parties" className="rounded-full border border-[var(--ledger-line)]/55 bg-[var(--ledger-surface)] px-5 py-3 text-sm font-semibold text-[var(--ledger-ink)] transition-colors hover:border-[var(--ledger-line)]/55">
                  Manage Parties
                </Link>
              ) : null}
            </div>
          </div>
        </section>

        <div className="grid grid-cols-1 gap-8 xl:grid-cols-[1.15fr_0.85fr]">
          <section className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold text-[var(--ledger-ink)]">Your Characters</h2>
              <Link href="/characters" className="text-sm text-[var(--ledger-accent)] hover:text-[var(--ledger-accent)]">
                View all
              </Link>
            </div>

            {characters.length > 0 ? (
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                {characters.map((character) => (
                  <Link key={character.id} href={`/characters/${character.id}`} className="rounded-2xl border border-[var(--ledger-line)]/55 bg-[var(--ledger-paper)] p-5 transition-colors hover:border-[var(--ledger-accent)]/65">
                    <p className="text-xs uppercase tracking-[0.25em] text-[var(--ledger-ink-soft)]">{character.archetype.name}</p>
                    <h3 className="mt-2 text-2xl font-bold text-[var(--ledger-ink)]">{character.name}</h3>
                    <p className="mt-2 text-sm text-[var(--ledger-ink-soft)]">{character.ageGroup.replaceAll("_", " ")}</p>
                    <p className="mt-4 text-xs text-[var(--ledger-ink-soft)]">
                      XP {character.experiencePoints} · Resources {character.resources}
                    </p>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="rounded-2xl border border-dashed border-[var(--ledger-line)]/55 bg-[var(--ledger-paper)] p-6 text-sm text-[var(--ledger-ink-soft)]">
                No characters yet. Start your first hunter from the character wizard.
              </div>
            )}
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-bold text-[var(--ledger-ink)]">Party Activity</h2>
            <div className="space-y-4">
              {Array.from(new Map([...gmParties, ...memberParties].map((party) => [party.id, party])).values()).map((party) => (
                <Link key={party.id} href={`/parties/${party.id}`} className="block rounded-2xl border border-[var(--ledger-line)]/55 bg-[var(--ledger-paper)] p-5 transition-colors hover:border-[var(--ledger-accent)]/65">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <h3 className="text-lg font-bold text-[var(--ledger-ink)]">{party.name}</h3>
                      <p className="text-sm text-[var(--ledger-ink-soft)]">
                        {party.gmId === session.user.id ? "You are the GM" : "Party member"} · {party.headquarters?.developmentPoints ?? 0} DP
                      </p>
                    </div>
                  </div>
                </Link>
              ))}
              {gmParties.length + memberParties.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-[var(--ledger-line)]/55 bg-[var(--ledger-paper)] p-6 text-sm text-[var(--ledger-ink-soft)]">
                  {isGM ? "No parties created yet." : "You are not in any parties yet."}
                </div>
              ) : null}
            </div>
          </section>
        </div>

        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold text-[var(--ledger-ink)]">Recent Mysteries</h2>
            <Link href="/parties" className="text-sm text-[var(--ledger-accent)] hover:text-[var(--ledger-accent)]">
              Open parties
            </Link>
          </div>

          {recentMysteries.length > 0 ? (
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
              {recentMysteries.map((mystery) => (
                <Link key={mystery.id} href={`/parties/${mystery.partyId}/mysteries`} className="rounded-2xl border border-[var(--ledger-line)]/55 bg-[var(--ledger-paper)] p-5 transition-colors hover:border-[var(--ledger-accent)]/65">
                  <p className="text-xs uppercase tracking-[0.25em] text-[var(--ledger-ink-soft)]">{mystery.party.name}</p>
                  <h3 className="mt-2 text-lg font-bold text-[var(--ledger-ink)]">{mystery.title}</h3>
                  <p className="mt-2 line-clamp-3 text-sm text-[var(--ledger-ink-soft)]">{mystery.summary}</p>
                  <p className="mt-4 text-xs text-[var(--ledger-accent)]">{mystery.status}</p>
                </Link>
              ))}
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-[var(--ledger-line)]/55 bg-[var(--ledger-paper)] p-6 text-sm text-[var(--ledger-ink-soft)]">
              No mysteries logged yet.
            </div>
          )}
        </section>

        {isAdmin ? (
          <section className="rounded-2xl border border-[var(--ledger-line)]/55 bg-[var(--ledger-paper)] p-6">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h2 className="text-2xl font-bold text-[var(--ledger-ink)]">Admin Shortcuts</h2>
                <p className="mt-1 text-sm text-[var(--ledger-ink-soft)]">Manage game content and society accounts.</p>
              </div>
              <div className="flex flex-wrap gap-3">
                <Link href="/admin/users" className="rounded-full border border-[var(--ledger-line)]/55 bg-[var(--ledger-surface)] px-4 py-2 text-sm text-[var(--ledger-ink)]">
                  Users
                </Link>
                <Link href="/admin/items" className="rounded-full border border-[var(--ledger-line)]/55 bg-[var(--ledger-surface)] px-4 py-2 text-sm text-[var(--ledger-ink)]">
                  Items
                </Link>
                <Link href="/admin/vaesen" className="rounded-full border border-[var(--ledger-line)]/55 bg-[var(--ledger-surface)] px-4 py-2 text-sm text-[var(--ledger-ink)]">
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
