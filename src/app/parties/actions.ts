"use strict";

import prisma from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { AdventureTask, ItemType, TaskStatus } from "@prisma/client";

export async function createParty(name: string, gmId: string) {
  const party = await prisma.$transaction(async (tx) => {
    const p = await tx.party.create({
      data: {
        name,
        gmId,
      },
    });

    await tx.headquarters.create({
      data: {
        partyId: p.id,
        name: "Castle Gyllencreutz",
        history: "A centuries-old fortification in Upsala.",
        developmentPoints: 0,
      },
    });

    return p;
  });

  revalidatePath(`/parties`);
  return party;
}

export async function enrollCharacter(partyId: string, characterId: string) {
  const member = await prisma.partyMember.create({
    data: {
      partyId,
      characterId,
    },
  });

  revalidatePath(`/parties/${partyId}`);
  return member;
}

export async function removeCharacter(partyId: string, memberId: string) {
  await prisma.partyMember.delete({
    where: { id: memberId },
  });

  revalidatePath(`/parties/${partyId}`);
}

export async function updateHeadquarters(
  hqId: string,
  data: {
    name?: string;
    description?: string;
    history?: string;
    threats?: any;
    developmentPoints?: number;
  }
) {
  const hq = await prisma.headquarters.update({
    where: { id: hqId },
    data,
  });

  revalidatePath(`/parties/${hq.partyId}`);
  return hq;
}

export async function buyUpgrade(
  hqId: string,
  type: "facilities" | "contacts" | "personnel",
  upgrade: any,
  cost: number
) {
  const hq = await prisma.headquarters.findUnique({ where: { id: hqId } });
  if (!hq || hq.developmentPoints < cost) {
    throw new Error("Insufficient Development Points");
  }

  const currentList = (hq[type] as any[]) || [];
  
  const updatedHq = await prisma.headquarters.update({
    where: { id: hqId },
    data: {
      developmentPoints: { decrement: cost },
      [type]: [...currentList, upgrade],
    },
  });

  revalidatePath(`/parties/${updatedHq.partyId}`);
  return updatedHq;
}

export async function manageTask(
  partyId: string,
  taskId?: string,
  data?: { title: string; description: string; status: TaskStatus }
) {
  if (taskId && !data) {
    // Delete
    await prisma.adventureTask.delete({ where: { id: taskId } });
  } else if (taskId && data) {
    // Update
    await prisma.adventureTask.update({
      where: { id: taskId },
      data,
    });
  } else if (data) {
    // Create
    await prisma.adventureTask.create({
      data: {
        partyId,
        ...data,
      },
    });
  }

  revalidatePath(`/parties/${partyId}`);
}

export async function saveMapMarker(mapId: string, markers: any) {
  const map = await prisma.gameMap.update({
    where: { id: mapId },
    data: { markers },
  });

  revalidatePath(`/parties/${map.partyId}`);
  return map;
}

export async function createMap(partyId: string, name: string, imageUrl: string) {
  const map = await prisma.gameMap.create({
    data: {
      partyId,
      name,
      imageUrl,
    },
  });

  revalidatePath(`/parties/${partyId}`);
  return map;
}

export async function updatePartyNotes(partyId: string, notes: string) {
  await prisma.party.update({
    where: { id: partyId },
    data: { notes },
  });
  revalidatePath(`/parties/${partyId}`);
}
