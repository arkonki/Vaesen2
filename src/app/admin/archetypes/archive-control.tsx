"use client";

import { useRef, useState } from "react";
import { archiveArchetype } from "../actions";

export default function ArchiveControl({ id, name, revision, archived, characterCount }: { id: string; name: string; revision: number; archived: boolean; characterCount: number }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [confirmation, setConfirmation] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const verb = archived ? "Restore" : "Remove";

  async function confirm() {
    setBusy(true); setError("");
    try {
      await archiveArchetype({ id, expectedRevision: revision, confirmationName: confirmation, archived: !archived });
      // Reload the filtered catalogue only after the transaction commits.
      window.location.reload();
    } catch (e) { setError(e instanceof Error ? e.message : "Could not change this entry. Reload and try again."); }
    finally { setBusy(false); }
  }

  return <>
    <button type="button" className="ledger-button" aria-label={`${verb} ${name}`} onClick={() => { setConfirmation(""); setError(""); dialog.current?.showModal(); }}>{verb}</button>
    <dialog ref={dialog} className="ledger-dialog m-auto text-left max-h-[90dvh] overflow-y-auto" aria-label={`${verb} ${name}`} onCancel={event => { if (busy) event.preventDefault(); }}>
      <h2 className="text-2xl font-bold">{verb} {name}?</h2>
      <p className="mt-3">{archived ? "Restore this template to the compendium and character wizard." : "This archives the template and hides it from the compendium and character wizard. You can restore it from the Archived tab."}</p>
      <p className="mt-3">{characterCount} existing {characterCount === 1 ? "character uses" : "characters use"} this entry. Character scores, learned talents, and equipment are not changed or deleted. Linked talent and item records are kept.</p>
      <label className="block mt-4 font-bold">Type {name} to confirm<input autoFocus className="ledger-input w-full mt-2" value={confirmation} onChange={event => setConfirmation(event.target.value)} disabled={busy} autoComplete="off" /></label>
      {error && <p role="alert" className="ledger-status mt-3">{error}</p>}
      <div className="mt-5 flex flex-wrap gap-3"><button type="button" className="ledger-button" disabled={busy} onClick={() => dialog.current?.close()}>Cancel</button><button type="button" className="ledger-button ledger-button-primary" disabled={busy || confirmation.trim() !== name} onClick={confirm}>{busy ? "Saving..." : archived ? "Restore Entry" : "Archive Entry"}</button></div>
    </dialog>
  </>;
}
