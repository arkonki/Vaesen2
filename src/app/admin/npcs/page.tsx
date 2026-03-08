import prisma from "@/lib/prisma";
import Link from "next/link";
import { Plus, Edit2, Trash2 } from "lucide-react";
import NPCForm from "./form";
import { deleteNPC } from "@/app/admin/actions";
import { revalidatePath } from "next/cache";

export default async function NPCsPage({ searchParams }: { searchParams: { action?: string, id?: string } }) {
  const npcs = await prisma.nPC.findMany();

  const isCreating = searchParams.action === 'create';
  const editingId = searchParams.id;
  const editingNPC = editingId ? npcs.find(n => n.id === editingId) : null;

  async function handleDelete(data: FormData) {
    "use server";
    const id = data.get("id") as string;
    await deleteNPC(id);
    revalidatePath("/admin/npcs");
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-white tracking-tight">Non-Player Characters (NPCs)</h1>
        {!isCreating && !editingNPC && (
          <Link href="?action=create" className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-md font-medium transition-colors">
            <Plus className="w-4 h-4" />
            New NPC
          </Link>
        )}
      </div>

      {(isCreating || editingNPC) ? (
        <div className="bg-neutral-900 border border-neutral-800 rounded-lg p-6">
          <h2 className="text-xl font-bold text-white mb-4">
            {isCreating ? "Create NPC" : `Edit ${editingNPC?.name}`}
          </h2>
          <NPCForm npc={editingNPC} />
        </div>
      ) : (
        <div className="bg-neutral-900 border border-neutral-800 rounded-lg overflow-hidden">
          <table className="w-full text-left text-sm text-neutral-300">
            <thead className="bg-neutral-950 text-neutral-400">
              <tr>
                <th className="px-6 py-4 font-medium">Name</th>
                <th className="px-6 py-4 font-medium">Phys. Toughness</th>
                <th className="px-6 py-4 font-medium">Men. Toughness</th>
                <th className="px-6 py-4 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-800">
              {npcs.map((n) => (
                <tr key={n.id} className="hover:bg-neutral-800/50 transition-colors">
                  <td className="px-6 py-4 font-medium text-white">{n.name}</td>
                  <td className="px-6 py-4">{n.physicalToughness}</td>
                  <td className="px-6 py-4">{n.mentalToughness}</td>
                  <td className="px-6 py-4 text-right flex justify-end gap-3">
                    <Link href={`?id=${n.id}`} className="text-indigo-400 hover:text-indigo-300">
                      <Edit2 className="w-4 h-4" />
                    </Link>
                    <form action={handleDelete}>
                      <input type="hidden" name="id" value={n.id} />
                      <button type="submit" className="text-red-400 hover:text-red-300">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </form>
                  </td>
                </tr>
              ))}
              {npcs.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-6 py-8 text-center text-neutral-500">
                    No NPCs found. Create one to get started.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
