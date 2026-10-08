"use server";

import prisma from "@/lib/prisma";
import { getAppSession } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { ItemType, Role, TalentType, Prisma } from "@prisma/client";
import bcrypt from "bcryptjs";
import { publicUserSelect } from "@/lib/security";
import { passwordSchema, userProfileSchema } from "@/lib/user-validation";
import { saveArchetypeTemplate } from "@/lib/archetype-service";

async function requireAdmin() {
  const session = await getAppSession();
  if (!session || session.user.role !== "ADMIN") {
    throw new Error("Unauthorized: Admin access required.");
  }
}

// ------ ARCHETYPES ------ //

export async function createArchetype(data: unknown) {
  await requireAdmin();
  const created = await saveArchetypeTemplate(data);
  revalidatePath("/admin/archetypes");
  revalidatePath("/characters/create");
  revalidatePath("/compendium");
  return created;
}

export async function updateArchetype(id: string, data: unknown) {
  await requireAdmin();
  const updated = await saveArchetypeTemplate(data, id);
  revalidatePath("/admin/archetypes");
  revalidatePath("/characters/create");
  revalidatePath("/compendium");
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
  const references = await prisma.archetypeStartingTalent.findMany({ where: { talentId: id } });
  if (data.type !== "GENERAL" && references.some(entry => entry.archetypeId !== data.archetypeId)) {
    throw new Error("Remove this talent from other archetypes' starting lists before changing its archetype.");
  }
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
  data = { ...data, skill: data.skill || null, range: data.range || null };
  const created = await prisma.item.create({ data });
  revalidatePath("/admin/items");
  return created;
}

export async function updateItem(id: string, data: { name: string; description: string; bonus: number; availability: number; type: ItemType; damage?: number | null; range?: string | null; skill?: string | null }) {
  await requireAdmin();
  data = { ...data, skill: data.skill || null, range: data.range || null };
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

export async function createNPC(data: Prisma.NPCCreateInput) {
  await requireAdmin();
  const created = await prisma.nPC.create({ data });
  revalidatePath("/admin/npcs");
  return created;
}

export async function updateNPC(id: string, data: Prisma.NPCUpdateInput) {
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

export async function createVaesen(data: Prisma.VaesenCreateInput) {
  await requireAdmin();
  const created = await prisma.vaesen.create({ data });
  revalidatePath("/admin/vaesen");
  return created;
}

export async function updateVaesen(id: string, data: Prisma.VaesenUpdateInput) {
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

// ------ USERS ------ //

export async function createUser(data: { name?: string; email: string; role: Role; password: string }) {
  await requireAdmin();

  const profile = userProfileSchema.parse(data);
  if (await prisma.user.findFirst({ where: { email: { equals: profile.email, mode: "insensitive" } }, select: { id: true } })) {
    throw new Error("This email address is already in use");
  }
  const passwordHash = await bcrypt.hash(passwordSchema.parse(data.password), 12);

  const created = await prisma.user.create({
    data: {
      name: profile.name || null,
      email: profile.email,
      role: profile.role,
      passwordHash,
    },
    select: publicUserSelect,
  });

  revalidatePath("/admin/users");
  return created;
}

export async function updateUserProfile(data: { id: string; name?: string; email: string; role: Role }) {
  await requireAdmin();

  const profile = userProfileSchema.parse(data);
  const updated = await prisma.$transaction(async (tx) => {
    if (await tx.user.findFirst({ where: { id: { not: data.id }, email: { equals: profile.email, mode: "insensitive" } }, select: { id: true } })) {
      throw new Error("This email address is already in use");
    }
    const user = await tx.user.findUniqueOrThrow({ where: { id: data.id } });
    if (user.role === "ADMIN" && profile.role !== "ADMIN" &&
      await tx.user.count({ where: { role: "ADMIN" } }) <= 1) {
      throw new Error("The last administrator cannot be demoted");
    }
    return tx.user.update({
      where: { id: data.id },
      data: { ...profile, name: profile.name || null, sessionVersion: { increment: 1 } },
      select: publicUserSelect,
    });
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });

  revalidatePath("/admin/users");
  return updated;
}

export async function resetUserPassword(id: string, password: string) {
  await requireAdmin();

  const passwordHash = await bcrypt.hash(passwordSchema.parse(password), 12);

  await prisma.user.update({
    where: { id },
    data: { passwordHash, sessionVersion: { increment: 1 } },
  });

  revalidatePath("/admin/users");
}
