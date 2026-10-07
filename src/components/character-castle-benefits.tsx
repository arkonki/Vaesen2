"use client";
import Link from "next/link";
import DiceRollerModal from "./dice-roller-modal";
export type CharacterCastleBenefit = {
  id: string;
  partyId: string;
  mysteryId: string;
  mystery: string;
  summary: string;
  active: boolean;
  resources?: number;
  capital?: number;
  advantage?: string;
  freeSuccess?: string;
  journalBonus?: number;
  recovery?: { domain: string; bonus?: number; push?: boolean };
};
export default function CharacterCastleBenefits({
  benefits,
  physicalBase,
  mentalBase,
}: {
  benefits: CharacterCastleBenefit[];
  physicalBase: number;
  mentalBase: number;
}) {
  if (!benefits.length) return null;
  const grouped = benefits.reduce<Record<string, CharacterCastleBenefit[]>>(
    (groups, benefit) => {
      const key = `${benefit.partyId}:${benefit.mysteryId}`;
      (groups[key] ||= []).push(benefit);
      return groups;
    },
    {},
  );
  return (
    <section className="ledger-panel p-4 sm:p-6 my-6 space-y-4">
      <h2 className="text-2xl font-bold">Castle Benefits</h2>
      <p>
        Temporary benefits do not change permanent Resources, Capital or skill
        ratings. Advantages and free successes apply only in the described
        circumstances.
      </p>
      {Object.entries(grouped).map(([key, rows]) => {
        const list = rows || [];
        return (
          <div
            key={key}
            className="space-y-2 border-t border-[var(--ledger-line)] pt-3"
          >
            <h3 className="font-bold">{list[0]?.mystery}</h3>
            {list.map((b) => (
              <p key={b.id}>
                {b.summary}
                {b.active && b.resources ? ` / +${b.resources} Resources` : ""}
                {b.active && b.capital ? ` / +${b.capital} Capital` : ""}
                {b.active && b.advantage ? ` / Advantage: ${b.advantage}` : ""}
                {b.freeSuccess
                  ? ` / Recorded free success: ${b.freeSuccess}`
                  : ""}
                {b.active && b.journalBonus
                  ? " / Relevant journal clues: +1 Investigation or Observation"
                  : ""}
              </p>
            ))}
            <div className="flex flex-wrap gap-3">
              {(["physical", "mental"] as const).map((domain) => {
                const recovery = list.filter(
                  (b) => b.recovery?.domain === domain,
                );
                if (!recovery.length) return null;
                const bonus = recovery.reduce(
                  (n, b) => n + (b.recovery?.bonus || 0),
                  0,
                );
                const push = recovery.some((b) => b.recovery?.push);
                return (
                  <DiceRollerModal
                    key={domain}
                    initialDiceCount={
                      (domain === "physical" ? physicalBase : mentalBase) +
                      bonus
                    }
                    title={`${domain} recovery (conditions ignored)`}
                    triggerLabel={`${domain} recovery: +${bonus}, push ${push ? "yes" : "no"}`}
                    allowPush={push}
                  />
                );
              })}
              <Link
                className="underline"
                href={`/parties/${list[0]?.partyId}/hq`}
              >
                Open castle
              </Link>
            </div>
          </div>
        );
      })}
    </section>
  );
}
