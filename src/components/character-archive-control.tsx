"use client";

import { useRef, useState } from "react";
import { archiveCharacter } from "@/app/characters/actions";

export default function CharacterArchiveControl({ id, name, version, archived, partyCount }: { id: string; name: string; version: number; archived: boolean; partyCount: number }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [confirmation, setConfirmation] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const verb = archived ? "Restore" : "Remove";
  async function confirm() {
    setBusy(true); setError("");
    try {
      await archiveCharacter({ id, confirmationName: confirmation, expectedVersion: version, archived: !archived });
      window.location.assign(archived ? `/characters/${id}` : "/characters?view=archived");
    } catch (e) { setError(e instanceof Error ? e.message : "Could not confirm this change. Reload and try again."); setBusy(false); }
  }
  return <>
    <button type="button" aria-label={`${verb} ${name}`} className="ledger-button" onClick={() => { setConfirmation(""); setError(""); dialog.current?.showModal(); }}>{verb} Character</button>
    <dialog ref={dialog} className="ledger-dialog m-auto text-left max-h-[90dvh] overflow-y-auto" aria-label={`${verb} ${name}`} onCancel={event => { if (busy) event.preventDefault(); }}>
      <h2 className="text-2xl font-bold break-words">{verb} {name}?</h2>
      <p className="mt-3">{archived ? "Restore this character to your active ledger and any preserved party memberships." : "This archives your character, hides it from Home and active party rosters, and disables sheet edits. Restore it at any time from Characters > Archived."}</p>
      <p className="mt-3">Saved notes, relationships, scores, conditions, XP history, and personal equipment are kept. Shared mysteries, goals, stash, and headquarters are not deleted.</p>
      <p className="mt-3">{partyCount} preserved party {partyCount === 1 ? "membership" : "memberships"}. {archived ? "An invitation or membership removed by a GM will not be recreated." : "Party access through this character pauses while archived. Finish pending sheet saves before confirming."}</p>
      <label className="block mt-4 font-bold">Type {name} to confirm<input autoFocus autoComplete="off" className="ledger-input mt-2 w-full" value={confirmation} onChange={event => setConfirmation(event.target.value)} disabled={busy} /></label>
      {error && <p role="alert" className="ledger-status mt-3">{error}</p>}
      <div className="mt-5 flex flex-wrap gap-3"><button type="button" className="ledger-button" disabled={busy} onClick={() => dialog.current?.close()}>Cancel</button><button type="button" className="ledger-button ledger-button-primary" disabled={busy || confirmation.trim() !== name.trim()} onClick={confirm}>{busy ? "Saving..." : archived ? "Restore Character" : "Archive Character"}</button></div>
    </dialog>
  </>;
}
