import { redirect } from "next/navigation";
import { getAppSession } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { equipmentInclude, CARRIED_TYPES } from "@/lib/equipment";
import Wizard from "./wizard";
import { archetypeTemplateInclude } from "@/lib/archetype-template";

export default async function CreateCharacterPage() {
  const session = await getAppSession();

  if (!session) {
    redirect("/login");
  }

  // Fetch all necessary data for the wizard steps
  const archetypes = await prisma.archetype.findMany({ where: { archivedAt: null }, include: archetypeTemplateInclude, orderBy: { name: "asc" } });
  const talents = await prisma.talent.findMany();
  const items = await prisma.item.findMany({ where: { type: { in: [...CARRIED_TYPES] } }, include: equipmentInclude });
  const skills = await prisma.skillDefinition.findMany({ orderBy: { name: "asc" } });

  return (
    <div className="creation-page">
      <Wizard archetypes={archetypes} talents={talents} items={items} skills={skills} userId={session.user.id} />
    </div>
  );
}
