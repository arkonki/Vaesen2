"use client";

import { useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import type { CastleView } from "@/lib/castle-view";
import type { UpgradeOption, Benefit } from "@/lib/hq-upgrades";
import {
  purchaseCastleUpgrade,
  closeCastleOccasion,
  introduceCastleDiscovery,
  recordCastleFact,
  reviewCastleDevelopment,
  updateCastleThreat,
  createCastleThreat,
  updateCastleUpgrade,
  createCastleSession,
  activateCastleBenefit,
  expireCastleSceneBenefit,
  refreshCastleDashboard,
} from "../../castle-actions";
import { updateHeadquarters, awardDevelopmentPoints } from "../../actions";
import DiceRollerModal from "@/components/dice-roller-modal";

type Run = (label: string, action: () => Promise<unknown>) => Promise<void>;
const field = "ledger-input w-full";
function Panel({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="ledger-panel p-4 sm:p-6 space-y-4 min-w-0">
      <h2 className="text-xl font-bold">{title}</h2>
      {children}
    </section>
  );
}
function Button({
  children,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type="button"
      className="ledger-roll-trigger disabled:opacity-50"
      {...props}
    >
      {children}
    </button>
  );
}
export default function HQDashboard({
  view: initialView,
}: {
  view: CastleView;
}) {
  const [view, setView] = useState(initialView);
  const router = useRouter();
  const [tab, setTab] = useState("Castle");
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [mysteryId, setMysteryId] = useState(
    view.mysteries.find((m) => m.status === "PREP" || m.status === "ACTIVE")
      ?.id ||
      view.mysteries[0]?.id ||
      "",
  );
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("all");
  const run: Run = async (label, action) => {
    if (busy) return;
    setBusy(label);
    setError("");
    setNotice("");
    try {
      await action();
      setView(await refreshCastleDashboard(initialView.partyId));
      router.refresh();
      setNotice(`${label} saved.`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "The operation failed.");
    } finally {
      setBusy("");
    }
  };
  const tabs = [
    "Castle",
    "Catalogue",
    "Benefits",
    "Development",
    ...(view.isGM ? ["Threats"] : []),
    "History",
  ];
  const uses = view.uses.filter((u) => u.mysteryId === mysteryId);
  return (
    <div className="castle-dashboard space-y-6">
      <header className="ledger-panel p-5 sm:p-8 flex flex-wrap justify-between gap-4 items-end">
        <div>
          <p className="ledger-kicker">The Society / Upsala</p>
          <h1 className="text-3xl sm:text-4xl font-bold">{view.name}</h1>
          <p className="mt-2 text-[var(--ledger-ink-soft)]">
            A home, a refuge, and a castle full of secrets.
          </p>
        </div>
        <div className="text-right">
          <strong className="text-4xl text-[var(--ledger-accent)]">
            {view.developmentPoints}
          </strong>
          <p>Development Points</p>
        </div>
      </header>
      <nav aria-label="Castle sections" className="ledger-tabs">
        {tabs.map((t) => (
          <Button key={t} aria-pressed={tab === t} onClick={() => setTab(t)}>
            {t}
          </Button>
        ))}
      </nav>
      <div aria-live="polite">
        {busy && <p>Saving {busy.toLowerCase()}...</p>}
        {notice && <p>{notice}</p>}
      </div>
      {error && (
        <p
          role="alert"
          className="ledger-panel p-4 text-[var(--ledger-danger)]"
        >
          {error}
        </p>
      )}
      <fieldset
        disabled={!!busy}
        className="min-w-0 space-y-6 disabled:opacity-75"
      >
        {tab === "Castle" && (
          <>
            <div className="grid gap-5 lg:grid-cols-2">
              <Panel title="Castle Assets">
                <p>
                  {view.owned.filter((u) => u.status === "ACTIVE").length}{" "}
                  active upgrade levels. Starting Library and Algot Frisk are
                  free.
                </p>
                <p>
                  Common storage:{" "}
                  <strong>
                    {view.stash.common} / {view.capacity.common}
                  </strong>
                  . Occult storage:{" "}
                  <strong>
                    {view.stash.occult} / {view.capacity.occult}
                  </strong>
                  .
                </p>
                {(view.stash.common > view.capacity.common ||
                  view.stash.occult > view.capacity.occult) && (
                  <p className="text-[var(--ledger-danger)]">
                    The stash exceeds between-mystery storage. Review retention
                    with the GM; nothing is removed automatically.
                  </p>
                )}
                <Link
                  className="underline"
                  href={`/parties/${view.partyId}/equipment`}
                >
                  Review shared equipment
                </Link>
              </Panel>
              <Panel title="Exploration">
                {view.discoveries
                  .filter((d) => !d.identified)
                  .map((d) => (
                    <p
                      key={d.id}
                      className="border-l-2 border-[var(--ledger-accent)] pl-3"
                    >
                      {d.hint}
                    </p>
                  ))}
                {!view.discoveries.some((d) => !d.identified) && (
                  <p>No unexplored discoveries have been introduced.</p>
                )}
                <p>
                  Discovery prompts are shared by the GM. The facility&apos;s
                  identity becomes known after purchase.
                </p>
              </Panel>
            </div>
            <Panel title="Owned Facilities, Contacts & Personnel">
              <div className="grid gap-4 md:grid-cols-2">
                {view.owned.map((owned) => (
                  <OwnedCard
                    key={owned.id}
                    owned={owned}
                    spec={view.catalogue.find((u) => u.key === owned.key)}
                    view={view}
                    run={run}
                  />
                ))}
              </div>
            </Panel>
          </>
        )}
        {tab === "Catalogue" && (
          <>
            <Panel title="Expand the Castle">
              <div className="flex flex-wrap gap-3">
                <label className="flex-[1_1_15rem]">
                  Search upgrades
                  <input
                    className={field}
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
                </label>
                <label>
                  Category
                  <select
                    className={field}
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                  >
                    <option value="all">All categories</option>
                    {["facilities", "discovered", "contacts", "personnel"].map(
                      (c) => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      ),
                    )}
                  </select>
                </label>
              </div>
              {view.isGM && (
                <div className="flex flex-wrap gap-3 items-center">
                  <p>
                    Purchase occasion:{" "}
                    {view.occasions.find((o) => !o.closedAt)?.purchases
                      .length || 0}{" "}
                    purchases. Each later purchase adds another threat die.
                  </p>
                  <Button
                    onClick={() =>
                      run("Purchase occasion", () =>
                        closeCastleOccasion(view.id),
                      )
                    }
                  >
                    End Upgrade Occasion
                  </Button>
                </div>
              )}
              <p className="text-sm">
                Prerequisites use investigators&apos; permanent statistics, not
                temporary bonuses. GM exceptions require a recorded reason.
              </p>
            </Panel>
            <div className="grid gap-4 md:grid-cols-2">
              {view.catalogue
                .filter(
                  (u) =>
                    (category === "all" || u.category === category) &&
                    `${u.name} ${u.function?.text} ${u.asset?.text}`
                      .toLowerCase()
                      .includes(search.toLowerCase()),
                )
                .map((spec) => (
                  <PurchaseCard
                    key={spec.key}
                    spec={spec}
                    view={view}
                    run={run}
                  />
                ))}
            </div>
          </>
        )}
        {tab === "Benefits" && (
          <>
            <Panel title="Mystery & Preparation">
              <label>
                Mystery
                <select
                  className={field}
                  value={mysteryId}
                  onChange={(e) => setMysteryId(e.target.value)}
                >
                  <option value="">Choose a mystery</option>
                  {view.mysteries
                    .filter((m) => m.status !== "ARCHIVED")
                    .map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.title} ({m.status})
                      </option>
                    ))}
                </select>
              </label>
              <p>
                Functions and assets are tracked separately. Most are once per
                mystery per level; Infirmary, Chapel and Treasure Chamber are
                once per investigator. Annals XP is once per recorded gaming
                session.
              </p>
              {view.isGM && mysteryId && (
                <SessionForm view={view} mysteryId={mysteryId} run={run} />
              )}
            </Panel>
            {mysteryId && (
              <>
                <Panel title="Recovery Rolls">
                  <p>
                    Conditions do not reduce recovery pools. Use successes to
                    heal Defects or make Insights permanent; adjudicate and
                    record those outcomes on the character sheet.
                  </p>
                  <div className="grid gap-4 sm:grid-cols-2">
                    {view.members.map((m) => {
                      const relevant = uses.filter(
                        (u) =>
                          !u.expired &&
                          (!u.characterId || u.characterId === m.id),
                      );
                      const bonus = (domain: string) =>
                        relevant.reduce((sum, u) => {
                          const e = u.effects as {
                            recovery?: { domain: string; bonus?: number };
                          };
                          return (
                            sum +
                            (e.recovery?.domain === domain
                              ? e.recovery.bonus || 0
                              : 0)
                          );
                        }, 0);
                      const push = (domain: string) =>
                        relevant.some(
                          (u) =>
                            (
                              u.effects as {
                                recovery?: { domain: string; push?: boolean };
                              }
                            ).recovery?.domain === domain &&
                            (u.effects as { recovery?: { push?: boolean } })
                              .recovery?.push,
                        );
                      return (
                        <div
                          className="border border-[var(--ledger-line)] p-3 space-y-2"
                          key={m.id}
                        >
                          <h3 className="font-bold">{m.name}</h3>
                          {(["physical", "mental"] as const).map((domain) => (
                            <div key={domain}>
                              <p>
                                {domain}:{" "}
                                {domain === "physical"
                                  ? m.physicalBase
                                  : m.mentalBase}{" "}
                                + {bonus(domain)} dice. Push:{" "}
                                {push(domain) ? "allowed" : "not granted"}.
                              </p>
                              <DiceRollerModal
                                initialDiceCount={
                                  (domain === "physical"
                                    ? m.physicalBase
                                    : m.mentalBase) + bonus(domain)
                                }
                                title={`${m.name}: ${domain} recovery`}
                                triggerLabel={`Roll ${domain} recovery`}
                                allowPush={push(domain)}
                              />
                            </div>
                          ))}
                        </div>
                      );
                    })}
                  </div>
                </Panel>
                <div className="grid gap-4 md:grid-cols-2">
                  {view.owned
                    .filter((u) => u.status === "ACTIVE")
                    .map((owned) => {
                      const spec = view.catalogue.find(
                        (u) => u.key === owned.key,
                      );
                      return (
                        spec && (
                          <Panel
                            key={owned.id}
                            title={`${spec.name} / level ${owned.ordinal}`}
                          >
                            {(["function", "asset"] as const).map(
                              (channel) =>
                                spec[channel] && (
                                  <BenefitForm
                                    key={`${channel}:${mysteryId}`}
                                    view={view}
                                    ownedId={owned.id}
                                    spec={spec}
                                    benefit={spec[channel]!}
                                    channel={channel}
                                    mysteryId={mysteryId}
                                    run={run}
                                  />
                                ),
                            )}
                          </Panel>
                        )
                      );
                    })}
                </div>
                <Panel title="Benefit Journal">
                  {uses.map((u) => (
                    <div
                      key={u.id}
                      className="border-b border-[var(--ledger-line)] pb-3"
                    >
                      <p>
                        {u.summary}
                        {u.expired ? " (ended)" : ""}
                      </p>
                      {view.isGM &&
                        !u.expired &&
                        (u.effects as { duration?: string }).duration ===
                          "scene" && (
                          <Button
                            onClick={() =>
                              run("Scene benefit", () =>
                                expireCastleSceneBenefit(view.id, u.id),
                              )
                            }
                          >
                            End Scene Effect
                          </Button>
                        )}
                    </div>
                  ))}
                  {!uses.length && (
                    <p>No benefits recorded for this mystery.</p>
                  )}
                </Panel>
              </>
            )}
          </>
        )}
        {tab === "Development" && (
          <>
            {view.isGM && <DevelopmentForm view={view} run={run} />}
            <Panel title="Mystery Development Reviews">
              {view.reviews.map((r) => (
                <p key={r.mysteryId}>
                  {view.mysteries.find((m) => m.id === r.mysteryId)?.title ||
                    "Completed mystery"}
                  : +{r.points} DP
                </p>
              ))}
              {!view.reviews.length && <p>No completed development reviews.</p>}
            </Panel>
            {view.isGM && (
              <>
                <FactForm view={view} run={run} />
                <AdjustmentForm view={view} run={run} />
              </>
            )}
          </>
        )}
        {tab === "Threats" && view.isGM && (
          <>
            <Panel title="For the Gamemaster Only">
              <p>
                Threat successes create a pending decision, not a randomly
                assigned adversary. Choose a book-inspired threat or write your
                own; extra successes may inform its strength.
              </p>
              <Button
                onClick={() =>
                  run("Custom threat", () =>
                    createCastleThreat(view.id, "New castle threat"),
                  )
                }
              >
                Add Custom Threat
              </Button>
            </Panel>
            {view.threats.map((threat) => (
              <ThreatForm
                key={threat.id}
                threat={threat}
                view={view}
                run={run}
              />
            ))}
            <Panel title="Hidden Purchase Rolls">
              {view.occasions.map((o) => (
                <div key={o.id}>
                  <h3 className="font-bold">
                    {o.closedAt ? "Closed occasion" : "Current occasion"}
                  </h3>
                  {o.purchases.map((p) => (
                    <p key={p.id}>
                      {p.name}: {p.paidCost} DP, {p.dice} dice [
                      {p.rolls.join(", ")}], {p.successes} successes.
                    </p>
                  ))}
                </div>
              ))}
            </Panel>
          </>
        )}
        {tab === "History" && (
          <>
            <Panel title="Castle History">
              <HistoryForm view={view} run={run} />
            </Panel>
            <Panel title="Development Point Ledger">
              {view.ledger.map((e) => (
                <div
                  className="border-b border-[var(--ledger-line)] py-2"
                  key={e.id}
                >
                  <strong>
                    {e.points >= 0 ? "+" : ""}
                    {e.points} DP
                  </strong>{" "}
                  {e.description}
                  <p className="text-sm">
                    {new Date(e.createdAt).toLocaleDateString()}
                  </p>
                </div>
              ))}
              {!view.ledger.length && <p>No transactions recorded.</p>}
            </Panel>
          </>
        )}
      </fieldset>
    </div>
  );
}
function PurchaseCard({
  spec,
  view,
  run,
}: {
  spec: CastleView["catalogue"][number];
  view: CastleView;
  run: Run;
}) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [exception, setException] = useState("");
  const full = spec.max !== null && spec.count >= spec.max;
  return (
    <Panel title={spec.name}>
      <p className="text-sm uppercase tracking-wide">
        {spec.category} / book p. {spec.page}
      </p>
      <p>
        <strong>{spec.price} DP</strong>
        {spec.price !== spec.cost
          ? ` (base ${spec.cost}, Difference Engine discount)`
          : ""}{" "}
        / {spec.count} owned{spec.max ? ` / max ${spec.max}` : " / repeatable"}
      </p>
      {spec.function && (
        <p>
          <strong>Function:</strong> {spec.function.text}
        </p>
      )}
      {spec.asset && (
        <p>
          <strong>Asset:</strong> {spec.asset.text}
        </p>
      )}
      {spec.missing.length > 0 && (
        <p className="text-[var(--ledger-danger)]">
          Requires: {spec.missing.join("; ")}.
        </p>
      )}
      {view.isGM && spec.discovery && !spec.introduced && !spec.count && (
        <Button
          onClick={() =>
            run("Discovery", () => introduceCastleDiscovery(view.id, spec.key))
          }
        >
          Introduce Discovery
        </Button>
      )}
      {view.isGM && !full && !spec.starting && (
        <form
          className="space-y-3"
          onSubmit={(e) => {
            e.preventDefault();
            run("Upgrade purchase", () =>
              purchaseCastleUpgrade(view.id, {
                key: spec.key,
                requestId: crypto.randomUUID(),
                ...(name ? { personName: name } : {}),
                ...(description ? { personDescription: description } : {}),
                ...(exception ? { overrideReason: exception } : {}),
              }),
            );
          }}
        >
          {["contacts", "personnel"].includes(spec.category) && (
            <>
              <label>
                Name
                <input
                  className={field}
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  maxLength={200}
                />
              </label>
              <label>
                Description
                <textarea
                  className={field}
                  required
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  maxLength={2000}
                />
              </label>
            </>
          )}
          {(spec.missing.length > 0 ||
            (spec.discovery && !spec.introduced && !spec.count)) && (
            <label>
              Optional GM exception (audited)
              <input
                className={field}
                minLength={5}
                maxLength={1000}
                value={exception}
                onChange={(e) => setException(e.target.value)}
              />
            </label>
          )}
          <Button
            type="submit"
            disabled={
              view.developmentPoints < spec.price ||
              ((spec.missing.length > 0 ||
                (!!spec.discovery && !spec.introduced && !spec.count)) &&
                exception.trim().length < 5)
            }
          >
            Purchase for {spec.price} DP
          </Button>
        </form>
      )}
      {(full || spec.starting) && (
        <p>Owned{spec.starting ? " starting asset" : " at maximum level"}.</p>
      )}
    </Panel>
  );
}
function personnelTemplate(spec?: UpgradeOption) {
  const rules = spec?.personnelStats;
  if (!rules) return {};
  const attributes: Record<string, number> = {
    physique: 1,
    precision: 1,
    logic: 1,
    empathy: 1,
  };
  let remaining = rules.attributes - 4;
  for (const key of Object.keys(attributes)) {
    const extra = Math.min(remaining, rules.attributeMax - 1);
    attributes[key] += extra;
    remaining -= extra;
  }
  const skills: Record<string, number> = {};
  remaining = rules.skills;
  for (const key of rules.allowedSkills || [
    "agility",
    "closeCombat",
    "force",
    "medicine",
    "rangedCombat",
    "stealth",
    "investigation",
    "learning",
    "vigilance",
    "inspiration",
    "manipulation",
    "observation",
  ]) {
    skills[key] = Math.min(remaining, rules.skillMax);
    remaining -= skills[key];
  }
  return { attributes, skills };
}
function OwnedCard({
  owned,
  spec,
  view,
  run,
}: {
  owned: CastleView["owned"][number];
  spec?: UpgradeOption;
  view: CastleView;
  run: Run;
}) {
  const [name, setName] = useState(owned.personName || "");
  const [description, setDescription] = useState(owned.personDescription || "");
  const [motivation, setMotivation] = useState(owned.motivation || "");
  const [darkSecret, setDarkSecret] = useState(owned.darkSecret || "");
  const [relationships, setRelationships] = useState(owned.relationships || "");
  const [stats, setStats] = useState(
    JSON.stringify(
      Object.keys(owned.stats as object).length
        ? owned.stats
        : personnelTemplate(spec),
      null,
      2,
    ),
  );
  const [mapping, setMapping] = useState("");
  return (
    <div className="border border-[var(--ledger-line)] p-4 space-y-3 min-w-0">
      <h3 className="font-bold text-lg">
        {owned.name} / {owned.ordinal}
      </h3>
      <p>
        {owned.status}
        {owned.legacy ? " / imported legacy asset" : ""}
      </p>
      {owned.personName && (
        <p>
          {owned.personName}: {owned.personDescription}
        </p>
      )}
      {owned.relationships && <p>Relationships: {owned.relationships}</p>}
      {view.isGM && owned.status === "REVIEW" && (
        <>
          <label>
            Map legacy asset to
            <select
              className={field}
              value={mapping}
              onChange={(e) => setMapping(e.target.value)}
            >
              <option value="">Choose canonical upgrade</option>
              {view.catalogue.map((u) => (
                <option key={u.key} value={u.key}>
                  {u.name}
                </option>
              ))}
            </select>
          </label>
          <Button
            disabled={!mapping}
            onClick={() =>
              run("Legacy mapping", () =>
                updateCastleUpgrade(view.id, owned.id, {
                  canonicalKey: mapping,
                }),
              )
            }
          >
            Confirm Ownership Mapping
          </Button>
        </>
      )}
      {view.isGM &&
        spec &&
        ["contacts", "personnel"].includes(owned.category) && (
          <form
            className="space-y-3"
            onSubmit={(e) => {
              e.preventDefault();
              run("Person profile", () =>
                updateCastleUpgrade(view.id, owned.id, {
                  personName: name,
                  personDescription: description,
                  motivation,
                  darkSecret,
                  relationships,
                  ...(spec.personnelStats ? { stats: JSON.parse(stats) } : {}),
                }),
              );
            }}
          >
            <label>
              Name
              <input
                className={field}
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </label>
            <label>
              Description
              <textarea
                className={field}
                required
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </label>
            {spec.personnelStats && (
              <>
                <p>
                  Attributes: {spec.personnelStats.attributes} points, max{" "}
                  {spec.personnelStats.attributeMax}. Skills:{" "}
                  {spec.personnelStats.skills} points, max{" "}
                  {spec.personnelStats.skillMax}. Toughness{" "}
                  {spec.personnelStats.physicalToughness}/
                  {spec.personnelStats.mentalToughness}.
                  {spec.personnelStats.allowedSkills
                    ? ` Allowed skills: ${spec.personnelStats.allowedSkills.join(", ")}.`
                    : ""}
                  {spec.personnelStats.physicalSkills
                    ? " Coachman requires two Physique-based skills."
                    : ""}
                </p>
                <label>
                  Statistics JSON (attributes and skills objects)
                  <textarea
                    className={`${field} font-mono text-sm`}
                    rows={8}
                    value={stats}
                    onChange={(e) => setStats(e.target.value)}
                  />
                </label>
              </>
            )}
            <label>
              Relationships
              <textarea
                className={field}
                value={relationships}
                onChange={(e) => setRelationships(e.target.value)}
              />
            </label>
            {spec.key === "recruit" && (
              <>
                <label>
                  Motivation (GM only)
                  <textarea
                    className={field}
                    value={motivation}
                    onChange={(e) => setMotivation(e.target.value)}
                  />
                </label>
                <label>
                  Dark Secret (GM only)
                  <textarea
                    className={field}
                    value={darkSecret}
                    onChange={(e) => setDarkSecret(e.target.value)}
                  />
                </label>
              </>
            )}
            <Button type="submit">Save Person</Button>
          </form>
        )}
      {view.isGM &&
        ["facilities", "discovered"].includes(owned.category) &&
        owned.status !== "REVIEW" && (
          <Button
            onClick={() =>
              run("Facility status", () =>
                updateCastleUpgrade(view.id, owned.id, {
                  status: owned.status === "ACTIVE" ? "DAMAGED" : "ACTIVE",
                }),
              )
            }
          >
            {owned.status === "ACTIVE" ? "Mark Damaged" : "GM Restore Facility"}
          </Button>
        )}
    </div>
  );
}
function SessionForm({
  view,
  mysteryId,
  run,
}: {
  view: CastleView;
  mysteryId: string;
  run: Run;
}) {
  const [name, setName] = useState("");
  return (
    <form
      className="flex flex-wrap gap-3 items-end"
      onSubmit={(e) => {
        e.preventDefault();
        run("Gaming session", () =>
          createCastleSession(view.id, mysteryId, name),
        );
      }}
    >
      <label className="flex-[1_1_12rem]">
        Gaming session label
        <input
          required
          className={field}
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Session 4 - 12 October"
        />
      </label>
      <Button type="submit">Record Session</Button>
    </form>
  );
}
function BenefitForm({
  view,
  ownedId,
  spec,
  benefit,
  channel,
  mysteryId,
  run,
}: {
  view: CastleView;
  ownedId: string;
  spec: UpgradeOption;
  benefit: Benefit;
  channel: "function" | "asset";
  mysteryId: string;
  run: Run;
}) {
  const [characterId, setCharacterId] = useState("");
  const [notes, setNotes] = useState("");
  const [option, setOption] = useState("");
  const [itemId, setItemId] = useState("");
  const [sessionId, setSessionId] = useState("");
  const [repairId, setRepairId] = useState("");
  const [healing, setHealing] = useState<string[]>([]);
  const [groupHealing, setGroupHealing] = useState<Record<string, string[]>>(
    {},
  );
  const group = benefit.scope === "group" || benefit.scope === "session";
  const passive =
    !!spec.storage ||
    ([
      "difference-engine",
      "gamekeeper",
      "stable-boy",
      "gardener",
      "algot-frisk",
    ].includes(spec.key) &&
      channel === "function");
  const used = view.uses.some(
    (u) =>
      u.upgradeId === ownedId &&
      u.mysteryId === mysteryId &&
      u.channel === channel &&
      (benefit.scope === "character"
        ? u.characterId === characterId
        : benefit.scope === "session"
          ? u.sessionId === sessionId
          : true),
  );
  return (
    <div className="space-y-2 border-t border-[var(--ledger-line)] pt-3">
      <p>
        <strong>{channel === "function" ? "Function" : "Asset"}:</strong>{" "}
        {benefit.text}
      </p>
      {passive && (
        <p className="text-sm">Passive benefit; no activation is needed.</p>
      )}
      {view.isGM && !passive && (
        <form
          className="space-y-3"
          onSubmit={(e) => {
            e.preventDefault();
            run("Castle benefit", () =>
              activateCastleBenefit(view.id, {
                upgradeId: ownedId,
                mysteryId,
                channel,
                requestId: crypto.randomUUID(),
                notes,
                ...(!group && characterId ? { characterId } : {}),
                ...(sessionId ? { sessionId } : {}),
                ...(option ? { option } : {}),
                ...(itemId ? { itemId } : {}),
                ...(repairId ? { repairId } : {}),
                ...(Object.keys(groupHealing).length
                  ? {
                      healingChoices: Object.entries(groupHealing).map(
                        ([characterId, conditions]) => ({
                          characterId,
                          physical: conditions.filter((c) =>
                            ["exhausted", "battered", "wounded"].includes(c),
                          ),
                          mental: conditions.filter((c) =>
                            ["angry", "frightened", "hopeless"].includes(c),
                          ),
                        }),
                      ),
                    }
                  : {}),
                ...(healing.length
                  ? {
                      physical: healing.filter((c) =>
                        ["exhausted", "battered", "wounded"].includes(c),
                      ),
                      mental: healing.filter((c) =>
                        ["angry", "frightened", "hopeless"].includes(c),
                      ),
                    }
                  : {}),
              }),
            );
          }}
        >
          {!group && (
            <label>
              Investigator
              <select
                className={field}
                required
                value={characterId}
                onChange={(e) => setCharacterId(e.target.value)}
              >
                <option value="">Choose investigator</option>
                {view.members.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name}
                  </option>
                ))}
              </select>
            </label>
          )}
          {benefit.scope === "session" && (
            <label>
              Session
              <select
                className={field}
                required
                value={sessionId}
                onChange={(e) => setSessionId(e.target.value)}
              >
                <option value="">Choose recorded session</option>
                {view.sessions
                  .filter((s) => s.mysteryId === mysteryId)
                  .map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
              </select>
            </label>
          )}
          {benefit.advantage && (
            <label>
              Advantage
              <select
                className={field}
                required
                value={option}
                onChange={(e) => setOption(e.target.value)}
              >
                <option value="">Choose advantage</option>
                {benefit.advantage.map((a) => (
                  <option key={a}>{a}</option>
                ))}
              </select>
            </label>
          )}
          {benefit.equipment && (
            <label>
              Prepared item
              <select
                className={field}
                required
                value={itemId}
                onChange={(e) => setItemId(e.target.value)}
              >
                <option value="">Choose database item</option>
                {view.items.map((i) => (
                  <option key={i.id} value={i.id}>
                    {i.name} / {i.type} / availability {i.availability}
                  </option>
                ))}
              </select>
            </label>
          )}
          {spec.key === "caretaker" && (
            <label>
              Facility to repair
              <select
                className={field}
                required
                value={repairId}
                onChange={(e) => setRepairId(e.target.value)}
              >
                <option value="">Choose damaged facility</option>
                {view.owned
                  .filter((u) => u.status === "DAMAGED")
                  .map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.name}
                    </option>
                  ))}
              </select>
            </label>
          )}
          {benefit.healing && !group && (
            <div>
              <p>
                Choose marked conditions to heal, or leave blank to heal the
                first marked conditions.
              </p>
              <div className="flex flex-wrap gap-3">
                {(benefit.healing.domain === "physical"
                  ? ["exhausted", "battered", "wounded"]
                  : ["angry", "frightened", "hopeless"]
                ).map((c) => (
                  <label key={c}>
                    <input
                      type="checkbox"
                      checked={healing.includes(c)}
                      onChange={(e) =>
                        setHealing(
                          e.target.checked
                            ? [...healing, c]
                            : healing.filter((s) => s !== c),
                        )
                      }
                    />{" "}
                    {c}
                  </label>
                ))}
              </div>
            </div>
          )}
          {benefit.healing && group && (
            <div className="space-y-2">
              <p>
                Treatment clears Broken. Choose up to two conditions per
                investigator, or use the first two marked conditions by default.
              </p>
              {view.members.map((member) => (
                <div key={member.id}>
                  <strong>{member.name}</strong>
                  <div className="flex flex-wrap gap-3">
                    {member.conditions.map((condition) => (
                      <label key={condition}>
                        <input
                          type="checkbox"
                          checked={(groupHealing[member.id] || []).includes(
                            condition,
                          )}
                          onChange={(e) =>
                            setGroupHealing({
                              ...groupHealing,
                              [member.id]: e.target.checked
                                ? [
                                    ...(groupHealing[member.id] || []),
                                    condition,
                                  ]
                                : (groupHealing[member.id] || []).filter(
                                    (c) => c !== condition,
                                  ),
                            })
                          }
                        />{" "}
                        {condition}
                      </label>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
          <label>
            Scene / outcome / GM confirmation
            <textarea
              className={field}
              required
              maxLength={2000}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </label>
          <Button type="submit" disabled={used}>
            {used ? "Already Used" : `Use ${channel}`}
          </Button>
        </form>
      )}
    </div>
  );
}
function DevelopmentForm({ view, run }: { view: CastleView; run: Run }) {
  const [id, setId] = useState("");
  const [answers, setAnswers] = useState(Array<boolean>(8).fill(false));
  return (
    <Panel title="Post-Mystery Development">
      <form
        className="space-y-4"
        onSubmit={(e) => {
          e.preventDefault();
          run("Development review", () =>
            reviewCastleDevelopment(view.id, id, answers),
          );
        }}
      >
        <label>
          Completed mystery
          <select
            className={field}
            required
            value={id}
            onChange={(e) => {
              setId(e.target.value);
              setAnswers(Array<boolean>(8).fill(false));
            }}
          >
            <option value="">Choose unreviewed mystery</option>
            {view.mysteries
              .filter(
                (m) =>
                  ["RESOLVED", "ARCHIVED"].includes(m.status) &&
                  !view.reviews.some((r) => r.mysteryId === m.id),
              )
              .map((m) => (
                <option key={m.id} value={m.id}>
                  {m.title}
                </option>
              ))}
          </select>
        </label>
        {view.questions.map((q, i) => (
          <label key={q} className="flex gap-3">
            <input
              type="checkbox"
              checked={answers[i]}
              onChange={(e) =>
                setAnswers(
                  answers.map((a, n) => (n === i ? e.target.checked : a)),
                )
              }
            />
            {q}
          </label>
        ))}
        <p>
          Earned: {answers.filter(Boolean).length} DP. This review is recorded
          once.
        </p>
        <Button type="submit">Finalize Review</Button>
      </form>
    </Panel>
  );
}
function FactForm({ view, run }: { view: CastleView; run: Run }) {
  const [key, setKey] = useState(Object.keys(view.factOptions)[0] || "");
  const [evidence, setEvidence] = useState("");
  return (
    <Panel title="Campaign Prerequisites">
      {view.facts.map((f) => (
        <p key={f.key}>
          {view.factOptions[f.key]}: {f.evidence}
        </p>
      ))}
      <form
        className="space-y-3"
        onSubmit={(e) => {
          e.preventDefault();
          run("Campaign evidence", () =>
            recordCastleFact(view.id, key, evidence),
          );
        }}
      >
        <label>
          Event
          <select
            className={field}
            value={key}
            onChange={(e) => setKey(e.target.value)}
          >
            {Object.entries(view.factOptions).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </select>
        </label>
        <label>
          Evidence
          <input
            required
            minLength={5}
            className={field}
            value={evidence}
            onChange={(e) => setEvidence(e.target.value)}
          />
        </label>
        <Button type="submit">Record Evidence</Button>
      </form>
    </Panel>
  );
}
function AdjustmentForm({ view, run }: { view: CastleView; run: Run }) {
  const [points, setPoints] = useState(1);
  const [reason, setReason] = useState("");
  return (
    <Panel title="GM Development Adjustment">
      <p>
        Use for corrections or house rules; normal mystery awards belong in the
        review above.
      </p>
      <form
        className="space-y-3"
        onSubmit={(e) => {
          e.preventDefault();
          run("Development adjustment", () =>
            awardDevelopmentPoints(view.id, points, reason),
          );
        }}
      >
        <label>
          Points
          <input
            className={field}
            type="number"
            required
            min={1}
            max={100}
            value={points}
            onChange={(e) => setPoints(Number(e.target.value))}
          />
        </label>
        <label>
          Reason
          <input
            className={field}
            required
            value={reason}
            onChange={(e) => setReason(e.target.value)}
          />
        </label>
        <Button type="submit">Award Points</Button>
      </form>
    </Panel>
  );
}
function ThreatForm({
  threat,
  view,
  run,
}: {
  threat: CastleView["threats"][number];
  view: CastleView;
  run: Run;
}) {
  const [title, setTitle] = useState(threat.title);
  const [description, setDescription] = useState(threat.description);
  const [status, setStatus] = useState(
    threat.status === "RESOLVED" ? "RESOLVED" : "ACTIVE",
  );
  const [countdown, setCountdown] = useState(threat.countdown.join("\n"));
  const [step, setStep] = useState(threat.step);
  return (
    <Panel title={threat.title}>
      <p>
        {threat.status}
        {threat.successes !== null
          ? ` / ${threat.successes} roll successes`
          : ""}
      </p>
      <form
        className="space-y-3"
        onSubmit={(e) => {
          e.preventDefault();
          run("Threat", () =>
            updateCastleThreat(view.id, threat.id, {
              title,
              description,
              status,
              countdown: countdown
                .split("\n")
                .map((s) => s.trim())
                .filter(Boolean),
              step,
            }),
          );
        }}
      >
        <label>
          Book-inspired options
          <select
            className={field}
            value=""
            onChange={(e) => setTitle(e.target.value)}
          >
            <option value="">Choose a threat or write your own</option>
            {view.threatOptions.map((t) => (
              <option key={t}>{t}</option>
            ))}
          </select>
        </label>
        <label>
          Title
          <input
            className={field}
            required
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
        </label>
        <label>
          GM details, NPCs and vaesen
          <textarea
            className={field}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </label>
        <label>
          Countdown (one stage per line)
          <textarea
            className={field}
            rows={4}
            value={countdown}
            onChange={(e) => setCountdown(e.target.value)}
          />
        </label>
        <label>
          Completed countdown stages
          <input
            className={field}
            type="number"
            min={0}
            max={20}
            value={step}
            onChange={(e) => setStep(Number(e.target.value))}
          />
        </label>
        <label>
          Status
          <select
            className={field}
            value={status}
            onChange={(e) => setStatus(e.target.value)}
          >
            <option>ACTIVE</option>
            <option>RESOLVED</option>
          </select>
        </label>
        <Button type="submit">Save Threat</Button>
      </form>
    </Panel>
  );
}
function HistoryForm({ view, run }: { view: CastleView; run: Run }) {
  const [history, setHistory] = useState(view.history);
  const [name, setName] = useState(view.name);
  if (!view.isGM)
    return (
      <p className="whitespace-pre-wrap">
        {view.history || "No castle history recorded."}
      </p>
    );
  return (
    <form
      className="space-y-3"
      onSubmit={(e) => {
        e.preventDefault();
        run("Castle history", () =>
          updateHeadquarters(view.id, { name, history }),
        );
      }}
    >
      <label>
        Headquarters name
        <input
          className={field}
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
      </label>
      <label>
        History
        <textarea
          className={field}
          rows={8}
          value={history}
          onChange={(e) => setHistory(e.target.value)}
        />
      </label>
      <Button type="submit">Save History</Button>
    </form>
  );
}
