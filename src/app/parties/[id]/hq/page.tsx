import prisma from "@/lib/prisma";
import { redirect } from "next/navigation";
import HQDashboard from "./hq-dashboard";
import { getPartyAccess } from "@/lib/access";

export default async function HQPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const access = await getPartyAccess(id);

  const party = await prisma.party.findUnique({
    where: { id: id },
    include: {
      headquarters: true,
      gm: true,
    },
  });

  if (!party || !party.headquarters) redirect(`/parties/${id}/management`);

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-bold text-white">Headquarters</h1>
          <p className="text-neutral-400 mt-2">{party.headquarters.name}</p>
        </div>
        <div className="bg-indigo-600/10 border border-indigo-500/30 rounded-lg px-4 py-2 flex items-center gap-3">
          <span className="text-indigo-400 font-bold text-xl">{party.headquarters.developmentPoints}</span>
          <span className="text-xs text-indigo-300 uppercase tracking-widest font-semibold leading-none">
            Development<br/>Points
          </span>
        </div>
      </div>

      <HQDashboard hq={party.headquarters} isGM={access.isGM} />
    </div>
  );
}
