import Link from "next/link";
import PageMasthead from "@/components/page-masthead";
import prisma from "@/lib/prisma";
import { getRequiredSession } from "@/lib/access";
import CreatePartyForm from "./create-party-form";

export default async function PartiesPage() {
  const session = await getRequiredSession();
  const isAdmin = session.user.role === "ADMIN";
  const canManage = session.user.role === "GM" || isAdmin;

  const [managedParties, memberParties, allParties] = await Promise.all([
    canManage
      ? prisma.party.findMany({
          where: { gmId: session.user.id },
          include: {
            headquarters: true,
            _count: { select: { members: { where: { character: { archivedAt: null } } }, mysteries: true } },
          },
          orderBy: { name: "asc" },
        })
      : Promise.resolve([]),
    prisma.party.findMany({
      where: {
        members: {
          some: {
            character: {
              userId: session.user.id,
              archivedAt: null,
            },
          },
        },
      },
      include: {
        headquarters: true,
        gm: true,
        _count: { select: { members: { where: { character: { archivedAt: null } } }, mysteries: true } },
      },
      orderBy: { name: "asc" },
    }),
    isAdmin
      ? prisma.party.findMany({
          include: {
            headquarters: true,
            gm: true,
            _count: { select: { members: { where: { character: { archivedAt: null } } }, mysteries: true } },
          },
          orderBy: { name: "asc" },
        })
      : Promise.resolve([]),
  ]);

  const visibleManagedIds = new Set(managedParties.map((party) => party.id));
  const visibleMemberParties = memberParties.filter((party) => !visibleManagedIds.has(party.id));

  return (
    <main className="px-4 py-10 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl space-y-8">
        <PageMasthead title="Your Campaigns" eyebrow="The Society's Parties" description="Choose a party to return to its mystery log, hunters, shared equipment, and headquarters." />

        {canManage ? (
          <details className="ledger-panel p-5"><summary className="cursor-pointer font-bold text-[var(--ledger-accent)]">Create a New Party</summary><div className="mt-4"><CreatePartyForm /></div></details>
        ) : (
          <section className="rounded-sm border border-[var(--ledger-line)]/55 bg-[var(--ledger-paper)] p-5 text-sm text-[var(--ledger-ink-soft)]">
            Players can review their assigned parties here. Party creation is limited to GMs and admins.
          </section>
        )}

        <PartySection
          title={canManage ? "Managed Parties" : "Your Parties"}
          description={canManage ? "Parties where you run the campaign." : "Parties where one of your characters is enrolled."}
          parties={canManage ? managedParties : visibleMemberParties}
          emptyText={canManage ? "No parties created yet." : "You are not enrolled in any parties yet."}
          showGm={!canManage}
        />

        {canManage && visibleMemberParties.length > 0 ? (
          <PartySection
            title="Member Access"
            description="Parties where you participate through a character but are not the GM."
            parties={visibleMemberParties}
            emptyText=""
            showGm={true}
          />
        ) : null}

        {isAdmin ? (
          <PartySection
            title="All Parties"
            description="Administrator overview across all campaign groups."
            parties={allParties}
            emptyText="No parties in the database."
            showGm={true}
          />
        ) : null}
      </div>
    </main>
  );
}

function PartySection({
  title,
  description,
  parties,
  emptyText,
  showGm,
}: {
  title: string;
  description: string;
  parties: Array<{
    id: string;
    name: string;
    gm?: { name: string | null } | null;
    headquarters: { developmentPoints: number } | null;
    _count: { members: number; mysteries: number };
  }>;
  emptyText: string;
  showGm: boolean;
}) {
  return (
    <section className="space-y-4">
      <div>
        <h2 className="text-2xl font-bold text-[var(--ledger-ink)]">{title}</h2>
        <p className="mt-1 text-sm text-[var(--ledger-ink-soft)]">{description}</p>
      </div>

      {parties.length > 0 ? (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {parties.map((party) => (
            <Link
              key={party.id}
              href={`/parties/${party.id}`}
              className="rounded-sm border border-[var(--ledger-line)]/55 bg-[var(--ledger-paper)] p-5 transition-colors hover:border-[var(--ledger-accent)]/65"
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h3 className="text-xl font-bold text-[var(--ledger-ink)]">{party.name}</h3>
                  {showGm && party.gm ? (
                    <p className="mt-2 text-sm text-[var(--ledger-ink-soft)]">GM: {party.gm.name || "Unnamed GM"}</p>
                  ) : null}
                </div>
                <span className="rounded-full border border-[var(--ledger-accent)]/65 bg-[rgba(127,48,40,0.12)] px-3 py-1 text-xs text-[var(--ledger-accent)]">
                  {party.headquarters?.developmentPoints ?? 0} DP
                </span>
              </div>

              <div className="mt-4 flex gap-4 text-xs uppercase tracking-[0.2em] text-[var(--ledger-ink-soft)]">
                <span>{party._count.members} Members</span>
                <span>{party._count.mysteries} Mysteries</span>
              </div>
            </Link>
          ))}
        </div>
      ) : emptyText ? (
        <div className="rounded-sm border border-dashed border-[var(--ledger-line)]/55 bg-[var(--ledger-paper)] p-6 text-sm text-[var(--ledger-ink-soft)]">
          {emptyText}
        </div>
      ) : null}
    </section>
  );
}
