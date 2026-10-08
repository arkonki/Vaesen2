"use client";

import { useState } from "react";
import { UserPlus, ShieldAlert, Heart, Brain, Trash2 } from "lucide-react";
import { enrollCharacter, removeCharacter } from "../../actions";
import { cn } from "@/lib/utils";

import { summarizeConditions } from "@/lib/character-rules";
import type { Prisma } from "@prisma/client";
import { partyCharacterSelect } from "@/lib/security";

type PartyMemberSummary = Prisma.CharacterGetPayload<{ select: typeof partyCharacterSelect }>;

export default function MemberList({ party, isGM }: { party: { id: string; members: Array<{ id: string; character: PartyMemberSummary }> }, isGM: boolean }) {
  const [inviteId, setInviteId] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  async function handleInvite() {
    if (!inviteId) return;
    setIsLoading(true);
    try {
      await enrollCharacter(party.id, inviteId);
      setInviteId("");
      alert("Invitation sent. The character owner must accept it on their home page. Characters you own or enroll as an administrator are added immediately.");
    } catch {
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
        <div className="bg-[var(--ledger-surface-strong)] border border-[var(--ledger-line)]/55 rounded-sm p-6 shadow-xl">
          <h3 className="text-lg font-semibold text-[var(--ledger-ink)] flex items-center gap-2 mb-4">
            <UserPlus className="w-5 h-5 text-[var(--ledger-accent)]" />
            Recruit New Member
          </h3>
          <div className="flex gap-4">
            <input
              type="text"
              placeholder="Enter Character ID"
              className="flex-1 bg-[var(--ledger-paper)] border border-[var(--ledger-line)]/55 rounded-lg px-4 py-2 text-sm focus:ring-2 focus:ring-[var(--ledger-focus)] outline-none"
              value={inviteId}
              onChange={(e) => setInviteId(e.target.value)}
            />
            <button
              onClick={handleInvite}
              disabled={isLoading}
              className="bg-[rgba(127,48,40,0.12)] hover:bg-[rgba(127,48,40,0.12)] disabled:opacity-50 text-[var(--ledger-ink)] px-6 py-2 rounded-lg text-sm font-medium transition-colors"
            >
              Invite
            </button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {party.members.map((member) => {
          const char = member.character;

          const { physical: physicalCount, mental: mentalCount, isBroken } = summarizeConditions(char.physicalConditions, char.mentalConditions);

          return (
            <div key={member.id} className="bg-[var(--ledger-surface-strong)] border border-[var(--ledger-line)]/55 rounded-sm overflow-hidden hover:border-[var(--ledger-line)]/55 transition-colors group">
              <div className="p-6">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h4 className="text-xl font-bold text-[var(--ledger-ink)] group-hover:text-[var(--ledger-accent)] transition-colors">
                      {char.name}
                    </h4>
                    <p className="text-sm text-[var(--ledger-ink-soft)]">{char.archetype?.name}</p>
                  </div>
                  {isBroken && (
                    <span className="bg-red-500/20 text-[var(--ledger-danger)] text-xs font-bold px-2 py-1 rounded border border-red-500/30 flex items-center gap-1 animate-pulse">
                      <ShieldAlert className="w-3 h-3" />
                      BROKEN
                    </span>
                  )}
                </div>

                <div className="space-y-4">
                  {/* Physical Health */}
                  <div>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-[var(--ledger-ink-soft)] flex items-center gap-1">
                        <Heart className="w-3 h-3 text-[var(--ledger-danger)]" /> Physical
                      </span>
                      <span className={cn(physicalCount > 0 ? "text-[var(--ledger-danger)]" : "text-[var(--ledger-ink-soft)]")}>
                        {physicalCount}/3 Conditions
                      </span>
                    </div>
                    <div className="h-1.5 w-full bg-[var(--ledger-paper-deep)] rounded-full overflow-hidden">
                      <div
                        className={cn("h-full transition-all duration-500", physicalCount === 0 ? "bg-emerald-500" : physicalCount < 3 ? "bg-yellow-500" : "bg-red-600")}
                        style={{ width: `${(physicalCount / 3) * 100}%` }}
                      />
                    </div>
                  </div>

                  {/* Mental Health */}
                  <div>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-[var(--ledger-ink-soft)] flex items-center gap-1">
                        <Brain className="w-3 h-3 text-[var(--ledger-blue)]" /> Mental
                      </span>
                      <span className={cn(mentalCount > 0 ? "text-[var(--ledger-blue)]" : "text-[var(--ledger-ink-soft)]")}>
                        {mentalCount}/3 Conditions
                      </span>
                    </div>
                    <div className="h-1.5 w-full bg-[var(--ledger-paper-deep)] rounded-full overflow-hidden">
                      <div
                        className={cn("h-full transition-all duration-500", mentalCount === 0 ? "bg-emerald-500" : mentalCount < 3 ? "bg-blue-500" : "bg-[rgba(127,48,40,0.12)]")}
                        style={{ width: `${(mentalCount / 3) * 100}%` }}
                      />
                    </div>
                  </div>
                </div>
              </div>

              {isGM && (
                <div className="bg-[var(--ledger-paper-deep)] p-3 flex justify-end border-t border-[var(--ledger-line)]/55">
                  <button
                    onClick={() => handleRemove(member.id)}
                    className="text-[var(--ledger-ink-soft)] hover:text-[var(--ledger-danger)] p-2 rounded-lg hover:bg-red-400/10 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>
          );
        })}

        {party.members.length === 0 && (
          <div className="col-span-full py-12 text-center bg-[var(--ledger-surface-strong)] border border-dashed border-[var(--ledger-line)]/55 rounded-sm">
            <p className="text-[var(--ledger-ink-soft)] italic">No members in this party yet.</p>
          </div>
        )}
      </div>
    </div>
  );
}
