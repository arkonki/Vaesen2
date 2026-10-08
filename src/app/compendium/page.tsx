import { redirect } from "next/navigation";
import { getAppSession } from "@/lib/auth";
import prisma from "@/lib/prisma";
import CompendiumClient from "./compendium-client";
import { archetypeTemplateInclude } from "@/lib/archetype-template";

export default async function CompendiumPage() {
  const session = await getAppSession();

  if (!session) {
    redirect("/login");
  }

  const canViewGmContent = session.user.role === "GM" || session.user.role === "ADMIN";

  const [items, talents, archetypes, npcs, vaesen] = await Promise.all([
    prisma.item.findMany({ orderBy: { name: "asc" } }),
    prisma.talent.findMany({ orderBy: { name: "asc" } }),
    prisma.archetype.findMany({ orderBy: { name: "asc" }, include: archetypeTemplateInclude }),
    canViewGmContent ? prisma.nPC.findMany({ orderBy: { name: "asc" } }) : Promise.resolve([]),
    canViewGmContent ? prisma.vaesen.findMany({ orderBy: { name: "asc" } }) : Promise.resolve([]),
  ]);

  return (
    <div className="min-h-screen bg-[var(--ledger-paper)] text-[var(--ledger-ink)] py-10 px-4 sm:px-6 lg:px-8">
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
