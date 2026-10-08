import Link from "next/link";
import prisma from "@/lib/prisma";
import { getPartyAccess } from "@/lib/access";
import PageMasthead from "@/components/page-masthead";

export default async function PartyPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { party, session, isGM } = await getPartyAccess(id);
  const mysteries = await prisma.mystery.findMany({
    where: { partyId: id, status: { in: isGM ? ["ACTIVE", "PREP"] : ["ACTIVE"] }, ...(!isGM ? { isPublished: true } : {}) },
    select: { id: true, title: true, summary: true, status: true }, orderBy: { updatedAt: "desc" }, take: 4,
  });
  const ownCharacters = party.members.filter(member => member.character.userId === session.user.id);
  return <div className="space-y-6">
    <PageMasthead title={party.name} eyebrow={isGM ? "Game Master's Campaign Ledger" : "Your Campaign Ledger"} description="Everything you need for the next scene, gathered in one place.">
      <Link className="ledger-button ledger-button-primary" href={`/parties/${id}/mysteries`}>Open Mystery Log</Link>
      <Link className="ledger-button" href={`/parties/${id}/notes`}>Party Notes</Link>
    </PageMasthead>
    {ownCharacters.length > 0 && <section className="ledger-panel p-5"><h2 className="text-xl font-bold">Your Hunters</h2><div className="mt-3 flex flex-wrap gap-3">{ownCharacters.map(member => <Link key={member.id} className="ledger-button" href={`/characters/${member.character.id}`}>{member.character.name} - Open Sheet</Link>)}</div></section>}
    <section className="space-y-3"><h2 className="ledger-bar">Current Investigations</h2>
      {mysteries.length ? <div className="grid gap-4 md:grid-cols-2">{mysteries.map(mystery => <Link className="ledger-panel p-5" key={mystery.id} href={`/parties/${id}/mysteries#${mystery.id}`}><p className="ledger-kicker">{mystery.status === "PREP" ? "GM preparation" : "Active mystery"}</p><h3 className="mt-2 text-2xl font-bold">{mystery.title}</h3><p className="mt-2 line-clamp-3">{mystery.summary}</p><p className="mt-3 font-bold text-[var(--ledger-accent)]">Open investigation</p></Link>)}</div> : <div className="ledger-panel p-5"><p>{isGM ? "No current investigation. Create a mystery to prepare the next session." : "No active mystery has been shared by your GM yet."}</p><Link className="ledger-button mt-3" href={`/parties/${id}/mysteries`}>{isGM ? "Create a Mystery" : "View Mystery Log"}</Link></div>}
    </section>
    <div className="grid gap-4 sm:grid-cols-2">
      <Link className="ledger-panel p-5" href={`/parties/${id}/hq`}><h2 className="text-xl font-bold">Headquarters</h2><p className="mt-2">{party.headquarters?.name || "The Society's headquarters"}</p><p className="mt-1">{party.headquarters?.developmentPoints ?? 0} development points</p></Link>
      <Link className="ledger-panel p-5" href={`/parties/${id}/equipment`}><h2 className="text-xl font-bold">Shared Equipment</h2><p className="mt-2">Check the stash and prepare for the next journey.</p></Link>
      <Link className="ledger-panel p-5" href={`/parties/${id}/goals`}><h2 className="text-xl font-bold">Goals</h2><p className="mt-2">Keep your objectives and unfinished business in view.</p></Link>
      <Link className="ledger-panel p-5" href={`/parties/${id}/management`}><h2 className="text-xl font-bold">{isGM ? "Members & Invitations" : "Party Members"}</h2><p className="mt-2">{party.members.length} hunters in the Society.</p></Link>
    </div>
  </div>;
}
