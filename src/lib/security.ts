type Actor = { id: string; role: string };

export function canManageParty(actor: Actor, gmId: string) {
  return actor.role === "ADMIN" || (actor.role === "GM" && actor.id === gmId);
}

export function isSessionCurrent(
  token: { role?: string; sessionVersion?: number; invalid?: boolean },
  user: { role: string; sessionVersion: number } | null,
) {
  return Boolean(user && !token.invalid && token.role === user.role &&
    token.sessionVersion === user.sessionVersion);
}

export const publicUserSelect = {
  id: true, name: true, email: true, role: true, createdAt: true,
} as const;

export const partyCharacterSelect = {
  id: true, userId: true, name: true, physicalConditions: true,
  mentalConditions: true, archetype: { select: { name: true } },
} as const;
