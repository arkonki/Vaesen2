"use server";

import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { ItemType, TalentType } from "@prisma/client";

async function requireAdmin() {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "ADMIN") {
    throw new Error("Unauthorized: Admin access required.");
  }
}

// ------ ARCHETYPES ------ //

export async function createArchetype(data: { name: string; mainAttribute: string; mainSkill: string; startingResourcesMin: number; startingResourcesMax: number }) {
  await requireAdmin();
  const created = await prisma.archetype.create({ data });
  revalidatePath("/admin/archetypes");
  return created;
}

export async function updateArchetype(id: string, data: { name: string; mainAttribute: string; mainSkill: string; startingResourcesMin: number; startingResourcesMax: number }) {
  await requireAdmin();
  const updated = await prisma.archetype.update({ where: { id }, data });
  revalidatePath("/admin/archetypes");
  return updated;
}

export async function deleteArchetype(id: string) {
  await requireAdmin();
  await prisma.archetype.delete({ where: { id } });
  revalidatePath("/admin/archetypes");
}

// ------ TALENTS ------ //

export async function createTalent(data: { name: string; description: string; type: TalentType; archetypeId?: string }) {
  await requireAdmin();
  // Ensure archetypeId is null if empty string
  if (!data.archetypeId) data.archetypeId = undefined;
  const created = await prisma.talent.create({ data });
  revalidatePath("/admin/talents");
  return created;
}

export async function updateTalent(id: string, data: { name: string; description: string; type: TalentType; archetypeId?: string }) {
  await requireAdmin();
  if (!data.archetypeId) data.archetypeId = undefined;
  const updated = await prisma.talent.update({ where: { id }, data });
  revalidatePath("/admin/talents");
  return updated;
}

export async function deleteTalent(id: string) {
  await requireAdmin();
  await prisma.talent.delete({ where: { id } });
  revalidatePath("/admin/talents");
}

// ------ ITEMS ------ //

export async function createItem(data: { name: string; description: string; bonus: number; availability: number; type: ItemType; damage?: number | null; range?: string | null; skill?: string | null }) {
  await requireAdmin();
  Object.keys(data).forEach(k => (data as any)[k] === "" && ((data as any)[k] = null));
  const created = await prisma.item.create({ data });
  revalidatePath("/admin/items");
  return created;
}

export async function updateItem(id: string, data: { name: string; description: string; bonus: number; availability: number; type: ItemType; damage?: number | null; range?: string | null; skill?: string | null }) {
  await requireAdmin();
  Object.keys(data).forEach(k => (data as any)[k] === "" && ((data as any)[k] = null));
  const updated = await prisma.item.update({ where: { id }, data });
  revalidatePath("/admin/items");
  return updated;
}

export async function deleteItem(id: string) {
  await requireAdmin();
  await prisma.item.delete({ where: { id } });
  revalidatePath("/admin/items");
}

// ------ NPCS ------ //

export async function createNPC(data: any) {
  await requireAdmin();
  const created = await prisma.nPC.create({ data });
  revalidatePath("/admin/npcs");
  return created;
}

export async function updateNPC(id: string, data: any) {
  await requireAdmin();
  const updated = await prisma.nPC.update({ where: { id }, data });
  revalidatePath("/admin/npcs");
  return updated;
}

export async function deleteNPC(id: string) {
  await requireAdmin();
  await prisma.nPC.delete({ where: { id } });
  revalidatePath("/admin/npcs");
}

// ------ VAESEN ------ //

export async function createVaesen(data: any) {
  await requireAdmin();
  const created = await prisma.vaesen.create({ data });
  revalidatePath("/admin/vaesen");
  return created;
}

export async function updateVaesen(id: string, data: any) {
  await requireAdmin();
  const updated = await prisma.vaesen.update({ where: { id }, data });
  revalidatePath("/admin/vaesen");
  return updated;
}

export async function deleteVaesen(id: string) {
  await requireAdmin();
  await prisma.vaesen.delete({ where: { id } });
  revalidatePath("/admin/vaesen");
}
