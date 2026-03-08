import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { redirect } from "next/navigation";
import MemberList from "./member-list";

export default async function ManagementPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = { user: { id: "test-user-id", name: "Test Master", role: "GM" } };
  // const session = await getServerSession(authOptions);
  // if (!session) redirect("/api/auth/signin");

  const party = await prisma.party.findUnique({
    where: { id: id },
    include: {
      members: {
        include: {
          character: {
            include: {
              archetype: true,
            }
          },
        },
      },
      gm: true,
    },
  });

  if (!party) redirect("/parties");

  const isGM = party.gmId === session.user.id;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-white">Party Management</h1>
        <p className="text-neutral-400 mt-2">Manage your party members and recruits.</p>
      </div>

      <MemberList party={party} isGM={isGM} />
    </div>
  );
}
