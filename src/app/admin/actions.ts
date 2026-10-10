"use server";

import prisma from "@/lib/prisma";
import { getAppSession } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { Role, TalentType, Prisma } from "@prisma/client";
import { saveEquipment } from "@/lib/equipment-service";
import bcrypt from "bcryptjs";
import { publicUserSelect } from "@/lib/security";
import { passwordSchema, userProfileSchema } from "@/lib/user-validation";
import { saveArchetypeTemplate, setArchetypeArchived } from "@/lib/archetype-service";
import { skillReferenceSchema, SKILL_ATTRIBUTES } from "@/lib/skill-reference";
import { skillName } from "@/lib/equipment";

export async function saveSkillReference(input: unknown) {
  await requireAdmin();
  const data = skillReferenceSchema.parse(input);
  const record = { ...data, name: skillName(data.key), attribute: SKILL_ATTRIBUTES[data.key] };
  const saved = await prisma.skillDefinition.upsert({ where: { key: data.key }, create: record, update: record });
  revalidatePath("/admin/skills"); revalidatePath("/compendium");
  return saved;
}

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

export async function updateArchetype(id: string, data: unknown, expectedRevision: number) {
  await requireAdmin();
  const updated = await saveArchetypeTemplate(data, id, expectedRevision);
  revalidatePath("/admin/archetypes");
  revalidatePath("/characters/create");
  revalidatePath("/compendium");
  return updated;
}

export async function archiveArchetype(input: unknown) {
  await requireAdmin();
  const saved = await setArchetypeArchived(input);
  revalidatePath("/admin/archetypes");
  revalidatePath("/characters/create");
  revalidatePath("/compendium");
  return saved;
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

export async function createItem(data: unknown) {
  await requireAdmin();
  const created = await saveEquipment(data);
  revalidatePath("/admin/items");
  revalidatePath("/compendium"); revalidatePath("/characters", "layout"); revalidatePath("/parties", "layout");
  return created;
}

export async function updateItem(id: string, data: unknown) {
  await requireAdmin();
  const updated = await saveEquipment(data, id);
  revalidatePath("/admin/items");
  revalidatePath("/compendium"); revalidatePath("/characters", "layout"); revalidatePath("/parties", "layout");
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
