import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import Wizard from "./wizard";

export default async function CreateCharacterPage() {
  const session = await getServerSession(authOptions);
  
  if (!session) {
    redirect("/login");
  }

  // Fetch all necessary data for the wizard steps
  const archetypes = await prisma.archetype.findMany();
  const talents = await prisma.talent.findMany();
  const items = await prisma.item.findMany();

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 py-12 px-4 sm:px-6 lg:px-8 font-sans">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-extrabold text-white tracking-tight sm:text-5xl">Forge Your Vaesen Hunter</h1>
          <p className="mt-4 text-xl text-neutral-400">
            Step into the Mythic North. Define your archetype, allocate attributes and skills, and prepare to face the unknown.
          </p>
        </div>

        <div className="bg-neutral-900 border border-neutral-800 rounded-xl shadow-2xl overflow-hidden">
          <Wizard archetypes={archetypes} talents={talents} items={items} userId={session.user.id} />
        </div>
      </div>
    </div>
  );
}
