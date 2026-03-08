"use server";

import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth";
import {
  MysteryEntityType,
  MysteryStatus,
  Prisma,
  TaskStatus,
} from "@prisma/client";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

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
  const session = await getServerSession(authOptions);

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

  if (session.user.role !== "ADMIN" && party.gmId !== session.user.id) {
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

  await requirePartyManager(headquarters.partyId);
  return headquarters;
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
  const rolls = Array.from({ length: Math.max(1, cost) }, () => Math.ceil(Math.random() * 6));
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
  await requirePartyManager(partyId);

  const character = await prisma.character.findUnique({
    where: { id: characterId },
    select: { id: true },
  });

  if (!character) {
    throw new Error("Character not found");
  }

  const member = await prisma.partyMember.create({
    data: {
      partyId,
      characterId,
    },
  });

  revalidatePath("/");
  revalidatePath("/parties");
  revalidatePath(`/parties/${partyId}`);
  return member;
}

export async function removeCharacter(partyId: string, memberId: string) {
  await requirePartyManager(partyId);

  await prisma.partyMember.delete({
    where: { id: memberId },
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
    threats?: Prisma.InputJsonValue;
    developmentPoints?: number;
  }
) {
  const headquarters = await requireHeadquartersManager(hqId);

  const updated = await prisma.headquarters.update({
    where: { id: hqId },
    data,
  });

  revalidatePath(`/parties/${headquarters.partyId}`);
  revalidatePath(`/parties/${headquarters.partyId}/hq`);
  return updated;
}

export async function buyUpgrade(
  hqId: string,
  type: "facilities" | "contacts" | "personnel",
  upgrade: { name: string; cost: number; description: string },
  cost: number
) {
  const headquarters = await requireHeadquartersManager(hqId);
  const hq = await prisma.headquarters.findUnique({ where: { id: hqId } });

  if (!hq || hq.developmentPoints < cost) {
    throw new Error("Insufficient Development Points");
  }

  const currentList = Array.isArray(hq[type]) ? (hq[type] as Array<{ name?: string }>) : [];
  if (currentList.some((entry) => entry?.name === upgrade.name)) {
    throw new Error("Upgrade already owned");
  }

  const triggeredThreat = rollThreatForUpgrade(upgrade.name, cost);
  const threatList = toThreatList(hq.threats);

  const updatedHq = await prisma.headquarters.update({
    where: { id: hqId },
    data: {
      developmentPoints: { decrement: cost },
      [type]: [...currentList, upgrade],
      threats: triggeredThreat ? [...threatList, triggeredThreat] : threatList,
    },
  });

  revalidatePath(`/parties/${headquarters.partyId}`);
  revalidatePath(`/parties/${headquarters.partyId}/hq`);

  return {
    ...updatedHq,
    threatTriggered: Boolean(triggeredThreat),
    triggeredThreat,
  };
}

export async function manageTask(
  partyId: string,
  taskId?: string,
  data?: { title: string; description: string; status: TaskStatus }
) {
  await requirePartyManager(partyId);

  if (taskId && !data) {
    await prisma.adventureTask.delete({ where: { id: taskId } });
  } else if (taskId && data) {
    await prisma.adventureTask.update({
      where: { id: taskId },
      data,
    });
  } else if (data) {
    await prisma.adventureTask.create({
      data: {
        partyId,
        ...data,
      },
    });
  }

  revalidatePath("/");
  revalidatePath(`/parties/${partyId}`);
  revalidatePath(`/parties/${partyId}/goals`);
}

export async function saveMapMarker(mapId: string, markers: Prisma.InputJsonValue) {
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
    data: { markers },
  });

  revalidatePath(`/parties/${map.partyId}/atlas`);
  return updated;
}

export async function createMap(partyId: string, name: string, imageUrl: string) {
  await requirePartyManager(partyId);

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
    data: { notes },
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

  const updated = await prisma.mystery.update({
    where: { id: mysteryId },
    data: {
      ...data,
      completedAt: data.status === "RESOLVED" || data.status === "ARCHIVED" ? new Date() : null,
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
