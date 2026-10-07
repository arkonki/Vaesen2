"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Building2,
  Users2,
  UserCog,
  History,
  AlertTriangle,
  Plus,
  ArrowUpRight,
} from "lucide-react";
import { buyUpgrade, updateHeadquarters, awardDevelopmentPoints } from "../../actions";
import { cn } from "@/lib/utils";
import { UPGRADE_SHOP } from "@/lib/hq-upgrades";

type UpgradeType = "facilities" | "contacts" | "personnel";

type UpgradeOption = {
  name: string;
  cost: number;
  description: string;
};

type ThreatEntry = {
  id: string;
  createdAt: string;
  title: string;
  description: string;
  sourceUpgrade: string;
  status: "ACTIVE" | "RESOLVED";
};

type HeadquartersData = {
  id: string;
  history: string;
  threats: unknown;
  developmentPoints: number;
  facilities: unknown;
  contacts: unknown;
  personnel: unknown;
  ledgerEntries: Array<{ id: string; points: number; description: string; createdAt: Date }>;
};


function toUpgradeList(value: unknown): UpgradeOption[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((entry) => {
      if (!entry || typeof entry !== "object") {
        return null;
      }

      const item = entry as Record<string, unknown>;
      const name = typeof item.name === "string" ? item.name : "Unknown Upgrade";
      const cost = typeof item.cost === "number" ? item.cost : 0;
      const description = typeof item.description === "string" ? item.description : "";
      return { name, cost, description };
    })
    .filter((entry): entry is UpgradeOption => Boolean(entry));
}

function toThreatList(value: unknown): ThreatEntry[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((entry) => {
      if (!entry || typeof entry !== "object") {
        return null;
      }

      const item = entry as Record<string, unknown>;
      const id = typeof item.id === "string" ? item.id : crypto.randomUUID();
      const createdAt = typeof item.createdAt === "string" ? item.createdAt : new Date(0).toISOString();
      const title = typeof item.title === "string" ? item.title : "Unlabeled Threat";
      const description = typeof item.description === "string" ? item.description : "";
      const sourceUpgrade = typeof item.sourceUpgrade === "string" ? item.sourceUpgrade : "Unknown";
      const status = item.status === "RESOLVED" ? "RESOLVED" : "ACTIVE";

      return {
        id,
        createdAt,
        title,
        description,
        sourceUpgrade,
        status,
      } satisfies ThreatEntry;
    })
    .filter((entry): entry is ThreatEntry => Boolean(entry))
    .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
}

export default function HQDashboard({ hq, isGM }: { hq: HeadquartersData; isGM: boolean }) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"upgrades" | "history">("upgrades");
  const [historyText, setHistoryText] = useState(hq.history || "");
  const [isSaving, setIsSaving] = useState(false);
  const [isBuying, setIsBuying] = useState(false);
  const [award, setAward] = useState({ points: 1, reason: "" });
  const [awardBusy, setAwardBusy] = useState(false);
  const [awardError, setAwardError] = useState("");
  const [threatEntries, setThreatEntries] = useState<ThreatEntry[]>(toThreatList(hq.threats));

  const facilities = toUpgradeList(hq.facilities);
  const contacts = toUpgradeList(hq.contacts);
  const personnel = toUpgradeList(hq.personnel);

  async function handleBuy(type: UpgradeType, upgrade: UpgradeOption) {
    if (!isGM || isBuying) {
      return;
    }

    if (hq.developmentPoints < upgrade.cost) {
      alert("Not enough Development Points!");
      return;
    }

    setIsBuying(true);
    try {
      const result = await buyUpgrade(hq.id, type, upgrade.name);
      const nextThreats = toThreatList(result.threats);
      setThreatEntries(nextThreats);

      if (result.threatTriggered && result.triggeredThreat) {
        alert(`Threat Triggered: ${result.triggeredThreat.title}`);
      }

      router.refresh();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to buy upgrade";
      alert(message);
    } finally {
      setIsBuying(false);
    }
  }

  async function handleSaveHistory() {
    setIsSaving(true);
    try {
      await updateHeadquarters(hq.id, { history: historyText });
      router.refresh();
      alert("HQ history saved.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="space-y-12">
      {isGM && <form className="ledger-panel p-4 flex flex-wrap gap-3" onSubmit={async (event) => {
        event.preventDefault(); setAwardBusy(true); setAwardError("");
        try {
          await awardDevelopmentPoints(hq.id, award.points, award.reason);
          setAward({ points: 1, reason: "" }); router.refresh();
        } catch (error) { setAwardError(error instanceof Error ? error.message : "Award failed"); }
        finally { setAwardBusy(false); }
      }}>
        <label className="ledger-input-group w-28"><span>Points to Award</span>
          <input className="ledger-input" type="number" min={1} max={100} required value={award.points} onChange={(event) => setAward({ ...award, points: Number(event.target.value) })} />
        </label>
        <label className="ledger-input-group min-w-0 flex-[1_1_12rem]"><span>Reason</span>
          <input className="ledger-input" required maxLength={1000} value={award.reason} onChange={(event) => setAward({ ...award, reason: event.target.value })} />
        </label>
        <button className="ledger-roll-trigger" disabled={awardBusy}>{awardBusy ? "Awarding..." : "Award Points"}</button>
        {awardError && <p role="alert" className="w-full">{awardError}</p>}
      </form>}
      <section className="ledger-panel p-4 space-y-2">
        <h2 className="text-xl font-bold">Development History</h2>
        {hq.ledgerEntries.length ? hq.ledgerEntries.map((entry) => <p key={entry.id}>
          <strong>{entry.points > 0 ? "+" : ""}{entry.points} DP</strong> {entry.description}
          <span className="ml-3 text-sm">{new Date(entry.createdAt).toLocaleDateString()}</span>
        </p>) : <p>No Development Point transactions recorded yet.</p>}
      </section>
      <div className="flex border-b border-[var(--ledger-line)]/55">
        <button
          onClick={() => setActiveTab("upgrades")}
          className={cn(
            "px-6 py-3 text-sm font-medium border-b-2 transition-colors",
            activeTab === "upgrades" ? "border-[var(--ledger-accent)]/65 text-[var(--ledger-ink)]" : "border-transparent text-[var(--ledger-ink-soft)] hover:text-[var(--ledger-ink)]"
          )}
        >
          Upgrades & HQ Assets
        </button>
        <button
          onClick={() => setActiveTab("history")}
          className={cn(
            "px-6 py-3 text-sm font-medium border-b-2 transition-colors",
            activeTab === "history" ? "border-[var(--ledger-accent)]/65 text-[var(--ledger-ink)]" : "border-transparent text-[var(--ledger-ink-soft)] hover:text-[var(--ledger-ink)]"
          )}
        >
          History & Threats
        </button>
      </div>

      {activeTab === "upgrades" ? (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-500">
          <div className="rounded-xl border border-red-900/50 bg-red-950/20 p-4 text-sm text-[var(--ledger-danger)]">
            Every headquarters expansion carries a threat risk. Purchasing upgrades may add a new active threat.
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <UpgradeSection
              title="Facilities"
              icon={Building2}
              items={facilities}
              shop={UPGRADE_SHOP.facilities}
              onBuy={(upgrade) => handleBuy("facilities", upgrade)}
              canBuy={isGM}
              isBuying={isBuying}
            />
            <UpgradeSection
              title="Contacts"
              icon={Users2}
              items={contacts}
              shop={UPGRADE_SHOP.contacts}
              onBuy={(upgrade) => handleBuy("contacts", upgrade)}
              canBuy={isGM}
              isBuying={isBuying}
            />
            <UpgradeSection
              title="Personnel"
              icon={UserCog}
              items={personnel}
              shop={UPGRADE_SHOP.personnel}
              onBuy={(upgrade) => handleBuy("personnel", upgrade)}
              canBuy={isGM}
              isBuying={isBuying}
            />
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 animate-in fade-in slide-in-from-bottom-2 duration-500">
          <div className="space-y-4">
            <h3 className="text-xl font-bold text-[var(--ledger-ink)] flex items-center gap-2">
              <History className="w-5 h-5 text-[var(--ledger-accent)]" />
              HQ History
            </h3>
            <textarea
              className="w-full h-80 bg-[var(--ledger-surface-strong)] border border-[var(--ledger-line)]/55 rounded-xl p-6 text-sm text-[var(--ledger-ink)] leading-relaxed focus:ring-2 focus:ring-[var(--ledger-focus)] outline-none"
              placeholder="Record the deeds performed at the HQ..."
              value={historyText}
              onChange={(event) => setHistoryText(event.target.value)}
              disabled={!isGM}
            />
            {isGM ? (
              <button
                onClick={handleSaveHistory}
                disabled={isSaving}
                className="bg-[rgba(127,48,40,0.12)] hover:bg-[rgba(127,48,40,0.12)] disabled:opacity-60 text-[var(--ledger-ink)] px-8 py-3 rounded-xl font-bold transition-all"
              >
                {isSaving ? "Saving..." : "Save HQ History"}
              </button>
            ) : null}
          </div>

          <div className="space-y-4">
            <h3 className="text-xl font-bold text-[var(--ledger-ink)] flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-[var(--ledger-danger)]" />
              Active Threats
            </h3>

            <div className="space-y-3 max-h-96 overflow-y-auto rounded-xl border border-[var(--ledger-line)]/55 bg-[var(--ledger-surface-strong)] p-4">
              {threatEntries.length > 0 ? (
                threatEntries.map((threat) => (
                  <article key={threat.id} className="rounded-lg border border-red-800/40 bg-red-950/20 p-3">
                    <div className="flex items-center justify-between gap-2">
                      <p className="font-semibold text-[var(--ledger-danger)]">{threat.title}</p>
                      <span className="text-xs text-[var(--ledger-danger)]">{threat.status}</span>
                    </div>
                    <p className="mt-1 text-xs text-[var(--ledger-danger)]">Source: {threat.sourceUpgrade}</p>
                    <p className="mt-2 text-sm text-[var(--ledger-ink)]">{threat.description}</p>
                    <p className="mt-2 text-xs text-[var(--ledger-ink-soft)]">{new Date(threat.createdAt).toLocaleString()}</p>
                  </article>
                ))
              ) : (
                <p className="text-sm text-[var(--ledger-ink-soft)] italic">No active threats logged.</p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function UpgradeSection({
  title,
  icon: Icon,
  items,
  shop,
  onBuy,
  canBuy,
  isBuying,
}: {
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  items: UpgradeOption[];
  shop: UpgradeOption[];
  onBuy: (upgrade: UpgradeOption) => void;
  canBuy: boolean;
  isBuying: boolean;
}) {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 border-b border-[var(--ledger-line)]/55 pb-2">
        <Icon className="w-6 h-6 text-[var(--ledger-accent)]" />
        <h3 className="text-xl font-bold text-[var(--ledger-ink)]">{title}</h3>
      </div>

      <div className="space-y-3">
        {items.map((item, index) => (
          <div key={`${item.name}-${index}`} className="bg-emerald-500/5 border border-emerald-500/20 rounded-lg px-4 py-3 flex justify-between items-center group">
            <span className="text-sm font-medium text-[var(--ledger-success)]">{item.name}</span>
            <ArrowUpRight className="w-4 h-4 text-[var(--ledger-success)] opacity-0 group-hover:opacity-100 transition-opacity" />
          </div>
        ))}
        {items.length === 0 ? <p className="text-xs text-[var(--ledger-ink-soft)] italic">No {title.toLowerCase()} yet.</p> : null}
      </div>

      {canBuy ? (
        <div className="pt-4 border-t border-[var(--ledger-line)]/55">
          <h4 className="text-xs font-bold text-[var(--ledger-ink-soft)] uppercase tracking-widest mb-4">Available Upgrades</h4>
          <div className="space-y-3">
            {shop.filter((option) => !items.some((owned) => owned.name === option.name)).map((upgrade) => (
              <button
                key={upgrade.name}
                onClick={() => onBuy(upgrade)}
                disabled={isBuying}
                className="w-full text-left bg-[var(--ledger-surface-strong)] border border-[var(--ledger-line)]/55 p-4 rounded-xl hover:bg-[var(--ledger-paper-deep)] hover:border-[var(--ledger-line)]/55 transition-all group relative overflow-hidden disabled:opacity-60"
              >
                <div className="relative z-10">
                  <div className="flex justify-between items-start mb-1">
                    <span className="text-sm font-bold text-[var(--ledger-ink)] group-hover:text-[var(--ledger-accent)] transition-colors">{upgrade.name}</span>
                    <span className="text-xs font-black text-[var(--ledger-accent)]">{upgrade.cost} DP</span>
                  </div>
                  <p className="text-xs text-[var(--ledger-ink-soft)] leading-tight pr-4">{upgrade.description}</p>
                </div>
                <div className="absolute top-1/2 right-4 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Plus className="w-4 h-4 text-[var(--ledger-accent)]" />
                </div>
              </button>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
