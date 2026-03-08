"use client";

import { useState } from "react";
import { 
  Building2, 
  Users2, 
  UserCog, 
  History, 
  AlertTriangle, 
  Plus,
  ArrowUpRight
} from "lucide-react";
import { buyUpgrade, updateHeadquarters } from "../../actions";
import { cn } from "@/lib/utils";

const UPGRADE_SHOP = {
  facilities: [
    { name: "Infirmary", cost: 2, description: "Heal physical conditions faster." },
    { name: "Library", cost: 1, description: "Bonus to Learning and Investigation." },
    { name: "Stable", cost: 1, description: "Faster travel in the Mythic North." },
    { name: "Workshop", cost: 2, description: "Repair and craft specialized gear." },
  ],
  contacts: [
    { name: "Police Inspector", cost: 1, description: "Access to official crime records." },
    { name: "University Professor", cost: 1, description: "Expertise in occult and history." },
    { name: "Local Merchant", cost: 1, description: "Easier access to rare items." },
  ],
  personnel: [
    { name: "Guard", cost: 1, description: "Protects the HQ from physical threats." },
    { name: "Butler", cost: 1, description: "Manages HQ logistics and comfort." },
    { name: "Coachman", cost: 1, description: "Available for immediate departures." },
  ]
};

export default function HQDashboard({ hq, isGM }: { hq: any, isGM: boolean }) {
  const [activeTab, setActiveTab] = useState<"upgrades" | "history">("upgrades");
  const [historyText, setHistoryText] = useState(hq.history || "");
  const [threatsText, setThreatsText] = useState(hq.threats || "");

  async function handleBuy(type: "facilities" | "contacts" | "personnel", upgrade: any) {
    if (hq.developmentPoints < upgrade.cost) {
      alert("Not enough Development Points!");
      return;
    }
    try {
      await buyUpgrade(hq.id, type, upgrade, upgrade.cost);
    } catch (e: any) {
      alert(e.message);
    }
  }

  async function handleSaveText() {
    await updateHeadquarters(hq.id, {
      history: historyText,
      threats: threatsText
    });
    alert("HQ details saved!");
  }

  return (
    <div className="space-y-12">
      {/* Tab Switcher */}
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
        <div className="space-y-12 animate-in fade-in slide-in-from-bottom-2 duration-500">
          {/* Current Assets */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <UpgradeSection 
              title="Facilities" 
              icon={Building2} 
              items={hq.facilities || []} 
              shop={UPGRADE_SHOP.facilities}
              onBuy={(u) => handleBuy("facilities", u)}
              canBuy={isGM}
            />
            <UpgradeSection 
              title="Contacts" 
              icon={Users2} 
              items={hq.contacts || []} 
              shop={UPGRADE_SHOP.contacts}
              onBuy={(u) => handleBuy("contacts", u)}
              canBuy={isGM}
            />
            <UpgradeSection 
              title="Personnel" 
              icon={UserCog} 
              items={hq.personnel || []} 
              shop={UPGRADE_SHOP.personnel}
              onBuy={(u) => handleBuy("personnel", u)}
              canBuy={isGM}
            />
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 animate-in fade-in slide-in-from-bottom-2 duration-500">
          {/* History */}
          <div className="space-y-4">
            <h3 className="text-xl font-bold text-white flex items-center gap-2">
              <History className="w-5 h-5 text-indigo-400" />
              HQ History
            </h3>
            <textarea
              className="w-full h-80 bg-neutral-900 border border-neutral-800 rounded-xl p-6 text-sm text-neutral-300 leading-relaxed focus:ring-2 focus:ring-indigo-500 outline-none"
              placeholder="Record the deeds performed at the HQ..."
              value={historyText}
              onChange={(e) => setHistoryText(e.target.value)}
              disabled={!isGM}
            />
          </div>

          {/* Threats */}
          <div className="space-y-4">
            <h3 className="text-xl font-bold text-white flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-red-400" />
              Active Threats
            </h3>
            <textarea
              className="w-full h-80 bg-neutral-900 border border-neutral-800 rounded-xl p-6 text-sm text-red-100/70 leading-relaxed focus:ring-2 focus:ring-red-500/50 outline-none"
              placeholder="What shadows loom over Castle Gyllencreutz?"
              value={threatsText}
              onChange={(e) => setThreatsText(e.target.value)}
              disabled={!isGM}
            />
          </div>

          {isGM && (
            <div className="lg:col-span-2 flex justify-end">
              <button
                onClick={handleSaveText}
                className="bg-indigo-600 hover:bg-indigo-500 text-white px-8 py-3 rounded-xl font-bold transition-all hover:scale-105 active:scale-95"
              >
                Save HQ Details
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function UpgradeSection({ title, icon: Icon, items, shop, onBuy, canBuy }: any) {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 border-b border-neutral-800 pb-2">
        <Icon className="w-6 h-6 text-indigo-400" />
        <h3 className="text-xl font-bold text-white">{title}</h3>
      </div>

      {/* Owned Items */}
      <div className="space-y-3">
        {items.map((item: any, idx: number) => (
          <div key={idx} className="bg-emerald-500/5 border border-emerald-500/20 rounded-lg px-4 py-3 flex justify-between items-center group">
            <span className="text-sm font-medium text-emerald-400">{item.name}</span>
            <ArrowUpRight className="w-4 h-4 text-emerald-500/50 opacity-0 group-hover:opacity-100 transition-opacity" />
          </div>
        ))}
        {items.length === 0 && (
          <p className="text-xs text-neutral-600 italic">No {title.toLowerCase()} yet.</p>
        )}
      </div>

      {/* Shop Items (Only for GM) */}
      {canBuy && (
        <div className="pt-4 border-t border-neutral-900">
          <h4 className="text-xs font-bold text-neutral-500 uppercase tracking-widest mb-4">Available Upgrades</h4>
          <div className="space-y-3">
            {shop.filter((s: any) => !items.find((i: any) => i.name === s.name)).map((upgrade: any) => (
              <button
                key={upgrade.name}
                onClick={() => onBuy(upgrade)}
                className="w-full text-left bg-neutral-900 border border-neutral-800 p-4 rounded-xl hover:bg-neutral-800 hover:border-neutral-700 transition-all group relative overflow-hidden"
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
      )}
    </div>
  );
}
