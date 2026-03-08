import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import prisma from "@/lib/prisma";
import { authOptions } from "@/lib/auth";

export async function getRequiredSession() {
  const session = await getServerSession(authOptions);

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
      gm: true,
      members: {
        include: {
          character: {
            include: {
              archetype: true,
            },
          },
        },
      },
      headquarters: true,
    },
  });

  if (!party) {
    redirect("/parties");
  }

  const isAdmin = session.user.role === "ADMIN";
  const isGM = party.gmId === session.user.id;
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
  const gmMembership = isOwner || isAdmin ? null : await prisma.partyMember.findFirst({
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
