import { requireAdminSession } from "@/lib/access";
import prisma from "@/lib/prisma";
import Link from "next/link";
import { Plus, Edit2 } from "lucide-react";
import ConfirmDelete from "@/components/confirm-delete";
import AdminSearch from "@/components/admin-search";
import NPCForm from "./form";
import { deleteNPC } from "@/app/admin/actions";
import { revalidatePath } from "next/cache";

export default async function NPCsPage({
  searchParams,
}: {
  searchParams: Promise<{ action?: string; id?: string; q?: string }>;
}) {
  await requireAdminSession();
  const query = await searchParams;
  const npcs = await prisma.nPC.findMany({ where: query.q ? { name: { contains: query.q.trim(), mode: "insensitive" } } : {}, orderBy: { name: "asc" } });

  const isCreating = query.action === "create";
  const editingId = query.id;
  const editingNPC = editingId ? await prisma.nPC.findUnique({ where: { id: editingId } }) : null;

  async function handleDelete(data: FormData) {
    "use server";
    const id = data.get("id") as string;
    await deleteNPC(id);
    revalidatePath("/admin/npcs");
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-[var(--ledger-ink)] tracking-tight">Non-Player Characters (NPCs)</h1>
        {!isCreating && !editingNPC && (
          <Link href="?action=create" className="flex items-center gap-2 bg-[rgba(127,48,40,0.12)] hover:bg-[rgba(127,48,40,0.12)] text-[var(--ledger-ink)] px-4 py-2 rounded-md font-medium transition-colors">
            <Plus className="w-4 h-4" />
            New NPC
          </Link>
        )}
      </div>

      {!isCreating && !editingId && <AdminSearch query={query.q} count={npcs.length} />}

      {(isCreating || editingNPC) ? (
        <div className="bg-[var(--ledger-surface-strong)] border border-[var(--ledger-line)]/55 rounded-lg p-6">
          <h2 className="text-xl font-bold text-[var(--ledger-ink)] mb-4">
            {isCreating ? "Create NPC" : `Edit ${editingNPC?.name}`}
          </h2>
          <NPCForm npc={editingNPC} />
        </div>
      ) : (
        <div className="bg-[var(--ledger-surface-strong)] border border-[var(--ledger-line)]/55 rounded-sm ledger-admin-table">
          <table className="w-full text-left text-sm text-[var(--ledger-ink)]">
            <thead className="bg-[var(--ledger-paper)] text-[var(--ledger-ink-soft)]">
              <tr>
                <th className="px-6 py-4 font-medium">Name</th>
                <th className="px-6 py-4 font-medium">Phys. Toughness</th>
                <th className="px-6 py-4 font-medium">Men. Toughness</th>
                <th className="px-6 py-4 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-800">
              {npcs.map((n) => (
                <tr key={n.id} className="hover:bg-[var(--ledger-paper-deep)] transition-colors">
                  <td className="px-6 py-4 font-medium text-[var(--ledger-ink)]">{n.name}</td>
                  <td className="px-6 py-4">{n.physicalToughness}</td>
                  <td className="px-6 py-4">{n.mentalToughness}</td>
                  <td className="px-6 py-4 text-right flex justify-end gap-3">
                    <Link href={`?id=${n.id}`} aria-label={`Edit ${n.name}`} className="ledger-button text-[var(--ledger-accent)]">
                      <Edit2 className="w-4 h-4" aria-hidden="true" /><span>Edit</span>
                    </Link>
                    <ConfirmDelete id={n.id} name={n.name} action={handleDelete} />
                  </td>
                </tr>
              ))}
              {npcs.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-6 py-8 text-center text-[var(--ledger-ink-soft)]">
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
