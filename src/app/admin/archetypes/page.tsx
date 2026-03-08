import prisma from "@/lib/prisma";
import Link from "next/link";
import { Plus, Edit2, Trash2 } from "lucide-react";
import ArchetypeForm from "./form";
import { deleteArchetype } from "@/app/admin/actions";
import { revalidatePath } from "next/cache";

export default async function ArchetypesPage({
  searchParams,
}: {
  searchParams: Promise<{ action?: string; id?: string }>;
}) {
  const query = await searchParams;
  const archetypes = await prisma.archetype.findMany();

  const isCreating = query.action === "create";
  const editingId = query.id;
  const editingArchetype = editingId ? archetypes.find(a => a.id === editingId) : null;

  async function handleDelete(data: FormData) {
    "use server";
    const id = data.get("id") as string;
    await deleteArchetype(id);
    revalidatePath("/admin/archetypes");
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-white tracking-tight">Archetypes</h1>
        {!isCreating && !editingArchetype && (
          <Link href="?action=create" className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-md font-medium transition-colors">
            <Plus className="w-4 h-4" />
            New Archetype
          </Link>
        )}
      </div>

      {(isCreating || editingArchetype) ? (
        <div className="bg-neutral-900 border border-neutral-800 rounded-lg p-6">
          <h2 className="text-xl font-bold text-white mb-4">
            {isCreating ? "Create Archetype" : `Edit ${editingArchetype?.name}`}
          </h2>
          <ArchetypeForm archetype={editingArchetype} />
        </div>
      ) : (
        <div className="bg-neutral-900 border border-neutral-800 rounded-lg overflow-hidden">
          <table className="w-full text-left text-sm text-neutral-300">
            <thead className="bg-neutral-950 text-neutral-400">
              <tr>
                <th className="px-6 py-4 font-medium">Name</th>
                <th className="px-6 py-4 font-medium">Main Attribute</th>
                <th className="px-6 py-4 font-medium">Main Skill</th>
                <th className="px-6 py-4 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-800">
              {archetypes.map((arch) => (
                <tr key={arch.id} className="hover:bg-neutral-800/50 transition-colors">
                  <td className="px-6 py-4 font-medium text-white">{arch.name}</td>
                  <td className="px-6 py-4">{arch.mainAttribute}</td>
                  <td className="px-6 py-4">{arch.mainSkill}</td>
                  <td className="px-6 py-4 text-right flex justify-end gap-3">
                    <Link href={`?id=${arch.id}`} className="text-indigo-400 hover:text-indigo-300">
                      <Edit2 className="w-4 h-4" />
                    </Link>
                    <form action={handleDelete}>
                      <input type="hidden" name="id" value={arch.id} />
                      <button type="submit" className="text-red-400 hover:text-red-300">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </form>
                  </td>
                </tr>
              ))}
              {archetypes.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-6 py-8 text-center text-neutral-500">
                    No archetypes found. Create one to get started.
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
