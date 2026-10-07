"use server";

import { revalidatePath } from "next/cache";
import { Prisma, ItemType } from "@prisma/client";
import { z } from "zod";
import prisma from "@/lib/prisma";
import { getAppSession } from "@/lib/auth";
import { canManageParty } from "@/lib/security";
import { serializableTransaction } from "@/lib/transaction";
import {
  HQ_FACTS,
  HQ_UPGRADES,
  upgradeByKey,
  type Benefit,
} from "@/lib/hq-upgrades";
import {
  missingRequirements,
  upgradeCost,
  threatRoll,
  validatePersonnelStats,
  healConditions,
  type CastleContext,
} from "@/lib/hq-rules";

async function manager(hqId: string) {
  const session = await getAppSession();
  if (!session) throw new Error("Unauthorized");
  const hq = await prisma.headquarters.findUniqueOrThrow({
    where: { id: hqId },
    select: { partyId: true, party: { select: { gmId: true } } },
  });
  if (!canManageParty(session.user, hq.party.gmId))
    throw new Error("Forbidden");
  return { actorId: session.user.id, partyId: hq.partyId };
}
function refresh(partyId: string) {
  revalidatePath("/");
  revalidatePath(`/parties/${partyId}/hq`);
  revalidatePath(`/parties/${partyId}/equipment`);
}
async function context(
  tx: Prisma.TransactionClient,
  hqId: string,
  partyId: string,
): Promise<CastleContext> {
  const owned = await tx.castleUpgrade.findMany({
    where: { headquartersId: hqId },
  });
  const members = await tx.partyMember.findMany({
    where: { partyId },
    include: { character: { include: { archetype: true, skill: true } } },
  });
  const facts = await tx.castleFact.findMany({
    where: { headquartersId: hqId },
  });
  return {
    owned,
    members: members.map(({ character: c }) => ({
      resources: c.resources,
      archetype: c.archetype.name,
      inspiration: c.skill?.inspiration || 0,
    })),
    facts: facts.map((f) => f.key),
  };
}

const purchaseSchema = z.object({
  key: z.string().max(100),
  requestId: z.string().uuid(),
  overrideReason: z.string().trim().min(5).max(1000).optional(),
  personName: z.string().trim().min(1).max(200).optional(),
  personDescription: z.string().trim().min(1).max(2000).optional(),
});
export async function purchaseCastleUpgrade(hqId: string, input: unknown) {
  const { actorId, partyId } = await manager(hqId);
  const data = purchaseSchema.parse(input);
  const spec = upgradeByKey(data.key);
  if (spec.starting)
    throw new Error("Starting assets are granted free, not purchased");
  if (
    ["contacts", "personnel"].includes(spec.category) &&
    (!data.personName || !data.personDescription)
  )
    throw new Error("Give this person a name and description");
  const result = await serializableTransaction(async (tx) => {
    const previous = await tx.castlePurchase.findUnique({
      where: { requestId: data.requestId },
      include: { upgrade: true },
    });
    if (previous) {
      if (
        previous.upgrade.headquartersId !== hqId ||
        previous.upgrade.key !== data.key
      )
        throw new Error("Request identifier already used");
      return previous;
    }
    const current = await context(tx, hqId, partyId);
    const owned = await tx.castleUpgrade.findMany({
      where: { headquartersId: hqId, key: data.key },
    });
    if (spec.max !== null && owned.length >= spec.max)
      throw new Error("Maximum upgrade level already owned");
    const missing = missingRequirements(spec, current);
    if (
      spec.category === "discovered" &&
      !owned.length &&
      !(await tx.castleDiscovery.findUnique({
        where: { headquartersId_key: { headquartersId: hqId, key: data.key } },
      }))
    )
      missing.push("The GM must introduce this discovery");
    if (missing.length && !data.overrideReason)
      throw new Error(`Prerequisites: ${missing.join("; ")}`);
    const paidCost = upgradeCost(spec, current);
    const balance = await tx.headquarters.updateMany({
      where: { id: hqId, developmentPoints: { gte: paidCost } },
      data: { developmentPoints: { decrement: paidCost } },
    });
    if (balance.count !== 1) throw new Error("Insufficient Development Points");
    let occasion = await tx.castleOccasion.findFirst({
      where: { headquartersId: hqId, closedAt: null },
    });
    if (!occasion)
      occasion = await tx.castleOccasion.create({
        data: { headquartersId: hqId },
      });
    const earlierPurchases = await tx.castlePurchase.count({
      where: { occasionId: occasion.id },
    });
    const roll = threatRoll(paidCost, earlierPurchases);
    const upgrade = await tx.castleUpgrade.create({
      data: {
        headquartersId: hqId,
        key: spec.key,
        ordinal: Math.max(0, ...owned.map((u) => u.ordinal)) + 1,
        name: spec.name,
        category: spec.category,
        description: spec.description,
        personName: data.personName,
        personDescription: data.personDescription,
      },
    });
    const purchase = await tx.castlePurchase.create({
      data: {
        occasionId: occasion.id,
        upgradeId: upgrade.id,
        requestId: data.requestId,
        paidCost,
        ...roll,
        actorId,
        overrideReason: data.overrideReason,
      },
    });
    if (roll.successes)
      await tx.castleThreat.create({
        data: {
          headquartersId: hqId,
          purchaseId: purchase.id,
          title: `Choose a threat after ${spec.name}`,
        },
      });
    await tx.headquartersLedgerEntry.create({
      data: {
        headquartersId: hqId,
        points: -paidCost,
        description: `Purchased ${spec.name}${data.overrideReason ? ` (GM exception: ${data.overrideReason})` : ""}`,
        actorId,
      },
    });
    if (spec.category === "discovered")
      await tx.castleDiscovery.updateMany({
        where: { headquartersId: hqId, key: spec.key },
        data: { identified: true },
      });
    return purchase;
  });
  refresh(partyId);
  return result;
}
export async function closeCastleOccasion(hqId: string) {
  const { partyId } = await manager(hqId);
  await serializableTransaction(async (tx) => {
    await tx.castleOccasion.updateMany({
      where: { headquartersId: hqId, closedAt: null },
      data: { closedAt: new Date() },
    });
  });
  refresh(partyId);
}
export async function introduceCastleDiscovery(hqId: string, key: string) {
  const { partyId } = await manager(hqId);
  const spec = upgradeByKey(key);
  if (!spec.discovery)
    throw new Error("This upgrade is not a discovered facility");
  await prisma.castleDiscovery.upsert({
    where: { headquartersId_key: { headquartersId: hqId, key } },
    update: {},
    create: { headquartersId: hqId, key, hint: spec.discovery },
  });
  refresh(partyId);
}
export async function recordCastleFact(
  hqId: string,
  key: string,
  evidence: string,
) {
  const { actorId, partyId } = await manager(hqId);
  if (!(key in HQ_FACTS)) throw new Error("Unknown campaign fact");
  evidence = z.string().trim().min(5).max(2000).parse(evidence);
  await prisma.castleFact.upsert({
    where: { headquartersId_key: { headquartersId: hqId, key } },
    update: { evidence, actorId },
    create: { headquartersId: hqId, key, evidence, actorId },
  });
  refresh(partyId);
}
export async function reviewCastleDevelopment(
  hqId: string,
  mysteryId: string,
  answers: unknown,
) {
  const { actorId, partyId } = await manager(hqId);
  const checked = z.array(z.boolean()).length(8).parse(answers);
  const points = checked.filter(Boolean).length;
  await serializableTransaction(async (tx) => {
    const mystery = await tx.mystery.findFirst({
      where: {
        id: mysteryId,
        partyId,
        status: { in: ["RESOLVED", "ARCHIVED"] },
      },
    });
    if (!mystery)
      throw new Error(
        "Complete a mystery in this party before reviewing development",
      );
    if (await tx.castleDevelopmentReview.findUnique({ where: { mysteryId } }))
      throw new Error("Development already reviewed for this mystery");
    await tx.castleDevelopmentReview.create({
      data: {
        headquartersId: hqId,
        mysteryId,
        answers: checked,
        points,
        actorId,
      },
    });
    await tx.headquarters.update({
      where: { id: hqId },
      data: { developmentPoints: { increment: points } },
    });
    await tx.headquartersLedgerEntry.create({
      data: {
        headquartersId: hqId,
        points,
        description: "Mystery development review",
        actorId,
      },
    });
  });
  refresh(partyId);
}
export async function updateCastleThreat(
  hqId: string,
  threatId: string,
  input: unknown,
) {
  const { partyId } = await manager(hqId);
  const data = z
    .object({
      title: z.string().trim().min(1).max(200),
      description: z.string().max(10000),
      status: z.enum(["ACTIVE", "RESOLVED"]),
      countdown: z.array(z.string().trim().min(1).max(2000)).max(20),
      step: z.number().int().min(0).max(20),
    })
    .parse(input);
  if (data.step > data.countdown.length)
    throw new Error("Countdown step exceeds the number of stages");
  await prisma.castleThreat.update({
    where: { id: threatId, headquartersId: hqId },
    data,
  });
  refresh(partyId);
}
export async function createCastleThreat(hqId: string, title: string) {
  const { partyId } = await manager(hqId);
  await prisma.castleThreat.create({
    data: {
      headquartersId: hqId,
      title: z.string().trim().min(1).max(200).parse(title),
      status: "ACTIVE",
    },
  });
  refresh(partyId);
}
export async function updateCastleUpgrade(
  hqId: string,
  upgradeId: string,
  input: unknown,
) {
  const { partyId } = await manager(hqId);
  const data = z
    .object({
      personName: z.string().trim().min(1).max(200).optional(),
      personDescription: z.string().trim().min(1).max(2000).optional(),
      motivation: z.string().max(2000).optional(),
      darkSecret: z.string().max(2000).optional(),
      relationships: z.string().max(5000).optional(),
      stats: z.unknown().optional(),
      status: z.enum(["ACTIVE", "DAMAGED"]).optional(),
      canonicalKey: z.string().max(100).optional(),
    })
    .parse(input);
  await serializableTransaction(async (tx) => {
    const upgrade = await tx.castleUpgrade.findFirstOrThrow({
      where: { id: upgradeId, headquartersId: hqId },
    });
    const spec = HQ_UPGRADES.find(
      (u) => u.key === (data.canonicalKey || upgrade.key),
    );
    if (!spec && data.status === "ACTIVE")
      throw new Error(
        "Map this legacy upgrade to the catalogue before activating it",
      );
    if (data.canonicalKey && spec) {
      const others = await tx.castleUpgrade.findMany({
        where: { headquartersId: hqId, key: spec.key, id: { not: upgradeId } },
      });
      if (spec.max !== null && others.length >= spec.max)
        throw new Error("Maximum upgrade level already owned");
      await tx.castleUpgrade.update({
        where: { id: upgradeId },
        data: {
          key: spec.key,
          name: spec.name,
          category: spec.category,
          legacy: false,
          status: "ACTIVE",
          ordinal: Math.max(0, ...others.map((u) => u.ordinal)) + 1,
        },
      });
    }
    await tx.castleUpgrade.update({
      where: { id: upgradeId },
      data: {
        ...(data.personName ? { personName: data.personName } : {}),
        ...(data.personDescription
          ? { personDescription: data.personDescription }
          : {}),
        ...(data.status ? { status: data.status } : {}),
        ...(data.motivation !== undefined
          ? { motivation: data.motivation }
          : {}),
        ...(data.darkSecret !== undefined
          ? { darkSecret: data.darkSecret }
          : {}),
        ...(data.relationships !== undefined
          ? { relationships: data.relationships }
          : {}),
        ...(data.stats !== undefined && spec
          ? { stats: validatePersonnelStats(spec, data.stats) }
          : {}),
      },
    });
  });
  refresh(partyId);
}
export async function createCastleSession(
  hqId: string,
  mysteryId: string,
  name: string,
) {
  const { partyId } = await manager(hqId);
  name = z.string().trim().min(1).max(200).parse(name);
  const mystery = await prisma.mystery.findFirst({
    where: { id: mysteryId, partyId, status: { not: "ARCHIVED" } },
  });
  if (!mystery) throw new Error("Mystery not found in this party");
  const session = await prisma.castleSession.upsert({
    where: {
      headquartersId_mysteryId_name: { headquartersId: hqId, mysteryId, name },
    },
    update: {},
    create: { headquartersId: hqId, mysteryId, name },
  });
  refresh(partyId);
  return session.id;
}
const useSchema = z.object({
  upgradeId: z.string().uuid(),
  mysteryId: z.string().uuid(),
  channel: z.enum(["function", "asset"]),
  requestId: z.string().uuid(),
  characterId: z.string().uuid().optional(),
  sessionId: z.string().uuid().optional(),
  notes: z.string().trim().min(1).max(2000),
  option: z.string().max(200).optional(),
  itemId: z.string().uuid().optional(),
  physical: z
    .array(z.enum(["exhausted", "battered", "wounded"]))
    .max(3)
    .optional(),
  mental: z
    .array(z.enum(["angry", "frightened", "hopeless"]))
    .max(3)
    .optional(),
  repairId: z.string().uuid().optional(),
  healingChoices: z
    .array(
      z.object({
        characterId: z.string().uuid(),
        physical: z.array(z.enum(["exhausted", "battered", "wounded"])).max(3),
        mental: z.array(z.enum(["angry", "frightened", "hopeless"])).max(3),
      }),
    )
    .max(100)
    .optional(),
});
export async function activateCastleBenefit(hqId: string, input: unknown) {
  const { partyId } = await manager(hqId);
  const data = useSchema.parse(input);
  await serializableTransaction(async (tx) => {
    const previous = await tx.castleBenefitUse.findUnique({
      where: { requestId: data.requestId },
      include: { upgrade: true },
    });
    if (previous) {
      if (
        previous.upgrade.headquartersId !== hqId ||
        previous.upgradeId !== data.upgradeId ||
        previous.mysteryId !== data.mysteryId ||
        previous.channel !== data.channel
      )
        throw new Error("Request identifier already used");
      return;
    }
    const mystery = await tx.mystery.findFirst({
      where: { id: data.mysteryId, partyId, status: { not: "ARCHIVED" } },
    });
    if (!mystery) throw new Error("Mystery not found in this party");
    const upgrade = await tx.castleUpgrade.findFirstOrThrow({
      where: { id: data.upgradeId, headquartersId: hqId, status: "ACTIVE" },
    });
    const spec = upgradeByKey(upgrade.key);
    const benefit: Benefit | undefined = spec[data.channel];
    if (!benefit) throw new Error("No such benefit");
    if (
      spec.storage ||
      ([
        "difference-engine",
        "gamekeeper",
        "stable-boy",
        "gardener",
        "algot-frisk",
      ].includes(spec.key) &&
        data.channel === "function")
    )
      throw new Error("This is a passive castle benefit");
    if (
      ["contacts", "personnel"].includes(spec.category) &&
      (!upgrade.personName || !upgrade.personDescription)
    )
      throw new Error(
        "Name and describe this person before using their benefits",
      );
    if (spec.personnelStats) validatePersonnelStats(spec, upgrade.stats);
    if (
      spec.key === "recruit" &&
      (!upgrade.motivation?.trim() ||
        !upgrade.darkSecret?.trim() ||
        !upgrade.relationships?.trim())
    )
      throw new Error(
        "Give the recruit a GM-only motivation, Dark Secret and shared relationships first",
      );
    const members = await tx.partyMember.findMany({
      where: { partyId },
      include: { character: true },
    });
    if (!members.length) throw new Error("This party has no investigators");
    if (
      data.characterId &&
      !members.some((m) => m.characterId === data.characterId)
    )
      throw new Error("Character is not in this party");
    const group = benefit.scope === "group" || benefit.scope === "session";
    if (!group && !data.characterId) throw new Error("Choose an investigator");
    let useKey = benefit.scope === "character" ? data.characterId! : "group";
    if (benefit.scope === "session") {
      const session = await tx.castleSession.findFirst({
        where: {
          id: data.sessionId || "",
          headquartersId: hqId,
          mysteryId: mystery.id,
        },
      });
      if (!session) throw new Error("Choose a recorded gaming session");
      useKey = session.id;
      // The Annals are a party-wide benefit even if a legacy castle has duplicate copies.
      if (
        await tx.castleBenefitUse.findFirst({
          where: {
            sessionId: session.id,
            upgrade: { key: "annals", headquartersId: hqId },
          },
        })
      )
        throw new Error("This session already received Annals XP");
    }
    if (
      await tx.castleBenefitUse.findUnique({
        where: {
          upgradeId_mysteryId_channel_useKey: {
            upgradeId: upgrade.id,
            mysteryId: mystery.id,
            channel: data.channel,
            useKey,
          },
        },
      })
    )
      throw new Error("Benefit already used for this mystery");
    if (benefit.advantage && !benefit.advantage.includes(data.option || ""))
      throw new Error("Choose a listed advantage");
    if (
      (benefit.resources ||
        benefit.capital ||
        benefit.advantage ||
        benefit.equipment) &&
      mystery.status === "RESOLVED"
    )
      throw new Error(
        "Preparation benefits require an upcoming or active mystery",
      );
    if (benefit.equipment && mystery.status !== "PREP")
      throw new Error("Equipment is provided during preparation");
    const effects: Record<string, Prisma.InputJsonValue> = {};
    if (benefit.resources) {
      effects.resources = benefit.resources;
      effects.duration = spec.key === "banker" ? "scene" : "mystery";
    }
    if (benefit.capital) effects.capital = benefit.capital;
    if (benefit.recovery) effects.recovery = benefit.recovery;
    if (benefit.advantage) effects.advantage = data.option!;
    if (benefit.freeSuccess) effects.freeSuccess = benefit.freeSuccess;
    if (spec.key === "forgotten-gallery" && data.channel === "asset")
      effects.journalBonus = 1;
    const targets = group
      ? members.map((m) => m.character)
      : members
          .filter((m) => m.characterId === data.characterId)
          .map((m) => m.character);
    const use = await tx.castleBenefitUse.create({
      data: {
        upgradeId: upgrade.id,
        mysteryId: mystery.id,
        channel: data.channel,
        useKey,
        requestId: data.requestId,
        characterId: group ? null : data.characterId,
        sessionId: benefit.scope === "session" ? data.sessionId : undefined,
        summary: `${spec.name}: ${data.notes}`,
        effects,
      },
    });
    if (benefit.healing) {
      if (
        data.healingChoices &&
        (new Set(data.healingChoices.map((c) => c.characterId)).size !==
          data.healingChoices.length ||
          data.healingChoices.some(
            (c) => !targets.some((t) => t.id === c.characterId),
          ))
      )
        throw new Error("Invalid treatment targets");
      for (const c of targets) {
        const heal = benefit.healing;
        const choice = data.healingChoices?.find(
          (choice) => choice.characterId === c.id,
        );
        const chosenPhysical =
          choice?.physical ?? (group ? undefined : data.physical);
        const chosenMental =
          choice?.mental ?? (group ? undefined : data.mental);
        const selectionCount =
          (chosenPhysical?.length || 0) + (chosenMental?.length || 0);
        if (heal.domain === "both" && selectionCount > heal.count)
          throw new Error("Choose at most two conditions in total");
        // Explicit selections preserve the group's choice; omitted selections use marked-condition order.
        let remaining = heal.count;
        const physical =
          heal.domain !== "mental"
            ? healConditions(
                c.physicalConditions,
                remaining,
                heal.broken,
                chosenPhysical,
              )
            : c.physicalConditions;
        if (heal.domain === "both") {
          const before = c.physicalConditions as Record<string, boolean>;
          remaining -= Object.keys(physical as object).filter(
            (key) =>
              key !== "broken" &&
              before[key] &&
              !(physical as Record<string, boolean>)[key],
          ).length;
        }
        const mental =
          heal.domain !== "physical"
            ? healConditions(
                c.mentalConditions,
                remaining,
                heal.broken,
                chosenMental,
              )
            : c.mentalConditions;
        await tx.character.update({
          where: { id: c.id },
          data: {
            physicalConditions: physical as Prisma.InputJsonValue,
            mentalConditions: mental as Prisma.InputJsonValue,
          },
        });
      }
    }
    if (spec.key === "annals")
      await tx.character.updateMany({
        where: { id: { in: targets.map((c) => c.id) } },
        data: { experiencePoints: { increment: 1 } },
      });
    if (spec.key === "caretaker") {
      if (!data.repairId) throw new Error("Choose a damaged facility");
      const repaired = await tx.castleUpgrade.updateMany({
        where: {
          id: data.repairId,
          headquartersId: hqId,
          category: { in: ["facilities", "discovered"] },
          status: "DAMAGED",
        },
        data: { status: "ACTIVE" },
      });
      if (repaired.count !== 1) throw new Error("Damaged facility not found");
    }
    if (benefit.equipment) {
      if (!data.itemId)
        throw new Error(
          "Select a database item; the GM confirms its narrative suitability",
        );
      const item = await tx.item.findUniqueOrThrow({
        where: { id: data.itemId },
      });
      const rule = benefit.equipment;
      if (rule.types && !rule.types.includes(item.type))
        throw new Error("Wrong item type");
      let availability = rule.availability;
      if (
        spec.key === "shooting-range" &&
        (await tx.castleUpgrade.findFirst({
          where: { headquartersId: hqId, key: "gamekeeper", status: "ACTIVE" },
        }))
      )
        availability = 4;
      if (
        availability !== undefined &&
        (item.availability < 1 || item.availability > availability)
      )
        throw new Error("Item availability is too high or unset");
      const skill = item.skill?.replace(/\s/g, "").toLowerCase();
      if (rule.skill && skill !== rule.skill.toLowerCase())
        throw new Error("Choose a weapon for the required skill");
      if (
        spec.key === "armory" &&
        item.type === ItemType.WEAPON &&
        skill !== "closecombat"
      )
        throw new Error("Armory supplies melee weapons or armor");
      if (
        rule.names &&
        !rule.names.some(
          (name) => name.toLowerCase() === item.name.toLowerCase(),
        )
      )
        throw new Error("Item is not supplied by this upgrade");
      if (
        spec.key === "stable" &&
        item.name.toLowerCase() === "strong horse" &&
        !(await tx.castleUpgrade.findFirst({
          where: { headquartersId: hqId, key: "stable-boy", status: "ACTIVE" },
        }))
      )
        throw new Error("Strong horses require Stable Boy");
      const quantity =
        spec.key === "gardener" && item.name.toLowerCase() === "weak poison"
          ? 3
          : rule.quantity || 1;
      await tx.castlePreparedItem.createMany({
        data: targets.map((c) => ({
          useId: use.id,
          characterId: c.id,
          itemId: item.id,
          quantity,
        })),
      });
    }
  });
  const members = await prisma.partyMember.findMany({
    where: { partyId },
    select: { characterId: true },
  });
  for (const m of members) revalidatePath(`/characters/${m.characterId}`);
  refresh(partyId);
}
export async function expireCastleSceneBenefit(hqId: string, useId: string) {
  const { partyId } = await manager(hqId);
  await serializableTransaction(async (tx) => {
    const use = await tx.castleBenefitUse.findFirstOrThrow({
      where: { id: useId, upgrade: { headquartersId: hqId, key: "banker" } },
    });
    await tx.castleBenefitUse.update({
      where: { id: use.id },
      data: { expired: true },
    });
    if (use.characterId) revalidatePath(`/characters/${use.characterId}`);
  });
  refresh(partyId);
}

export async function reviewCastleStorage(hqId: string, input: unknown) {
  const { partyId, actorId } = await manager(hqId);
  const rows = z
    .array(
      z.object({
        id: z.string().uuid(),
        quantity: z.number().int().min(0).max(9999),
      }),
    )
    .max(500)
    .parse(input);
  if (new Set(rows.map((r) => r.id)).size !== rows.length)
    throw new Error("Duplicate storage rows");
  await serializableTransaction(async (tx) => {
    const stash = await tx.partyStashItem.findMany({
      where: { partyId },
      include: { item: true },
    });
    if (rows.some((r) => !stash.some((s) => s.id === r.id)))
      throw new Error("Stash row is not in this party");
    const owned = await tx.castleUpgrade.findMany({
      where: { headquartersId: hqId },
    });
    const { storageCapacity } = await import("@/lib/hq-rules");
    const capacity = storageCapacity(owned);
    let common = 0;
    let occult = 0;
    for (const entry of stash) {
      const retainedQuantity =
        rows.find((r) => r.id === entry.id)?.quantity ?? entry.retainedQuantity;
      if (retainedQuantity > entry.quantity)
        throw new Error("Cannot retain more items than the stash contains");
      if (entry.item.type === "MAGIC") occult += retainedQuantity;
      else common += retainedQuantity;
    }
    if (common > capacity.common || occult > capacity.occult)
      throw new Error("Retained items exceed active castle storage capacity");
    for (const row of rows)
      await tx.partyStashItem.update({
        where: { id: row.id, partyId },
        data: { retainedQuantity: row.quantity },
      });
    await tx.headquartersLedgerEntry.create({
      data: {
        headquartersId: hqId,
        points: 0,
        actorId,
        description: `Reviewed castle storage: ${common} common, ${occult} occult items retained`,
      },
    });
  });
  refresh(partyId);
}

export async function refreshCastleDashboard(partyId: string) {
  const { loadCastleView } = await import("@/lib/castle-data");
  return loadCastleView(partyId);
}
