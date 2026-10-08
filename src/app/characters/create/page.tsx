import { redirect } from "next/navigation";
import { getAppSession } from "@/lib/auth";
import prisma from "@/lib/prisma";
import Wizard from "./wizard";
import { archetypeTemplateInclude } from "@/lib/archetype-template";

export default async function CreateCharacterPage() {
  const session = await getAppSession();

  if (!session) {
    redirect("/login");
  }

  // Fetch all necessary data for the wizard steps
  const archetypes = await prisma.archetype.findMany({ include: archetypeTemplateInclude, orderBy: { name: "asc" } });
  const talents = await prisma.talent.findMany();
  const items = await prisma.item.findMany();

  return (
    <div className="min-h-screen bg-[var(--ledger-paper)] text-[var(--ledger-ink)] py-6 px-4 sm:px-6 lg:px-8 font-sans">
      <div className="max-w-4xl mx-auto">
        <div className="mb-6">
          <h1 className="text-4xl font-extrabold text-[var(--ledger-ink)] tracking-tight sm:text-5xl">Create Your Hunter</h1>
          <p className="mt-4 text-xl text-[var(--ledger-ink-soft)]">
            Step into the Mythic North. Define your archetype, allocate attributes and skills, and prepare to face the unknown.
          </p>
        </div>

        <div className="bg-[var(--ledger-surface-strong)] border border-[var(--ledger-line)]/55 overflow-hidden">
          <Wizard archetypes={archetypes} talents={talents} items={items} userId={session.user.id} />
        </div>
      </div>
    </div>
  );
}
