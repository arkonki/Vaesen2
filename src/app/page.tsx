import Link from "next/link";
import PageMasthead from "@/components/page-masthead";
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
        <PageMasthead title="The Society Awaits" eyebrow={"Welcome, " + (session.user.name || "Society Member")} description="Open your hunter's sheet, return to an investigation, or prepare the next gathering.">
          {characters[0] && <Link href={"/characters/" + characters[0].id} className="ledger-button ledger-button-primary">Open {characters[0].name}</Link>}
          {gmParties[0] && <Link href={"/parties/" + gmParties[0].id} className="ledger-button ledger-button-primary">Open Campaign</Link>}
          {isGM && !gmParties.length && <Link href="/parties" className="ledger-button ledger-button-primary">Start a Party</Link>}
          <Link href="/characters/create" className="ledger-button">New Character</Link>
          <Link href="/compendium" className="ledger-button">Consult the Library</Link>
        </PageMasthead>
        {recentMysteries.some(m => m.status === "ACTIVE") && <section className="space-y-3"><h2 className="ledger-bar">At the Table - Active Mysteries</h2><div className="grid gap-4 md:grid-cols-2">{recentMysteries.filter(m => m.status === "ACTIVE").map(mystery => <Link key={mystery.id} href={"/parties/" + mystery.partyId + "/mysteries#" + mystery.id} className="ledger-panel p-5"><p className="ledger-kicker">{mystery.party.name}</p><h3 className="mt-2 text-2xl font-bold">{mystery.title}</h3><p className="mt-2 line-clamp-2">{mystery.summary}</p><p className="mt-3 font-bold text-[var(--ledger-accent)]">Continue investigation</p></Link>)}</div></section>}

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
                  <Link key={character.id} href={`/characters/${character.id}`} className="rounded-sm border border-[var(--ledger-line)]/55 bg-[var(--ledger-paper)] p-5 transition-colors hover:border-[var(--ledger-accent)]/65">
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
              <div className="rounded-sm border border-dashed border-[var(--ledger-line)]/55 bg-[var(--ledger-paper)] p-6 text-sm text-[var(--ledger-ink-soft)]">
                No characters yet. Create your first hunter to join the Society.
              </div>
            )}
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-bold text-[var(--ledger-ink)]">Party Activity</h2>
            <div className="space-y-4">
              {Array.from(new Map([...gmParties, ...memberParties].map((party) => [party.id, party])).values()).map((party) => (
                <Link key={party.id} href={`/parties/${party.id}`} className="block rounded-sm border border-[var(--ledger-line)]/55 bg-[var(--ledger-paper)] p-5 transition-colors hover:border-[var(--ledger-accent)]/65">
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
                <div className="rounded-sm border border-dashed border-[var(--ledger-line)]/55 bg-[var(--ledger-paper)] p-6 text-sm text-[var(--ledger-ink-soft)]">
                  {isGM ? "No parties created yet. Open Parties to start a campaign and invite hunters." : "You are not in any parties yet. Ask your GM to invite one of your characters; invitations appear here."}
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
                <Link key={mystery.id} href={`/parties/${mystery.partyId}/mysteries#${mystery.id}`} className="rounded-sm border border-[var(--ledger-line)]/55 bg-[var(--ledger-paper)] p-5 transition-colors hover:border-[var(--ledger-accent)]/65">
                  <p className="text-xs uppercase tracking-[0.25em] text-[var(--ledger-ink-soft)]">{mystery.party.name}</p>
                  <h3 className="mt-2 text-lg font-bold text-[var(--ledger-ink)]">{mystery.title}</h3>
                  <p className="mt-2 line-clamp-3 text-sm text-[var(--ledger-ink-soft)]">{mystery.summary}</p>
                  <p className="mt-4 text-xs text-[var(--ledger-accent)]">{mystery.status}</p>
                </Link>
              ))}
            </div>
          ) : (
            <div className="rounded-sm border border-dashed border-[var(--ledger-line)]/55 bg-[var(--ledger-paper)] p-6 text-sm text-[var(--ledger-ink-soft)]">
              No mysteries logged yet.
            </div>
          )}
        </section>

        {isAdmin ? (
          <section className="rounded-sm border border-[var(--ledger-line)]/55 bg-[var(--ledger-paper)] p-6">
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
