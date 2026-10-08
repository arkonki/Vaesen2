import { requireAdminSession } from "@/lib/access";
import prisma from "@/lib/prisma";
import Link from "next/link";
import { Plus, Edit2 } from "lucide-react";
import ConfirmDelete from "@/components/confirm-delete";
import AdminSearch from "@/components/admin-search";
import ArchetypeForm from "./form";
import { deleteArchetype } from "@/app/admin/actions";
import { revalidatePath } from "next/cache";
import { archetypeTemplateInclude } from "@/lib/archetype-template";

export default async function ArchetypesPage({
  searchParams,
}: {
  searchParams: Promise<{ action?: string; id?: string; q?: string }>;
}) {
  await requireAdminSession();
  const query = await searchParams;
  const archetypes = await prisma.archetype.findMany({ where: query.q ? { name: { contains: query.q.trim(), mode: "insensitive" } } : {}, orderBy: { name: "asc" } });

  const isCreating = query.action === "create";
  const editingId = query.id;
  const editingArchetype = editingId ? await prisma.archetype.findUnique({ where: { id: editingId }, include: archetypeTemplateInclude }) : null;
  const talents = isCreating || editingId ? await prisma.talent.findMany({ orderBy: { name: "asc" } }) : [];
  const items = isCreating || editingId ? await prisma.item.findMany({ where: { type: { not: "MAGIC" } }, orderBy: { name: "asc" } }) : [];

  async function handleDelete(data: FormData) {
    "use server";
    const id = data.get("id") as string;
    await deleteArchetype(id);
    revalidatePath("/admin/archetypes");
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-[var(--ledger-ink)] tracking-tight">Archetypes</h1>
        {!isCreating && !editingArchetype && (
          <Link href="?action=create" className="flex items-center gap-2 bg-[rgba(127,48,40,0.12)] hover:bg-[rgba(127,48,40,0.12)] text-[var(--ledger-ink)] px-4 py-2 rounded-md font-medium transition-colors">
            <Plus className="w-4 h-4" />
            New Archetype
          </Link>
        )}
      </div>

      {!isCreating && !editingId && <AdminSearch query={query.q} count={archetypes.length} />}

      {(isCreating || editingArchetype) ? (
        <div className="bg-[var(--ledger-surface-strong)] border border-[var(--ledger-line)]/55 rounded-lg p-6">
          <h2 className="text-xl font-bold text-[var(--ledger-ink)] mb-4">
            {isCreating ? "Create Archetype" : `Edit ${editingArchetype?.name}`}
          </h2>
          <ArchetypeForm key={editingArchetype?.id ?? "new"} archetype={editingArchetype} talents={talents} items={items} />
        </div>
      ) : (
        <div className="bg-[var(--ledger-surface-strong)] border border-[var(--ledger-line)]/55 rounded-sm ledger-admin-table">
          <table className="w-full text-left text-sm text-[var(--ledger-ink)]">
            <thead className="bg-[var(--ledger-paper)] text-[var(--ledger-ink-soft)]">
              <tr>
                <th className="px-6 py-4 font-medium">Name</th>
                <th className="px-6 py-4 font-medium">Main Attribute</th>
                <th className="px-6 py-4 font-medium">Main Skill</th>
                <th className="px-6 py-4 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-800">
              {archetypes.map((arch) => (
                <tr key={arch.id} className="hover:bg-[var(--ledger-paper-deep)] transition-colors">
                  <td className="px-6 py-4 font-medium text-[var(--ledger-ink)]">{arch.name}</td>
                  <td className="px-6 py-4">{arch.mainAttribute}</td>
                  <td className="px-6 py-4">{arch.mainSkill}</td>
                  <td className="px-6 py-4 text-right flex justify-end gap-3">
                    <Link href={`?id=${arch.id}`} aria-label={`Edit ${arch.name}`} className="ledger-button text-[var(--ledger-accent)]">
                      <Edit2 className="w-4 h-4" aria-hidden="true" /><span>Edit</span>
                    </Link>
                    <ConfirmDelete id={arch.id} name={arch.name} action={handleDelete} />
                  </td>
                </tr>
              ))}
              {archetypes.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-6 py-8 text-center text-[var(--ledger-ink-soft)]">
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
