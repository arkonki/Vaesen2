"use server";

import { revalidatePath } from "next/cache";
import {
  MysteryEntityType,
  MysteryStatus,
  Prisma,
  TaskStatus,
} from "@prisma/client";
import { getAppSession } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { canManageParty } from "@/lib/security";
import { z } from "zod";
import { sanitizeNotes } from "@/lib/notes";
import { getUpgrade, UpgradeType } from "@/lib/hq-upgrades";
import { serializableTransaction } from "@/lib/transaction";

type ThreatEntry = {
  id: string;
  createdAt: string;
  title: string;
  description: string;
  sourceUpgrade: string;
  status: "ACTIVE" | "RESOLVED";
};

const THREAT_CATALOGUE = [
  "A suspicious journalist has started asking questions about the Society.",
  "A priest believes the party is harboring forbidden rites.",
  "A criminal gang has noticed the castle and wants in.",
  "A vaesen has taken interest in the headquarters and is testing its defenses.",
  "A government official is probing the party's finances and legal standing.",
  "A restless spirit has awakened in a sealed wing of the headquarters.",
];

async function requireSession() {
  const session = await getAppSession();

  if (!session) {
    throw new Error("Unauthorized");
  }

  return session;
}

async function requirePartyManager(partyId: string) {
  const session = await requireSession();
  const party = await prisma.party.findUnique({
    where: { id: partyId },
    select: { id: true, gmId: true },
  });

  if (!party) {
    throw new Error("Party not found");
  }

  if (!canManageParty(session.user, party.gmId)) {
    throw new Error("Forbidden");
  }

  return { session, party };
}

async function requireHeadquartersManager(hqId: string) {
  const headquarters = await prisma.headquarters.findUnique({
    where: { id: hqId },
    select: { id: true, partyId: true },
  });

  if (!headquarters) {
    throw new Error("Headquarters not found");
  }

  const { session } = await requirePartyManager(headquarters.partyId);
  return { ...headquarters, session };
}

async function requireMysteryManager(mysteryId: string) {
  const mystery = await prisma.mystery.findUnique({
    where: { id: mysteryId },
    select: { id: true, partyId: true, status: true },
  });

  if (!mystery) {
    throw new Error("Mystery not found");
  }

  await requirePartyManager(mystery.partyId);
  return mystery;
}

function toThreatList(value: unknown): ThreatEntry[] {
  return Array.isArray(value) ? (value as ThreatEntry[]) : [];
}

function rollThreatForUpgrade(upgradeName: string, cost: number): ThreatEntry | null {
  const rolls = Array.from({ length: Math.max(1, cost) }, () => Math.floor(Math.random() * 6) + 1);
  const successes = rolls.filter((roll) => roll === 6).length;

  if (successes === 0) {
    return null;
  }

  const description = THREAT_CATALOGUE[(successes - 1) % THREAT_CATALOGUE.length];

  return {
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
    title: `Threat after ${upgradeName}`,
    description,
    sourceUpgrade: upgradeName,
    status: "ACTIVE",
  };
}

export async function createParty(name: string) {
  const session = await requireSession();
  name = z.string().trim().min(1).max(200).parse(name);

  if (session.user.role !== "GM" && session.user.role !== "ADMIN") {
    throw new Error("Only GMs and Admins can create parties.");
  }

  const party = await prisma.$transaction(async (tx) => {
    const createdParty = await tx.party.create({
      data: {
        name,
        gmId: session.user.id,
      },
    });

    await tx.headquarters.create({
      data: {
        partyId: createdParty.id,
        name: "Castle Gyllencreutz",
        history: "A centuries-old fortification in Upsala.",
        developmentPoints: 0,
      },
    });

    return createdParty;
  });

  revalidatePath("/");
  revalidatePath("/parties");
  return party;
}

export async function enrollCharacter(partyId: string, characterId: string) {
  const { session } = await requirePartyManager(partyId);

  const character = await prisma.character.findUnique({
    where: { id: characterId },
    select: { id: true, userId: true },
  });

  if (!character) {
    throw new Error("Character not found");
  }

  if (session.user.role !== "ADMIN" && character.userId !== session.user.id) {
    await prisma.characterInvitation.upsert({
      where: { partyId_characterId: { partyId, characterId } },
      update: {},
      create: { partyId, characterId },
    });
  } else {
    await prisma.partyMember.upsert({
      where: { partyId_characterId: { partyId, characterId } },
      update: {},
      create: { partyId, characterId },
    });
  }

  revalidatePath("/");
  revalidatePath("/parties");
  revalidatePath(`/parties/${partyId}`);
}

export async function respondToInvitation(invitationId: string, accept: boolean) {
  const session = await requireSession();
  const invitation = await prisma.$transaction(async (tx) => {
    const invitation = await tx.characterInvitation.findFirst({
      where: { id: invitationId, character: { userId: session.user.id } },
      select: { id: true, partyId: true, characterId: true },
    });
    if (!invitation) throw new Error("Invitation not found");
    if (accept) {
      await tx.partyMember.upsert({
        where: { partyId_characterId: { partyId: invitation.partyId, characterId: invitation.characterId } },
        update: {},
        create: { partyId: invitation.partyId, characterId: invitation.characterId },
      });
    }
    await tx.characterInvitation.delete({ where: { id: invitation.id } });
    return invitation;
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
  revalidatePath("/");
  revalidatePath("/parties");
  revalidatePath(`/parties/${invitation.partyId}`);
}

export async function removeCharacter(partyId: string, memberId: string) {
  await requirePartyManager(partyId);

  await prisma.partyMember.delete({
    where: { id: memberId, partyId },
  });

  revalidatePath("/");
  revalidatePath("/parties");
  revalidatePath(`/parties/${partyId}`);
}

export async function updateHeadquarters(
  hqId: string,
  data: {
    name?: string;
    history?: string;
  }
) {
  const headquarters = await requireHeadquartersManager(hqId);

  const updated = await prisma.headquarters.update({
    where: { id: hqId },
    data: z.object({ name: z.string().trim().min(1).max(200).optional(), history: z.string().max(50000).optional() }).parse(data),
  });

  revalidatePath(`/parties/${headquarters.partyId}`);
  revalidatePath(`/parties/${headquarters.partyId}/hq`);
  return updated;
}

export async function buyUpgrade(
  hqId: string,
  type: UpgradeType,
  upgradeName: string,
) {
  const headquarters = await requireHeadquartersManager(hqId);
  const upgrade = getUpgrade(type, upgradeName);
  const result = await serializableTransaction(async (tx) => {
    const hq = await tx.headquarters.findUniqueOrThrow({ where: { id: hqId } });
    const currentList = Array.isArray(hq[type]) ? (hq[type] as Array<{ name?: string }>) : [];
    if (currentList.some((entry) => entry?.name === upgrade.name)) throw new Error("Upgrade already owned");
    const reserved = await tx.headquarters.updateMany({
      where: { id: hqId, developmentPoints: { gte: upgrade.cost } },
      data: { developmentPoints: { decrement: upgrade.cost } },
    });
    if (reserved.count !== 1) throw new Error("Insufficient Development Points");
    const triggeredThreat = rollThreatForUpgrade(upgrade.name, upgrade.cost);
    const threatList = toThreatList(hq.threats);
    const updatedHq = await tx.headquarters.update({
      where: { id: hqId },
      data: {
        [type]: [...currentList, upgrade],
        threats: triggeredThreat ? [...threatList, triggeredThreat] : threatList,
      },
    });
    await tx.headquartersLedgerEntry.create({ data: {
      headquartersId: hqId, points: -upgrade.cost,
      description: `Purchased ${upgrade.name}`, actorId: headquarters.session.user.id,
    } });
    return { ...updatedHq, threatTriggered: Boolean(triggeredThreat), triggeredThreat };
  });

  revalidatePath(`/parties/${headquarters.partyId}`);
  revalidatePath(`/parties/${headquarters.partyId}/hq`);

  return result;
}

export async function awardDevelopmentPoints(hqId: string, points: number, reason: string) {
  const headquarters = await requireHeadquartersManager(hqId);
  const award = z.object({ points: z.number().int().min(1).max(100), reason: z.string().trim().min(1).max(1000) }).parse({ points, reason });
  await serializableTransaction(async (tx) => {
    await tx.headquarters.update({ where: { id: hqId }, data: { developmentPoints: { increment: award.points } } });
    await tx.headquartersLedgerEntry.create({ data: {
      headquartersId: hqId, points: award.points, description: award.reason, actorId: headquarters.session.user.id,
    } });
  });
  revalidatePath("/");
  revalidatePath("/parties");
  revalidatePath(`/parties/${headquarters.partyId}/hq`);
}

export async function manageTask(
  partyId: string,
  taskId?: string,
  data?: { title: string; description: string; status: TaskStatus }
) {
  await requirePartyManager(partyId);

  const taskData = data ? z.object({
    title: z.string().trim().min(1).max(200),
    description: z.string().max(20000),
    status: z.nativeEnum(TaskStatus),
  }).parse(data) : undefined;

  if (taskId && !data) {
    await prisma.adventureTask.delete({ where: { id: taskId, partyId } });
  } else if (taskId && data) {
    await prisma.adventureTask.update({
      where: { id: taskId, partyId },
      data: taskData!,
    });
  } else if (data) {
    await prisma.adventureTask.create({
      data: {
        partyId,
        ...taskData!,
      },
    });
  }

  revalidatePath("/");
  revalidatePath(`/parties/${partyId}`);
  revalidatePath(`/parties/${partyId}/goals`);
}

export async function saveMapMarker(mapId: string, markers: Prisma.InputJsonValue) {
  const safeMarkers = z.array(z.object({ x: z.number().min(0).max(100), y: z.number().min(0).max(100), label: z.string().max(500) })).max(1000).parse(markers);
  const map = await prisma.gameMap.findUnique({
    where: { id: mapId },
    select: { id: true, partyId: true },
  });

  if (!map) {
    throw new Error("Map not found");
  }

  await requirePartyManager(map.partyId);

  const updated = await prisma.gameMap.update({
    where: { id: mapId },
    data: { markers: safeMarkers },
  });

  revalidatePath(`/parties/${map.partyId}/atlas`);
  return updated;
}

export async function createMap(partyId: string, name: string, imageUrl: string) {
  await requirePartyManager(partyId);
  name = z.string().trim().min(1).max(200).parse(name);
  imageUrl = z.string().max(2048).refine((url) => /^https?:\/\//i.test(url) || (url.startsWith("/") && !url.startsWith("//")), "Use an HTTP(S) URL or a local image path").parse(imageUrl);

  const map = await prisma.gameMap.create({
    data: {
      partyId,
      name,
      imageUrl,
    },
  });

  revalidatePath(`/parties/${partyId}/atlas`);
  return map;
}

export async function updatePartyNotes(partyId: string, notes: string) {
  await requirePartyManager(partyId);

  await prisma.party.update({
    where: { id: partyId },
    data: { notes: sanitizeNotes(z.string().max(100000).parse(notes)) },
  });

  revalidatePath(`/parties/${partyId}`);
  revalidatePath(`/parties/${partyId}/notes`);
}

export async function upsertPartyStashItem(
  partyId: string,
  itemId: string,
  quantity: number,
  notes?: string
) {
  await requirePartyManager(partyId);

  quantity = z.number().int().min(0).max(9999).parse(quantity);
  notes = z.string().max(10000).optional().parse(notes);
  if (quantity <= 0) {
    await prisma.partyStashItem.deleteMany({
      where: {
        partyId,
        itemId,
      },
    });
  } else {
    await prisma.partyStashItem.upsert({
      where: {
        partyId_itemId: {
          partyId,
          itemId,
        },
      },
      update: {
        quantity,
        notes: notes || null,
      },
      create: {
        partyId,
        itemId,
        quantity,
        notes: notes || null,
      },
    });
  }

  revalidatePath("/");
  revalidatePath(`/parties/${partyId}`);
  revalidatePath(`/parties/${partyId}/equipment`);
}

export async function removePartyStashItem(partyId: string, itemId: string) {
  await requirePartyManager(partyId);

  await prisma.partyStashItem.deleteMany({
    where: {
      partyId,
      itemId,
    },
  });

  revalidatePath(`/parties/${partyId}/equipment`);
}

export async function createMystery(
  partyId: string,
  data: { title: string; summary: string; hook?: string; status?: MysteryStatus }
) {
  await requirePartyManager(partyId);
  data = z.object({ title: z.string().trim().min(1).max(200), summary: z.string().trim().min(1).max(50000),
    hook: z.string().max(20000).optional(), status: z.nativeEnum(MysteryStatus).optional() }).parse(data);

  const mystery = await prisma.mystery.create({
    data: {
      partyId,
      title: data.title,
      summary: data.summary,
      hook: data.hook || null,
      status: data.status ?? "PREP",
    },
  });

  revalidatePath("/");
  revalidatePath(`/parties/${partyId}`);
  revalidatePath(`/parties/${partyId}/mysteries`);
  return mystery;
}

export async function updateMystery(
  mysteryId: string,
  data: {
    title?: string;
    summary?: string;
    hook?: string;
    aftermath?: string;
    status?: MysteryStatus;
  }
) {
  const mystery = await requireMysteryManager(mysteryId);

  data = z.object({ title: z.string().trim().min(1).max(200).optional(), summary: z.string().trim().min(1).max(50000).optional(),
    hook: z.string().max(20000).optional(), aftermath: z.string().max(50000).optional(), status: z.nativeEnum(MysteryStatus).optional() }).parse(data);
  const updated = await prisma.mystery.update({
    where: { id: mysteryId },
    data: {
      ...data,
      ...(data.status ? {
        completedAt: data.status === "RESOLVED" || data.status === "ARCHIVED" ? new Date() : null,
      } : {}),
    },
  });

  revalidatePath("/");
  revalidatePath(`/parties/${mystery.partyId}`);
  revalidatePath(`/parties/${mystery.partyId}/mysteries`);
  return updated;
}

export async function archiveMystery(mysteryId: string) {
  return updateMystery(mysteryId, { status: "ARCHIVED" });
}

export async function setMysteryVisibility(kind: "mystery" | "clue" | "entity" | "location", id: string, visible: boolean) {
  z.boolean().parse(visible);
  let mysteryId = id;
  if (kind === "clue") mysteryId = (await prisma.mysteryClue.findUniqueOrThrow({ where: { id } })).mysteryId;
  else if (kind === "entity") mysteryId = (await prisma.mysteryEntity.findUniqueOrThrow({ where: { id } })).mysteryId;
  else if (kind === "location") mysteryId = (await prisma.mysteryLocation.findUniqueOrThrow({ where: { id } })).mysteryId;
  else if (kind !== "mystery") throw new Error("Invalid visibility target");
  const mystery = await requireMysteryManager(mysteryId);
  if (kind === "mystery") await prisma.mystery.update({ where: { id }, data: { isPublished: visible } });
  else if (kind === "clue") await prisma.mysteryClue.update({ where: { id }, data: { isRevealed: visible } });
  else if (kind === "entity") await prisma.mysteryEntity.update({ where: { id }, data: { isRevealed: visible } });
  else await prisma.mysteryLocation.update({ where: { id }, data: { isRevealed: visible } });
  revalidatePath("/");
  revalidatePath(`/parties/${mystery.partyId}/mysteries`);
}

export async function addMysteryClue(mysteryId: string, content: string) {
  const mystery = await requireMysteryManager(mysteryId);

  await prisma.mysteryClue.create({
    data: {
      mysteryId,
      content,
    },
  });

  revalidatePath(`/parties/${mystery.partyId}/mysteries`);
}

export async function toggleMysteryClue(clueId: string, isResolved: boolean) {
  const clue = await prisma.mysteryClue.findUnique({
    where: { id: clueId },
    include: {
      mystery: {
        select: { partyId: true, id: true },
      },
    },
  });

  if (!clue) {
    throw new Error("Clue not found");
  }

  await requireMysteryManager(clue.mystery.id);

  await prisma.mysteryClue.update({
    where: { id: clueId },
    data: { isResolved },
  });

  revalidatePath(`/parties/${clue.mystery.partyId}/mysteries`);
}

export async function deleteMysteryClue(clueId: string) {
  const clue = await prisma.mysteryClue.findUnique({
    where: { id: clueId },
    include: {
      mystery: {
        select: { partyId: true, id: true },
      },
    },
  });

  if (!clue) {
    throw new Error("Clue not found");
  }

  await requireMysteryManager(clue.mystery.id);
  await prisma.mysteryClue.delete({ where: { id: clueId } });
  revalidatePath(`/parties/${clue.mystery.partyId}/mysteries`);
}

export async function addMysteryEntity(
  mysteryId: string,
  data: { name: string; type: MysteryEntityType; details?: string }
) {
  const mystery = await requireMysteryManager(mysteryId);

  await prisma.mysteryEntity.create({
    data: {
      mysteryId,
      name: data.name,
      type: data.type,
      details: data.details || null,
    },
  });

  revalidatePath(`/parties/${mystery.partyId}/mysteries`);
}

export async function deleteMysteryEntity(entityId: string) {
  const entity = await prisma.mysteryEntity.findUnique({
    where: { id: entityId },
    include: {
      mystery: {
        select: { partyId: true, id: true },
      },
    },
  });

  if (!entity) {
    throw new Error("Entity not found");
  }

  await requireMysteryManager(entity.mystery.id);
  await prisma.mysteryEntity.delete({ where: { id: entityId } });
  revalidatePath(`/parties/${entity.mystery.partyId}/mysteries`);
}

export async function addMysteryLocation(
  mysteryId: string,
  data: { name: string; details?: string }
) {
  const mystery = await requireMysteryManager(mysteryId);

  await prisma.mysteryLocation.create({
    data: {
      mysteryId,
      name: data.name,
      details: data.details || null,
    },
  });

  revalidatePath(`/parties/${mystery.partyId}/mysteries`);
}

export async function deleteMysteryLocation(locationId: string) {
  const location = await prisma.mysteryLocation.findUnique({
    where: { id: locationId },
    include: {
      mystery: {
        select: { partyId: true, id: true },
      },
    },
  });

  if (!location) {
    throw new Error("Location not found");
  }

  await requireMysteryManager(location.mystery.id);
  await prisma.mysteryLocation.delete({ where: { id: locationId } });
  revalidatePath(`/parties/${location.mystery.partyId}/mysteries`);
}
