import { requireAdminSession } from "@/lib/access";
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
  await requireAdminSession();
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
        <h1 className="text-3xl font-bold text-[var(--ledger-ink)] tracking-tight">Items & Gear</h1>
        {!isCreating && !editingItem && (
          <Link href="?action=create" className="flex items-center gap-2 bg-[rgba(127,48,40,0.12)] hover:bg-[rgba(127,48,40,0.12)] text-[var(--ledger-ink)] px-4 py-2 rounded-md font-medium transition-colors">
            <Plus className="w-4 h-4" />
            New Item
          </Link>
        )}
      </div>

      {(isCreating || editingItem) ? (
        <div className="bg-[var(--ledger-surface-strong)] border border-[var(--ledger-line)]/55 rounded-lg p-6">
          <h2 className="text-xl font-bold text-[var(--ledger-ink)] mb-4">
            {isCreating ? "Create Item" : `Edit ${editingItem?.name}`}
          </h2>
          <ItemForm item={editingItem} />
        </div>
      ) : (
        <div className="bg-[var(--ledger-surface-strong)] border border-[var(--ledger-line)]/55 rounded-lg overflow-hidden">
          <table className="w-full text-left text-sm text-[var(--ledger-ink)]">
            <thead className="bg-[var(--ledger-paper)] text-[var(--ledger-ink-soft)]">
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
                <tr key={item.id} className="hover:bg-[var(--ledger-paper-deep)] transition-colors">
                  <td className="px-6 py-4 font-medium text-[var(--ledger-ink)]">{item.name}</td>
                  <td className="px-6 py-4">
                    <span className="px-2 py-1 rounded-full text-xs font-medium bg-[var(--ledger-paper-deep)] text-[var(--ledger-ink)]">
                      {item.type}
                    </span>
                  </td>
                  <td className="px-6 py-4">+{item.bonus}</td>
                  <td className="px-6 py-4">{item.availability}</td>
                  <td className="px-6 py-4 text-right flex justify-end gap-3">
                    <Link href={`?id=${item.id}`} className="text-[var(--ledger-accent)] hover:text-[var(--ledger-accent)]">
                      <Edit2 className="w-4 h-4" />
                    </Link>
                    <form action={handleDelete}>
                      <input type="hidden" name="id" value={item.id} />
                      <button type="submit" className="text-[var(--ledger-danger)] hover:text-[var(--ledger-danger)]">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </form>
                  </td>
                </tr>
              ))}
              {items.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-[var(--ledger-ink-soft)]">
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
