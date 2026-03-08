import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { ItemType, TalentType } from "@prisma/client";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import CharacterSheet from "./sheet";

const PHYSICAL_KEYS = ["exhausted", "battered", "wounded", "broken"] as const;
const MENTAL_KEYS = ["angry", "frightened", "hopeless", "broken"] as const;

type ConditionState = Record<string, boolean>;

function normalizeConditions(input: unknown, keys: readonly string[]): ConditionState {
  const source = typeof input === "object" && input !== null ? (input as Record<string, unknown>) : {};
  const normalized: ConditionState = {};

  for (const key of keys) {
    normalized[key] = Boolean(source[key]);
  }

  return normalized;
}

function parseStringArray(input: unknown): string[] {
  if (!Array.isArray(input)) {
    return [];
  }

  return input
    .map((value) => (typeof value === "string" ? value : null))
    .filter((value): value is string => Boolean(value));
}

function parseInsightsAfflictions(input: unknown): string[] {
  if (Array.isArray(input)) {
    return input
      .map((entry) => (typeof entry === "string" ? entry.trim() : ""))
      .filter(Boolean);
  }

  if (typeof input === "object" && input !== null) {
    return Object.values(input)
      .flatMap((value) => {
        if (Array.isArray(value)) {
          return value;
        }

        return [value];
      })
      .map((entry) => (typeof entry === "string" ? entry.trim() : ""))
      .filter(Boolean);
  }

  return [];
}

export default async function CharacterSheetPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await getServerSession(authOptions);
  if (!session) {
    redirect("/login");
  }

  const { id } = await params;

  const character = await prisma.character.findUnique({
    where: { id },
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
    redirect("/");
  }

  const isOwner = character.userId === session.user.id;
  const isAdmin = session.user.role === "ADMIN";

  let isGmWithAccess = false;
  if (!isOwner && !isAdmin && session.user.role === "GM") {
    const gmPartyLink = await prisma.partyMember.findFirst({
      where: {
        characterId: character.id,
        party: {
          gmId: session.user.id,
        },
      },
      select: { id: true },
    });

    isGmWithAccess = Boolean(gmPartyLink);
  }

  if (!isOwner && !isAdmin && !isGmWithAccess) {
    redirect("/");
  }

  const canEdit = isOwner || isAdmin || isGmWithAccess;

  const talentIds = parseStringArray(character.talents);
  const talents =
    talentIds.length > 0
      ? await prisma.talent.findMany({
          where: { id: { in: talentIds } },
          select: { id: true, name: true, description: true, type: true },
        })
      : [];

  const inventory = character.inventory.map((entry) => ({
    id: entry.id,
    quantity: entry.quantity,
    notes: entry.notes,
    item: {
      id: entry.item.id,
      name: entry.item.name,
      type: entry.item.type as ItemType,
      description: entry.item.description,
      bonus: entry.item.bonus,
      availability: entry.item.availability,
      damage: entry.item.damage,
      range: entry.item.range,
      skill: entry.item.skill,
    },
  }));

  return (
    <div className="min-h-screen px-3 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-[1500px]">
        <CharacterSheet
          characterId={character.id}
          canEdit={canEdit}
          name={character.name}
          ageGroup={character.ageGroup}
          archetypeName={character.archetype.name}
          motivation={character.motivation}
          trauma={character.trauma}
          darkSecret={character.darkSecret}
          memento={character.memento}
          resources={character.resources}
          capital={character.capital}
          notes={character.notes ?? ""}
          relationships={character.relationships ?? ""}
          experiencePoints={character.experiencePoints}
          physicalConditions={normalizeConditions(character.physicalConditions, PHYSICAL_KEYS)}
          mentalConditions={normalizeConditions(character.mentalConditions, MENTAL_KEYS)}
          attributes={{
            physique: character.attribute?.physique ?? 2,
            precision: character.attribute?.precision ?? 2,
            logic: character.attribute?.logic ?? 2,
            empathy: character.attribute?.empathy ?? 2,
          }}
          skills={{
            agility: character.skill?.agility ?? 0,
            closeCombat: character.skill?.closeCombat ?? 0,
            force: character.skill?.force ?? 0,
            medicine: character.skill?.medicine ?? 0,
            rangedCombat: character.skill?.rangedCombat ?? 0,
            stealth: character.skill?.stealth ?? 0,
            investigation: character.skill?.investigation ?? 0,
            learning: character.skill?.learning ?? 0,
            vigilance: character.skill?.vigilance ?? 0,
            inspiration: character.skill?.inspiration ?? 0,
            manipulation: character.skill?.manipulation ?? 0,
            observation: character.skill?.observation ?? 0,
          }}
          talents={talents.map((talent) => ({
            id: talent.id,
            name: talent.name,
            description: talent.description,
            type: talent.type as TalentType,
          }))}
          inventory={inventory}
          insightsAfflictions={parseInsightsAfflictions(character.insightsDefects)}
        />
      </div>
    </div>
  );
}
