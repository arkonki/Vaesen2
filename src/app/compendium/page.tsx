import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import CompendiumClient from "./compendium-client";

export default async function CompendiumPage() {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect("/login");
  }

  const canViewGmContent = session.user.role === "GM" || session.user.role === "ADMIN";

  const [items, talents, archetypes, npcs, vaesen] = await Promise.all([
    prisma.item.findMany({ orderBy: { name: "asc" } }),
    prisma.talent.findMany({ orderBy: { name: "asc" } }),
    prisma.archetype.findMany({ orderBy: { name: "asc" } }),
    canViewGmContent ? prisma.nPC.findMany({ orderBy: { name: "asc" } }) : Promise.resolve([]),
    canViewGmContent ? prisma.vaesen.findMany({ orderBy: { name: "asc" } }) : Promise.resolve([]),
  ]);

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 py-10 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <CompendiumClient
          role={session.user.role}
          canViewGmContent={canViewGmContent}
          items={items}
          talents={talents}
          archetypes={archetypes}
          npcs={npcs}
          vaesen={vaesen}
        />
      </div>
    </div>
  );
}
