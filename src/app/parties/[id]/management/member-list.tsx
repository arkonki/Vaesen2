"use client";

import { useState } from "react";
import { UserPlus, UserMinus, ShieldAlert, Heart, Brain, Trash2 } from "lucide-react";
import { enrollCharacter, removeCharacter } from "../../actions";
import { cn } from "@/lib/utils";

const PHYSICAL_CONDITION_KEYS = ["exhausted", "battered", "wounded", "broken"];
const MENTAL_CONDITION_KEYS = ["angry", "frightened", "hopeless", "broken"];

export default function MemberList({ party, isGM }: { party: any, isGM: boolean }) {
  const [inviteId, setInviteId] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  async function handleInvite() {
    if (!inviteId) return;
    setIsLoading(true);
    try {
      await enrollCharacter(party.id, inviteId);
      setInviteId("");
    } catch (error) {
      alert("Failed to invite character. Check the ID.");
    } finally {
      setIsLoading(false);
    }
  }

  async function handleRemove(memberId: string) {
    if (!confirm("Remove this character from the party?")) return;
    await removeCharacter(party.id, memberId);
  }

  return (
    <div className="space-y-6">
      {isGM && (
        <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-6 shadow-xl">
          <h3 className="text-lg font-semibold text-white flex items-center gap-2 mb-4">
            <UserPlus className="w-5 h-5 text-indigo-400" />
            Recruit New Member
          </h3>
          <div className="flex gap-4">
            <input
              type="text"
              placeholder="Enter Character ID"
              className="flex-1 bg-neutral-950 border border-neutral-700 rounded-lg px-4 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
              value={inviteId}
              onChange={(e) => setInviteId(e.target.value)}
            />
            <button
              onClick={handleInvite}
              disabled={isLoading}
              className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white px-6 py-2 rounded-lg text-sm font-medium transition-colors"
            >
              Invite
            </button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {party.members.map((member: any) => {
          const char = member.character;
          
          // Conditions logic (assuming JSON structure from requirements)
          const physicalConditions = char.physicalConditions || {};
          const mentalConditions = char.mentalConditions || {};
          
          const physicalCount = PHYSICAL_CONDITION_KEYS.filter((key) => physicalConditions[key] === true).length;
          const mentalCount = MENTAL_CONDITION_KEYS.filter((key) => mentalConditions[key] === true).length;
          
          const isBroken = physicalCount >= 3 || mentalCount >= 3;

          return (
            <div key={member.id} className="bg-neutral-900 border border-neutral-800 rounded-xl overflow-hidden hover:border-neutral-700 transition-colors group">
              <div className="p-6">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h4 className="text-xl font-bold text-white group-hover:text-indigo-400 transition-colors">
                      {char.name}
                    </h4>
                    <p className="text-sm text-neutral-500">{char.archetype?.name}</p>
                  </div>
                  {isBroken && (
                    <span className="bg-red-500/20 text-red-400 text-xs font-bold px-2 py-1 rounded border border-red-500/30 flex items-center gap-1 animate-pulse">
                      <ShieldAlert className="w-3 h-3" />
                      BROKEN
                    </span>
                  )}
                </div>

                <div className="space-y-4">
                  {/* Physical Health */}
                  <div>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-neutral-400 flex items-center gap-1">
                        <Heart className="w-3 h-3 text-red-400" /> Physical
                      </span>
                      <span className={cn(physicalCount > 0 ? "text-red-400" : "text-neutral-500")}>
                        {physicalCount}/3 Conditions
                      </span>
                    </div>
                    <div className="h-1.5 w-full bg-neutral-800 rounded-full overflow-hidden">
                      <div 
                        className={cn("h-full transition-all duration-500", physicalCount === 0 ? "bg-emerald-500" : physicalCount < 3 ? "bg-yellow-500" : "bg-red-600")}
                        style={{ width: `${(physicalCount / 3) * 100}%` }}
                      />
                    </div>
                  </div>

                  {/* Mental Health */}
                  <div>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-neutral-400 flex items-center gap-1">
                        <Brain className="w-3 h-3 text-blue-400" /> Mental
                      </span>
                      <span className={cn(mentalCount > 0 ? "text-blue-400" : "text-neutral-500")}>
                        {mentalCount}/3 Conditions
                      </span>
                    </div>
                    <div className="h-1.5 w-full bg-neutral-800 rounded-full overflow-hidden">
                      <div 
                        className={cn("h-full transition-all duration-500", mentalCount === 0 ? "bg-emerald-500" : mentalCount < 3 ? "bg-blue-500" : "bg-purple-600")}
                        style={{ width: `${(mentalCount / 3) * 100}%` }}
                      />
                    </div>
                  </div>
                </div>
              </div>

              {isGM && (
                <div className="bg-neutral-800/50 p-3 flex justify-end border-t border-neutral-800">
                  <button 
                    onClick={() => handleRemove(member.id)}
                    className="text-neutral-500 hover:text-red-400 p-2 rounded-lg hover:bg-red-400/10 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>
          );
        })}

        {party.members.length === 0 && (
          <div className="col-span-full py-12 text-center bg-neutral-900/50 border border-dashed border-neutral-800 rounded-xl">
            <p className="text-neutral-500 italic">No members in this party yet.</p>
          </div>
        )}
      </div>
    </div>
  );
}
