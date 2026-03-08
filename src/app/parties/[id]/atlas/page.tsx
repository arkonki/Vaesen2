import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { redirect } from "next/navigation";
import MapViewer from "./map-viewer";

export default async function AtlasPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = { user: { id: "test-user-id", name: "Test Master", role: "GM" } };
  // const session = await getServerSession(authOptions);
  // if (!session) redirect("/api/auth/signin");

  const party = await prisma.party.findUnique({
    where: { id: id },
    include: {
      maps: true,
      gm: true,
    },
  });

  if (!party) redirect("/parties");

  const isGM = party.gmId === session.user.id;

  return (
    <div className="space-y-8 h-full flex flex-col">
      <div>
        <h1 className="text-3xl font-bold text-white">Atlas</h1>
        <p className="text-neutral-400 mt-2">Explore the Mythic North and mark your path.</p>
      </div>

      <MapViewer partyId={id} initialMaps={party.maps} isGM={isGM} />
    </div>
  );
}
