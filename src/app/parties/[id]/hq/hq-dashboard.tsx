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
import { buyUpgrade, updateHeadquarters } from "../../actions";
import { cn } from "@/lib/utils";

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
};

const UPGRADE_SHOP: Record<UpgradeType, UpgradeOption[]> = {
  facilities: [
    { name: "Infirmary", cost: 6, description: "Heal physical conditions faster between mysteries." },
    { name: "Botanical Garden", cost: 4, description: "Gather rare ingredients and improve field recovery." },
    { name: "Library", cost: 4, description: "Gain better context for research-heavy investigations." },
    { name: "Workshop", cost: 5, description: "Maintain and customize gear for expeditions." },
  ],
  contacts: [
    { name: "Police Inspector", cost: 3, description: "Access official reports and active investigations." },
    { name: "University Professor", cost: 3, description: "Academic insight into occult, folklore, and history." },
    { name: "Local Merchant", cost: 2, description: "Reliable channel to acquire scarce items quickly." },
  ],
  personnel: [
    { name: "Guard", cost: 3, description: "Improves HQ safety and response to hostile incidents." },
    { name: "Butler", cost: 2, description: "Keeps HQ operations stable during long investigations." },
    { name: "Coachman", cost: 2, description: "Enables faster departure when time pressure is high." },
  ],
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
      const result = await buyUpgrade(hq.id, type, upgrade, upgrade.cost);
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
      <div className="flex border-b border-neutral-800">
        <button
          onClick={() => setActiveTab("upgrades")}
          className={cn(
            "px-6 py-3 text-sm font-medium border-b-2 transition-colors",
            activeTab === "upgrades" ? "border-indigo-500 text-white" : "border-transparent text-neutral-500 hover:text-neutral-300"
          )}
        >
          Upgrades & HQ Assets
        </button>
        <button
          onClick={() => setActiveTab("history")}
          className={cn(
            "px-6 py-3 text-sm font-medium border-b-2 transition-colors",
            activeTab === "history" ? "border-indigo-500 text-white" : "border-transparent text-neutral-500 hover:text-neutral-300"
          )}
        >
          History & Threats
        </button>
      </div>

      {activeTab === "upgrades" ? (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-500">
          <div className="rounded-xl border border-red-900/50 bg-red-950/20 p-4 text-sm text-red-100">
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
            <h3 className="text-xl font-bold text-white flex items-center gap-2">
              <History className="w-5 h-5 text-indigo-400" />
              HQ History
            </h3>
            <textarea
              className="w-full h-80 bg-neutral-900 border border-neutral-800 rounded-xl p-6 text-sm text-neutral-300 leading-relaxed focus:ring-2 focus:ring-indigo-500 outline-none"
              placeholder="Record the deeds performed at the HQ..."
              value={historyText}
              onChange={(event) => setHistoryText(event.target.value)}
              disabled={!isGM}
            />
            {isGM ? (
              <button
                onClick={handleSaveHistory}
                disabled={isSaving}
                className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-60 text-white px-8 py-3 rounded-xl font-bold transition-all"
              >
                {isSaving ? "Saving..." : "Save HQ History"}
              </button>
            ) : null}
          </div>

          <div className="space-y-4">
            <h3 className="text-xl font-bold text-white flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-red-400" />
              Active Threats
            </h3>

            <div className="space-y-3 max-h-96 overflow-y-auto rounded-xl border border-neutral-800 bg-neutral-900 p-4">
              {threatEntries.length > 0 ? (
                threatEntries.map((threat) => (
                  <article key={threat.id} className="rounded-lg border border-red-800/40 bg-red-950/20 p-3">
                    <div className="flex items-center justify-between gap-2">
                      <p className="font-semibold text-red-100">{threat.title}</p>
                      <span className="text-xs text-red-200">{threat.status}</span>
                    </div>
                    <p className="mt-1 text-xs text-red-200/80">Source: {threat.sourceUpgrade}</p>
                    <p className="mt-2 text-sm text-neutral-200">{threat.description}</p>
                    <p className="mt-2 text-xs text-neutral-400">{new Date(threat.createdAt).toLocaleString()}</p>
                  </article>
                ))
              ) : (
                <p className="text-sm text-neutral-500 italic">No active threats logged.</p>
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
      <div className="flex items-center gap-3 border-b border-neutral-800 pb-2">
        <Icon className="w-6 h-6 text-indigo-400" />
        <h3 className="text-xl font-bold text-white">{title}</h3>
      </div>

      <div className="space-y-3">
        {items.map((item, index) => (
          <div key={`${item.name}-${index}`} className="bg-emerald-500/5 border border-emerald-500/20 rounded-lg px-4 py-3 flex justify-between items-center group">
            <span className="text-sm font-medium text-emerald-400">{item.name}</span>
            <ArrowUpRight className="w-4 h-4 text-emerald-500/50 opacity-0 group-hover:opacity-100 transition-opacity" />
          </div>
        ))}
        {items.length === 0 ? <p className="text-xs text-neutral-600 italic">No {title.toLowerCase()} yet.</p> : null}
      </div>

      {canBuy ? (
        <div className="pt-4 border-t border-neutral-900">
          <h4 className="text-xs font-bold text-neutral-500 uppercase tracking-widest mb-4">Available Upgrades</h4>
          <div className="space-y-3">
            {shop.filter((option) => !items.some((owned) => owned.name === option.name)).map((upgrade) => (
              <button
                key={upgrade.name}
                onClick={() => onBuy(upgrade)}
                disabled={isBuying}
                className="w-full text-left bg-neutral-900 border border-neutral-800 p-4 rounded-xl hover:bg-neutral-800 hover:border-neutral-700 transition-all group relative overflow-hidden disabled:opacity-60"
              >
                <div className="relative z-10">
                  <div className="flex justify-between items-start mb-1">
                    <span className="text-sm font-bold text-neutral-200 group-hover:text-indigo-400 transition-colors">{upgrade.name}</span>
                    <span className="text-xs font-black text-indigo-400">{upgrade.cost} DP</span>
                  </div>
                  <p className="text-xs text-neutral-500 leading-tight pr-4">{upgrade.description}</p>
                </div>
                <div className="absolute top-1/2 right-4 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Plus className="w-4 h-4 text-indigo-400" />
                </div>
              </button>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
