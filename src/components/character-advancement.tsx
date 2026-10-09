"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { getCharacterAdvancements, tryPurchaseCharacterAdvancement } from "@/app/characters/actions";
import { ADVANCE_XP_COST, MAX_SKILL_RANK, skillLabel, type AdvancementEntry, type AdvancementInput } from "@/lib/advancement-rules";
import { SKILL_KEYS } from "@/lib/character-rules";

type Props = {
  characterId: string; canEdit: boolean; experiencePoints: number; experienceVersion: number;
  skills: Record<typeof SKILL_KEYS[number], number>; hasSkillRecord: boolean;
  availableTalents: { id: string; name: string; description: string; type: string }[];
  history: AdvancementEntry[]; hasMore: boolean; disabled: boolean;
  onBusy: (busy: boolean) => void;
  onUpdated: (xp: number, version: number) => void;
};

export default function CharacterAdvancement(props: Props) {
  const dialog = useRef<HTMLDialogElement>(null);
  const router = useRouter();
  const [tab, setTab] = useState<"SKILL" | "TALENT" | "HISTORY">("SKILL");
  const [skill, setSkill] = useState<typeof SKILL_KEYS[number] | "">("");
  const [talentId, setTalentId] = useState("");
  const [search, setSearch] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [history, setHistory] = useState(props.history);
  const [hasMore, setHasMore] = useState(props.hasMore);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const requestId = useRef("");
  const pendingInput = useRef<AdvancementInput | null>(null);
  useEffect(() => { setHistory(props.history); setHasMore(props.hasMore); }, [props.history, props.hasMore]);
  const talent = props.availableTalents.find(entry => entry.id === talentId);
  const nextRank = skill ? props.skills[skill] + 1 : 0;
  const canBuy = props.canEdit && !busy && !props.disabled && props.experiencePoints >= ADVANCE_XP_COST &&
    (tab === "SKILL" ? Boolean(skill && props.hasSkillRecord && nextRank <= MAX_SKILL_RANK) : tab === "TALENT" && Boolean(talent));
  function newChoice() { requestId.current = crypto.randomUUID(); pendingInput.current = null; setError(""); setSuccess(""); }
  async function purchase() {
    if (!canBuy) return;
    requestId.current ||= crypto.randomUUID();
    const shared = { requestId: requestId.current, expectedVersion: props.experienceVersion };
    const input: AdvancementInput = pendingInput.current ?? (tab === "SKILL" && skill
      ? { ...shared, kind: "SKILL", target: skill, expectedRank: props.skills[skill] }
      : { ...shared, kind: "TALENT", target: talentId });
    pendingInput.current = input;
    setBusy(true); props.onBusy(true); setError(""); setSuccess("");
    try {
      const result = await tryPurchaseCharacterAdvancement(props.characterId, input);
      if (!result.ok) {
        setError(result.error);
        if (!result.error.startsWith("The Advance could not be confirmed")) { pendingInput.current = null; requestId.current = ""; }
        router.refresh(); return;
      }
      props.onUpdated(result.experiencePoints, result.experienceVersion);
      setSuccess(`${result.entry.targetName} advanced. ${result.entry.xpCost} XP spent.`);
      setSkill(""); setTalentId(""); requestId.current = ""; pendingInput.current = null;
      setHistory(current => [result.entry, ...current.filter(entry => entry.id !== result.entry.id)]);
      router.refresh();
    } catch { setError("Could not confirm the purchase. Retry the same choice to safely check it, or refresh the sheet."); }
    finally { setBusy(false); props.onBusy(false); }
  }
  async function moreHistory() {
    setLoadingHistory(true); setError("");
    try {
      const result = await getCharacterAdvancements(props.characterId, history.at(-1)?.id);
      setHistory(current => [...current, ...result.entries.filter(entry => !current.some(previous => previous.id === entry.id))]);
      setHasMore(result.hasMore);
    } catch { setError("History could not be loaded. Please retry."); }
    finally { setLoadingHistory(false); }
  }
  return <>
    <button type="button" className="ledger-button mt-3 w-full" disabled={props.disabled} onClick={() => { setError(""); setSuccess(""); dialog.current?.showModal(); }}>Advancement &amp; History</button>
    <dialog ref={dialog} className="ledger-dialog m-auto max-h-[90dvh] overflow-y-auto break-words" aria-labelledby="advancement-title" onCancel={event => { if (busy) event.preventDefault(); }}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0"><h2 id="advancement-title" className="text-xl font-bold sm:text-2xl">Character Advancement</h2><p className="mt-2">{props.experiencePoints} unspent XP</p></div>
        <button type="button" className="ledger-button" disabled={busy} onClick={() => dialog.current?.close()} aria-label="Close advancement">Close</button>
      </div>
      <p className="mt-3 text-sm">Each Advance costs 5 XP: raise one skill by one (maximum 5), or learn one new talent. Talents from every archetype are available. Attributes and Resources cannot be bought here.</p>
      <div className="mt-4 flex flex-wrap gap-2" aria-label="Advancement sections">
        {([['SKILL', 'Skills'], ['TALENT', 'Talents'], ['HISTORY', 'History']] as const).map(([value, label]) => <button key={value} type="button" className={`ledger-button ${tab === value ? 'ledger-button-primary' : ''}`} aria-pressed={tab === value} disabled={busy} onClick={() => { setTab(value); newChoice(); }}>{label}</button>)}
      </div>
      {error && <p role="alert" className="ledger-status mt-3">{error}</p>}
      {success && <p role="status" className="ledger-status mt-3">{success}</p>}
      {tab === "SKILL" && <div className="mt-4 space-y-3">
        <label className="block font-bold" htmlFor="advance-skill">Skill to Advance</label>
        <select id="advance-skill" className="ledger-input w-full" value={skill} disabled={busy || !props.hasSkillRecord} onChange={event => { setSkill(event.target.value as typeof skill); newChoice(); }}>
          <option value="">Choose a skill</option>
          {SKILL_KEYS.map(key => <option key={key} value={key} disabled={props.skills[key] >= MAX_SKILL_RANK}>{skillLabel(key)}: {props.skills[key]}{props.skills[key] >= MAX_SKILL_RANK ? ' (maximum)' : ` to ${props.skills[key] + 1}`}</option>)}
        </select>
        {!props.hasSkillRecord && <p className="ledger-status">This legacy sheet has no skill record. Ask an administrator to repair it before advancing skills.</p>}
      </div>}
      {tab === "TALENT" && <div className="mt-4 space-y-3">
        <label className="block font-bold" htmlFor="advance-search">Search Talents</label>
        <input id="advance-search" className="ledger-input w-full" type="search" value={search} onChange={event => setSearch(event.target.value)} disabled={busy} />
        <label className="block font-bold" htmlFor="advance-talent">Talent to Learn</label>
        <select id="advance-talent" className="ledger-input w-full" value={talentId} disabled={busy} onChange={event => { setTalentId(event.target.value); newChoice(); }}>
          <option value="">Choose a new talent</option>
          {props.availableTalents.filter(entry => entry.id === talentId || `${entry.name} ${entry.description}`.toLowerCase().includes(search.toLowerCase())).map(entry => <option key={entry.id} value={entry.id}>{entry.name}</option>)}
        </select>
        {talent && <article className="ledger-panel p-3"><h3 className="font-bold">{talent.name}</h3><p className="mt-2 whitespace-pre-wrap">{talent.description}</p></article>}
        {!props.availableTalents.length && <p>No unlearned talents are available. Ask an administrator to add more catalogue entries.</p>}
      </div>}
      {tab !== "HISTORY" && <div className="mt-5 border-t border-[var(--ledger-line)] pt-4 space-y-3">
        <p>{skill && tab === "SKILL" ? `${skillLabel(skill)}: ${props.skills[skill]} to ${nextRank}. ` : talent && tab === "TALENT" ? `Learn ${talent.name}. ` : "Choose an advancement. "}Cost: 5 XP. {props.experiencePoints >= 5 ? `Remaining after purchase: ${props.experiencePoints - 5} XP.` : "You need at least 5 XP."}</p>
        <p className="text-sm">Purchases are recorded and cannot be undone from this sheet.</p>
        <button type="button" className="ledger-button ledger-button-primary w-full" disabled={!canBuy} onClick={purchase}>{busy ? "Saving Advance..." : "Confirm: Spend 5 XP"}</button>
      </div>}
      {tab === "HISTORY" && <div className="mt-4 space-y-3">
        {!history.length && <p>No XP purchases recorded yet. This history begins when an Advance is bought in the app; existing skills and talents are not backfilled.</p>}
        <ol className="space-y-3">{history.map(entry => <li key={entry.id} className="ledger-panel p-3">
          <p className="font-bold">{entry.targetName}{entry.kind === "SKILL" ? `: ${entry.previousValue} to ${entry.newValue}` : " learned"}</p>
          <p className="text-sm">Spent {entry.xpCost} XP / Balance {entry.xpBefore} to {entry.xpAfter}</p>
          <p className="mt-1 text-sm">{new Date(entry.createdAt).toLocaleString()} / {entry.actorName}</p>
        </li>)}</ol>
        {hasMore && <button type="button" className="ledger-button" disabled={loadingHistory} onClick={moreHistory}>{loadingHistory ? "Loading..." : "Load Older Advances"}</button>}
      </div>}
    </dialog>
  </>;
}
