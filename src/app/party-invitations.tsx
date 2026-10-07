"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { respondToInvitation } from "./parties/actions";

export default function PartyInvitations({ invitations }: {
  invitations: Array<{ id: string; party: { name: string }; character: { name: string } }>;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState("");
  async function respond(id: string, accept: boolean) {
    setBusy(id);
    setError("");
    try {
      await respondToInvitation(id, accept);
      router.refresh();
    } catch (error) {
      setError(error instanceof Error ? error.message : "Could not respond to invitation");
    } finally { setBusy(null); }
  }
  if (!invitations.length) return null;
  return <section className="ledger-panel p-5 space-y-4">
    <h2 className="text-2xl font-bold">Party Invitations</h2>
    <p>Accepting grants this party&apos;s GM access to your character sheet.</p>
    {error && <p role="alert">{error}</p>}
    {invitations.map((invitation) => <div key={invitation.id} className="flex flex-wrap items-center gap-3">
      <p className="flex-1">{invitation.character.name} invited to {invitation.party.name}</p>
      <button className="ledger-roll-trigger" disabled={busy !== null} onClick={() => respond(invitation.id, true)}>Accept</button>
      <button className="ledger-roll-trigger" disabled={busy !== null} onClick={() => respond(invitation.id, false)}>Decline</button>
    </div>)}
  </section>;
}
