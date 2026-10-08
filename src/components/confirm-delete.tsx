"use client";
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";

export default function ConfirmDelete({ id, name, action }: { id: string; name: string; action: (data: FormData) => Promise<void> }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();
  async function remove() {
    setBusy(true); setError("");
    try {
      const data = new FormData(); data.set("id",id);
      await action(data); dialog.current?.close(); router.refresh();
    } catch (e) { setError(e instanceof Error ? e.message : "Deletion failed. This entry may still be in use."); }
    finally { setBusy(false); }
  }
  return <>
    <button type="button" className="ledger-button text-[var(--ledger-danger)]" aria-label={`Delete ${name}`} onClick={() => {setError("");dialog.current?.showModal();}}>Delete</button>
    <dialog ref={dialog} className="ledger-dialog" aria-label={`Delete ${name}`} onCancel={event => {if(busy) event.preventDefault();}}>
      <h2 className="text-2xl font-bold">Delete {name}?</h2><p className="mt-3">This removes the entry permanently. Entries used by characters or parties may not be deletable.</p>
      {error && <p role="alert" className="ledger-status mt-3">{error}</p>}
      <div className="mt-5 flex flex-wrap gap-3"><button type="button" autoFocus className="ledger-button" disabled={busy} onClick={() => dialog.current?.close()}>Keep Entry</button><button type="button" className="ledger-button ledger-button-primary" disabled={busy} onClick={remove}>{busy ? "Deleting..." : "Delete Permanently"}</button></div>
    </dialog>
  </>;
}
