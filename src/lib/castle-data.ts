import { CARRIED_TYPES } from "./equipment";
import prisma from "@/lib/prisma";
import { redirect } from "next/navigation";
import { getPartyAccess } from "@/lib/access";
import {
  HQ_UPGRADES,
  HQ_FACTS,
  DEVELOPMENT_QUESTIONS,
  THREAT_OPTIONS,
} from "@/lib/hq-upgrades";
import {
  missingRequirements,
  upgradeCost,
  storageCapacity,
} from "@/lib/hq-rules";
import type { CastleView } from "@/lib/castle-view";

export async function loadCastleView(id: string): Promise<CastleView> {
  const access = await getPartyAccess(id);
  const hq = await prisma.headquarters.findUnique({
    where: { partyId: id },
    include: {
      castleUpgrades: {
        orderBy: [{ category: "asc" }, { name: "asc" }, { ordinal: "asc" }],
      },
      discoveries: true,
      facts: true,
      ledgerEntries: { orderBy: { createdAt: "desc" }, take: 50 },
      reviews: {
        where: access.isGM
          ? {}
          : { mystery: { isPublished: true, status: { not: "PREP" } } },
      },
      sessions: {
        where: access.isGM
          ? {}
          : { mystery: { isPublished: true, status: { not: "PREP" } } },
      },
      castleThreats: {
        where: access.isGM ? {} : { id: "__not_visible__" },
        include: { purchase: { select: { successes: true } } },
        orderBy: { createdAt: "desc" },
      },
      occasions: {
        where: access.isGM ? {} : { id: "__not_visible__" },
        orderBy: { createdAt: "desc" },
        take: 20,
        include: {
          purchases: {
            include: { upgrade: { select: { name: true } } },
            orderBy: { createdAt: "asc" },
          },
        },
      },
    },
  });
  if (!hq) redirect(`/parties/${id}/management`);
  const members = await prisma.partyMember.findMany({
    where: { partyId: id },
    include: {
      character: {
        select: {
          id: true,
          name: true,
          resources: true,
          physicalConditions: true,
          mentalConditions: true,
          archetype: { select: { name: true } },
          skill: { select: { inspiration: true } },
          attribute: true,
        },
      },
    },
  });
  const mysteries = await prisma.mystery.findMany({
    where: {
      partyId: id,
      ...(access.isGM
        ? {}
        : { isPublished: true, status: { not: "PREP" as const } }),
    },
    select: { id: true, title: true, status: true },
    orderBy: { startedAt: "desc" },
  });
  const uses = await prisma.castleBenefitUse.findMany({
    where: {
      upgrade: { headquartersId: hq.id },
      mystery: { id: { in: mysteries.map((m) => m.id) } },
    },
    select: {
      id: true,
      upgradeId: true,
      mysteryId: true,
      characterId: true,
      channel: true,
      summary: true,
      effects: true,
      expired: true,
      sessionId: true,
    },
    orderBy: { createdAt: "desc" },
  });
  const stash = await prisma.partyStashItem.findMany({
    where: { partyId: id },
    select: { quantity: true, item: { select: { type: true } } },
  });
  const context = {
    owned: hq.castleUpgrades,
    members: members.map(({ character: c }) => ({
      resources: c.resources,
      archetype: c.archetype.name,
      inspiration: c.skill?.inspiration || 0,
    })),
    facts: hq.facts.map((f) => f.key),
  };
  const known = new Set(hq.castleUpgrades.map((u) => u.key));
  const catalogue = HQ_UPGRADES.filter(
    (u) => access.isGM || u.category !== "discovered" || known.has(u.key),
  ).map((u) => ({
    ...u,
    price: upgradeCost(u, context),
    missing: missingRequirements(u, context),
    count: hq.castleUpgrades.filter((row) => row.key === u.key).length,
    introduced: hq.discoveries.some((d) => d.key === u.key),
  }));
  const view: CastleView = {
    id: hq.id,
    partyId: id,
    name: hq.name,
    history: hq.history,
    developmentPoints: hq.developmentPoints,
    isGM: access.isGM,
    owned: hq.castleUpgrades.map(
      ({
        id,
        key,
        name,
        ordinal,
        category,
        status,
        legacy,
        personName,
        personDescription,
        stats,
        relationships,
        motivation,
        darkSecret,
      }) => ({
        id,
        key,
        name,
        ordinal,
        category,
        status,
        legacy,
        personName,
        personDescription,
        stats,
        relationships,
        ...(access.isGM ? { motivation, darkSecret } : {}),
      }),
    ),
    catalogue,
    discoveries: hq.discoveries.map((d) => ({
      id: d.id,
      key: access.isGM ? d.key : null,
      hint: d.hint,
      identified: d.identified,
    })),
    members: members.map(({ character: c }) => ({
      id: c.id,
      name: c.name,
      physicalBase:
        (c.attribute?.physique ?? 2) + (c.attribute?.precision ?? 2),
      mentalBase: (c.attribute?.logic ?? 2) + (c.attribute?.empathy ?? 2),
      conditions: [
        ...Object.entries(c.physicalConditions as Record<string, boolean>),
        ...Object.entries(c.mentalConditions as Record<string, boolean>),
      ]
        .filter(([key, marked]) => key !== "broken" && marked === true)
        .map(([key]) => key),
    })),
    mysteries,
    reviews: hq.reviews.map((r) => ({
      mysteryId: r.mysteryId,
      points: r.points,
      answers: r.answers as boolean[],
    })),
    uses,
    sessions: hq.sessions.map(({ id, mysteryId, name }) => ({
      id,
      mysteryId,
      name,
    })),
    threats: hq.castleThreats.map((t) => ({
      id: t.id,
      title: t.title,
      description: t.description,
      status: t.status,
      countdown: t.countdown as string[],
      step: t.step,
      successes: t.purchase?.successes ?? null,
    })),
    occasions: hq.occasions.map((o) => ({
      id: o.id,
      closedAt: o.closedAt?.toISOString() ?? null,
      purchases: o.purchases.map((p) => ({
        id: p.id,
        paidCost: p.paidCost,
        dice: p.dice,
        rolls: p.rolls as number[],
        successes: p.successes,
        name: p.upgrade.name,
      })),
    })),
    ledger: hq.ledgerEntries.map(({ id, points, description, createdAt }) => ({
      id,
      points,
      description: access.isGM
        ? description
        : description.split(" (GM exception:")[0],
      createdAt: createdAt.toISOString(),
    })),
    facts: access.isGM
      ? hq.facts.map(({ key, evidence }) => ({ key, evidence }))
      : [],
    questions: DEVELOPMENT_QUESTIONS,
    factOptions: access.isGM ? HQ_FACTS : {},
    threatOptions: access.isGM ? THREAT_OPTIONS : [],
    capacity: storageCapacity(hq.castleUpgrades),
    stash: {
      common: stash
        .filter((s) => s.item.type !== "MAGIC")
        .reduce((n, s) => n + s.quantity, 0),
      occult: stash
        .filter((s) => s.item.type === "MAGIC")
        .reduce((n, s) => n + s.quantity, 0),
    },
    items: access.isGM
      ? await prisma.item.findMany({
          where: { type: { in: [...CARRIED_TYPES] } },
          select: {
            id: true,
            name: true,
            type: true,
            availability: true,
            skill: true,
          },
          orderBy: { name: "asc" },
        })
      : [],
  };
  return view;
}
