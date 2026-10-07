import { redirect } from "next/navigation";
import prisma from "@/lib/prisma";
import { getAppSession } from "@/lib/auth";
import { canManageParty, partyCharacterSelect, publicUserSelect } from "./security";

export async function getRequiredSession() {
  const session = await getAppSession();

  if (!session) {
    redirect("/login");
  }

  return session;
}

export async function requireAdminSession() {
  const session = await getRequiredSession();

  if (session.user.role !== "ADMIN") {
    redirect("/");
  }

  return session;
}

export async function getPartyAccess(partyId: string) {
  const session = await getRequiredSession();

  const party = await prisma.party.findUnique({
    where: { id: partyId },
    include: {
      gm: { select: publicUserSelect },
      members: {
        include: {
          character: { select: partyCharacterSelect },
        },
      },
      headquarters: true,
    },
  });

  if (!party) {
    redirect("/parties");
  }

  const isAdmin = session.user.role === "ADMIN";
  const isGM = canManageParty(session.user, party.gmId);
  const isMember = party.members.some((member) => member.character.userId === session.user.id);

  if (!isAdmin && !isGM && !isMember) {
    redirect("/");
  }

  return {
    session,
    party,
    isAdmin,
    isGM: isGM || isAdmin,
    isMember,
  };
}

export async function getCharacterAccess(characterId: string) {
  const session = await getRequiredSession();

  const character = await prisma.character.findUnique({
    where: { id: characterId },
    include: {
      archetype: true,
      attribute: true,
      skill: true,
      inventory: {
        include: {
          item: true,
        },
      },
    },
  });

  if (!character) {
    redirect("/characters");
  }

  const isAdmin = session.user.role === "ADMIN";
  const isOwner = character.userId === session.user.id;
  const gmMembership = isOwner || isAdmin || session.user.role !== "GM" ? null : await prisma.partyMember.findFirst({
    where: {
      characterId,
      party: {
        gmId: session.user.id,
      },
    },
    select: { id: true },
  });

  if (!isAdmin && !isOwner && !gmMembership) {
    redirect("/");
  }

  return {
    session,
    character,
    isOwner,
    isAdmin,
    isGM: Boolean(gmMembership) || isAdmin,
  };
}
