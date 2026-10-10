import { z } from "zod";
import prisma from "./prisma";
import { getAppSession } from "./auth";

const schema = z.object({
  id: z.string().uuid(), expectedVersion: z.number().int().nonnegative(),
  confirmationName: z.string().trim().min(1).max(200), archived: z.boolean(),
}).strict();

export async function setCharacterArchived(input: unknown) {
  const session = await getAppSession();
  if (!session) throw new Error("Unauthorized");
  const data = schema.parse(input);
  return prisma.$transaction(async tx => {
    // Share this lock with sheet edits and advancement so removal cannot race a save.
    await tx.$queryRaw`SELECT id FROM "Character" WHERE id = ${data.id} FOR UPDATE`;
    const character = await tx.character.findUnique({ where: { id: data.id }, select: {
      id: true, name: true, userId: true, archivedAt: true, archiveVersion: true,
      parties: { select: { partyId: true } },
    } });
    if (!character) throw new Error("Character not found");
    if (session.user.role !== "ADMIN" && character.userId !== session.user.id) throw new Error("Only the owner or an administrator can remove or restore this character.");
    if (data.confirmationName !== character.name.trim()) throw new Error("Type the character's exact name to confirm.");
    if (character.archiveVersion !== data.expectedVersion || Boolean(character.archivedAt) === data.archived) throw new Error("This character's status changed. Reload before continuing.");
    await tx.character.update({ where: { id: character.id }, data: { archivedAt: data.archived ? new Date() : null, archiveVersion: { increment: 1 } } });
    return { id: character.id, partyIds: character.parties.map(member => member.partyId) };
  });
}
