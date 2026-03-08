import prisma from "@/lib/prisma";
import Link from "next/link";
import { Plus, Edit2, Trash2 } from "lucide-react";
import ItemForm from "./form";
import { deleteItem } from "@/app/admin/actions";
import { revalidatePath } from "next/cache";

export default async function ItemsPage({
  searchParams,
}: {
  searchParams: Promise<{ action?: string; id?: string }>;
}) {
  const query = await searchParams;
  const items = await prisma.item.findMany();

  const isCreating = query.action === "create";
  const editingId = query.id;
  const editingItem = editingId ? items.find(i => i.id === editingId) : null;

  async function handleDelete(data: FormData) {
    "use server";
    const id = data.get("id") as string;
    await deleteItem(id);
    revalidatePath("/admin/items");
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-white tracking-tight">Items & Gear</h1>
        {!isCreating && !editingItem && (
          <Link href="?action=create" className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-md font-medium transition-colors">
            <Plus className="w-4 h-4" />
            New Item
          </Link>
        )}
      </div>

      {(isCreating || editingItem) ? (
        <div className="bg-neutral-900 border border-neutral-800 rounded-lg p-6">
          <h2 className="text-xl font-bold text-white mb-4">
            {isCreating ? "Create Item" : `Edit ${editingItem?.name}`}
          </h2>
          <ItemForm item={editingItem} />
        </div>
      ) : (
        <div className="bg-neutral-900 border border-neutral-800 rounded-lg overflow-hidden">
          <table className="w-full text-left text-sm text-neutral-300">
            <thead className="bg-neutral-950 text-neutral-400">
              <tr>
                <th className="px-6 py-4 font-medium">Name</th>
                <th className="px-6 py-4 font-medium">Type</th>
                <th className="px-6 py-4 font-medium">Bonus</th>
                <th className="px-6 py-4 font-medium">Avail.</th>
                <th className="px-6 py-4 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-800">
              {items.map((item) => (
                <tr key={item.id} className="hover:bg-neutral-800/50 transition-colors">
                  <td className="px-6 py-4 font-medium text-white">{item.name}</td>
                  <td className="px-6 py-4">
                    <span className="px-2 py-1 rounded-full text-xs font-medium bg-neutral-800 text-neutral-300">
                      {item.type}
                    </span>
                  </td>
                  <td className="px-6 py-4">+{item.bonus}</td>
                  <td className="px-6 py-4">{item.availability}</td>
                  <td className="px-6 py-4 text-right flex justify-end gap-3">
                    <Link href={`?id=${item.id}`} className="text-indigo-400 hover:text-indigo-300">
                      <Edit2 className="w-4 h-4" />
                    </Link>
                    <form action={handleDelete}>
                      <input type="hidden" name="id" value={item.id} />
                      <button type="submit" className="text-red-400 hover:text-red-300">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </form>
                  </td>
                </tr>
              ))}
              {items.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-neutral-500">
                    No items found. Create one to get started.
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
