"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { MysteryEntityType, MysteryStatus } from "@prisma/client";
import {
  addMysteryClue,
  addMysteryEntity,
  addMysteryLocation,
  archiveMystery,
  createMystery,
  deleteMysteryClue,
  deleteMysteryEntity,
  deleteMysteryLocation,
  toggleMysteryClue,
  updateMystery,
  setMysteryVisibility,
} from "../../actions";

type MysteryCard = {
  id: string;
  title: string;
  summary: string;
  hook: string | null;
  aftermath: string | null;
  status: MysteryStatus;
  isPublished: boolean;
  startedAt: Date;
  completedAt: Date | null;
  clues: Array<{ id: string; content: string; isResolved: boolean; isRevealed: boolean }>;
  entities: Array<{ id: string; name: string; type: MysteryEntityType; details: string | null; isRevealed: boolean }>;
  locations: Array<{ id: string; name: string; details: string | null; isRevealed: boolean }>;
};

const STATUS_OPTIONS: MysteryStatus[] = ["PREP", "ACTIVE", "RESOLVED", "ARCHIVED"];

export default function MysteryBoard({
  partyId,
  mysteries,
  canEdit,
}: {
  partyId: string;
  mysteries: MysteryCard[];
  canEdit: boolean;
}) {
  const router = useRouter();
  const [isCreating, setIsCreating] = useState(false);
  const [filter, setFilter] = useState("CURRENT");
  const [query, setQuery] = useState("");
  const [error, setError] = useState("");
  const [draft, setDraft] = useState({ title: "", summary: "", hook: "", status: "PREP" as MysteryStatus });
  const [busyId, setBusyId] = useState<string | null>(null);
  useEffect(() => {
    const revealLinkedMystery = () => { if (window.location.hash) setFilter("ALL"); };
    revealLinkedMystery();
    window.addEventListener("hashchange", revealLinkedMystery);
    return () => window.removeEventListener("hashchange", revealLinkedMystery);
  }, []);
  const visibleMysteries = mysteries.filter(mystery =>
    (filter === "ALL" || (filter === "CURRENT" ? ["PREP", "ACTIVE"].includes(mystery.status) : mystery.status === filter)) &&
    (mystery.title + " " + mystery.summary).toLowerCase().includes(query.toLowerCase()),
  ).sort((a,b) => Number(b.status === "ACTIVE") - Number(a.status === "ACTIVE"));

  async function handleCreate(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!draft.title.trim() || !draft.summary.trim()) {
      return;
    }

    setError("");
    setBusyId("create");
    try {
      await createMystery(partyId, {
        title: draft.title.trim(),
        summary: draft.summary.trim(),
        hook: draft.hook.trim(),
        status: draft.status,
      });
      setDraft({ title: "", summary: "", hook: "", status: "PREP" });
      setIsCreating(false);
      router.refresh();
    } catch (e) { setError(e instanceof Error ? e.message : "Mystery creation failed"); } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="space-y-6">
      {error && <p role="alert" className="ledger-status">{error}</p>}
      <div className="ledger-search-toolbar"><label>Find a mystery<input type="search" value={query} onChange={event => setQuery(event.target.value)} placeholder="Title or summary..." /></label><label>Status<select value={filter} onChange={event => setFilter(event.target.value)}><option value="CURRENT">Current investigations</option><option value="ALL">All mysteries</option>{STATUS_OPTIONS.map(status => <option key={status} value={status}>{status}</option>)}</select></label></div>
      {canEdit ? (
        <div className="rounded-sm border border-[var(--ledger-line)]/55 bg-[var(--ledger-surface-strong)] p-5">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-bold text-[var(--ledger-ink)]">Mystery Log</h2>
              <p className="mt-1 text-sm text-[var(--ledger-ink-soft)]">Create, track, resolve, and archive investigations.</p>
            </div>
            <button
              type="button"
              onClick={() => setIsCreating((value) => !value)}
              className="rounded-full border border-[var(--ledger-accent)]/65 bg-[rgba(127,48,40,0.12)] px-5 py-3 text-sm font-semibold text-[var(--ledger-accent)] transition-colors hover:bg-[rgba(127,48,40,0.12)]"
            >
              {isCreating ? "Cancel" : "New Mystery"}
            </button>
          </div>

          {isCreating ? (
            <form onSubmit={handleCreate} className="mt-5 grid gap-4">
              <input
                aria-label="New mystery title"
                required
                value={draft.title}
                onChange={(event) => setDraft({ ...draft, title: event.target.value })}
                placeholder="The Lantern House"
                className="rounded-sm border border-[var(--ledger-line)]/55 bg-[var(--ledger-surface)] px-4 py-3 text-[var(--ledger-ink)] outline-none"
              />
              <textarea
                aria-label="New mystery summary"
                required
                value={draft.summary}
                onChange={(event) => setDraft({ ...draft, summary: event.target.value })}
                placeholder="What is known at the outset?"
                className="min-h-28 rounded-sm border border-[var(--ledger-line)]/55 bg-[var(--ledger-surface)] px-4 py-3 text-[var(--ledger-ink)] outline-none"
              />
              <div className="grid gap-4 md:grid-cols-[1fr_0.35fr_auto]">
                <input
                  aria-label="New mystery hook"
                  value={draft.hook}
                  onChange={(event) => setDraft({ ...draft, hook: event.target.value })}
                  placeholder="Initial hook"
                  className="rounded-sm border border-[var(--ledger-line)]/55 bg-[var(--ledger-surface)] px-4 py-3 text-[var(--ledger-ink)] outline-none"
                />
                <select
                  aria-label="New mystery status"
                  value={draft.status}
                  onChange={(event) => setDraft({ ...draft, status: event.target.value as MysteryStatus })}
                  className="rounded-sm border border-[var(--ledger-line)]/55 bg-[var(--ledger-surface)] px-4 py-3 text-[var(--ledger-ink)] outline-none"
                >
                  {STATUS_OPTIONS.map((status) => (
                    <option key={status} value={status}>
                      {status}
                    </option>
                  ))}
                </select>
                <button
                  type="submit"
                  disabled={busyId === "create"}
                  className="rounded-full border border-[var(--ledger-line)]/55 px-5 py-3 text-sm font-semibold text-[var(--ledger-ink)] transition-colors hover:border-[var(--ledger-line)]/55 disabled:opacity-60"
                >
                  {busyId === "create" ? "Creating..." : "Create"}
                </button>
              </div>
            </form>
          ) : null}
        </div>
      ) : null}

      <p role="status" className="ledger-helper-copy">{visibleMysteries.length} {visibleMysteries.length === 1 ? "mystery" : "mysteries"} in this view</p>
      {visibleMysteries.length > 0 ? (
        <div className="space-y-6">
          {visibleMysteries.map((mystery) => (
            <MysteryPanel
              key={mystery.id}
              mystery={mystery}
              canEdit={canEdit}
              busyId={busyId}
              setBusyId={setBusyId}
            />
          ))}
        </div>
      ) : (
        <div className="rounded-sm border border-dashed border-[var(--ledger-line)]/55 bg-[var(--ledger-paper)] p-6 text-sm text-[var(--ledger-ink-soft)]">
          {mysteries.length ? "No mysteries match this view. Try All mysteries or a different search." : "No mysteries logged for this party yet."}
        </div>
      )}
    </div>
  );
}

function MysteryPanel({
  mystery,
  canEdit,
  busyId,
  setBusyId,
}: {
  mystery: MysteryCard;
  canEdit: boolean;
  busyId: string | null;
  setBusyId: (value: string | null) => void;
}) {
  const router = useRouter();
  const [title, setTitle] = useState(mystery.title);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const panel = useRef<HTMLDetailsElement>(null);
  useEffect(() => {
    const openLinkedMystery = () => { if (window.location.hash === `#${mystery.id}` && panel.current) panel.current.open = true; };
    openLinkedMystery();
    window.addEventListener("hashchange", openLinkedMystery);
    return () => window.removeEventListener("hashchange", openLinkedMystery);
  }, [mystery.id]);
  const [summary, setSummary] = useState(mystery.summary);
  const [hook, setHook] = useState(mystery.hook ?? "");
  const [aftermath, setAftermath] = useState(mystery.aftermath ?? "");
  const [status, setStatus] = useState<MysteryStatus>(mystery.status);
  const [newClue, setNewClue] = useState("");
  const [newLocation, setNewLocation] = useState({ name: "", details: "" });
  const [newEntity, setNewEntity] = useState({ name: "", type: "PERSON" as MysteryEntityType, details: "" });

  async function saveCore() {
    setError(""); setNotice("");
    setBusyId(mystery.id);
    try {
      await updateMystery(mystery.id, {
        title: title.trim(),
        summary: summary.trim(),
        hook: hook.trim(),
        aftermath: aftermath.trim(),
        status,
      });
      setNotice("Mystery saved.");
      router.refresh();
    } catch (e) { setError(e instanceof Error ? e.message : "Mystery could not be saved"); } finally {
      setBusyId(null);
    }
  }

  return (
    <details ref={panel} id={mystery.id} open={mystery.status === "ACTIVE"} className="ledger-mystery border border-[var(--ledger-line)] bg-[var(--ledger-paper)]">
      <summary><span>{mystery.title}</span><span className="text-sm text-[var(--ledger-accent)]">{mystery.status}</span><span className="text-sm font-normal">{mystery.clues.length} clues</span></summary>
      <article className="p-4 sm:p-6">
      {error && <p role="alert" className="ledger-status">{error}</p>}{notice && <p role="status" className="ledger-status">{notice}</p>}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.25em] text-[var(--ledger-accent)]">{status}</p>
          {canEdit && <VisibilityButton kind="mystery" id={mystery.id} visible={mystery.isPublished} />}
          {canEdit ? (
            <input
              aria-label="Mystery title"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              className="mt-2 w-full rounded-sm border border-[var(--ledger-line)]/55 bg-[var(--ledger-surface)] px-4 py-3 text-2xl font-bold text-[var(--ledger-ink)] outline-none"
            />
          ) : (
            <h2 className="mt-2 text-2xl font-bold text-[var(--ledger-ink)]">{mystery.title}</h2>
          )}
        </div>
        <div className="text-right text-xs text-[var(--ledger-ink-soft)]">
          <p>Started {new Date(mystery.startedAt).toLocaleDateString()}</p>
          {mystery.completedAt ? <p>Completed {new Date(mystery.completedAt).toLocaleDateString()}</p> : null}
        </div>
      </div>

      <div className="mt-5 grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <div className="space-y-4">
          <label className="block text-sm font-medium text-[var(--ledger-ink)]">
            Summary
            {canEdit ? (
              <textarea
                value={summary}
                onChange={(event) => setSummary(event.target.value)}
                className="mt-2 min-h-28 w-full rounded-sm border border-[var(--ledger-line)]/55 bg-[var(--ledger-surface)] px-4 py-3 text-[var(--ledger-ink)] outline-none"
              />
            ) : (
              <p className="mt-2 rounded-sm border border-[var(--ledger-line)]/55 bg-[var(--ledger-surface)] p-4 text-sm text-[var(--ledger-ink)]">{summary}</p>
            )}
          </label>

          <label className="block text-sm font-medium text-[var(--ledger-ink)]">
            Hook
            {canEdit ? (
              <textarea
                value={hook}
                onChange={(event) => setHook(event.target.value)}
                className="mt-2 min-h-20 w-full rounded-sm border border-[var(--ledger-line)]/55 bg-[var(--ledger-surface)] px-4 py-3 text-[var(--ledger-ink)] outline-none"
              />
            ) : (
              <p className="mt-2 rounded-sm border border-[var(--ledger-line)]/55 bg-[var(--ledger-surface)] p-4 text-sm text-[var(--ledger-ink)]">{hook || "No hook recorded."}</p>
            )}
          </label>

          <label className="block text-sm font-medium text-[var(--ledger-ink)]">
            Aftermath
            {canEdit ? (
              <textarea
                value={aftermath}
                onChange={(event) => setAftermath(event.target.value)}
                className="mt-2 min-h-24 w-full rounded-sm border border-[var(--ledger-line)]/55 bg-[var(--ledger-surface)] px-4 py-3 text-[var(--ledger-ink)] outline-none"
              />
            ) : (
              <p className="mt-2 rounded-sm border border-[var(--ledger-line)]/55 bg-[var(--ledger-surface)] p-4 text-sm text-[var(--ledger-ink)]">{aftermath || "No aftermath recorded."}</p>
            )}
          </label>

          {canEdit ? (
            <div className="flex flex-wrap gap-3">
              <select
                aria-label="Mystery status"
                value={status}
                onChange={(event) => setStatus(event.target.value as MysteryStatus)}
                className="rounded-full border border-[var(--ledger-line)]/55 bg-[var(--ledger-surface)] px-4 py-2 text-sm text-[var(--ledger-ink)] outline-none"
              >
                {STATUS_OPTIONS.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
              <button
                type="button"
                disabled={busyId === mystery.id}
                onClick={saveCore}
                className="rounded-full border border-[var(--ledger-line)]/55 px-4 py-2 text-sm text-[var(--ledger-ink)] transition-colors hover:border-[var(--ledger-line)]/55 disabled:opacity-60"
              >
                Save Mystery
              </button>
              {status !== "ARCHIVED" ? (
                <button
                  type="button"
                  disabled={busyId === mystery.id}
                  onClick={async () => {
                    setBusyId(mystery.id);
                    try {
                      await archiveMystery(mystery.id);
                      router.refresh();
                    } catch (e) { setError(e instanceof Error ? e.message : "Archive failed"); } finally {
                      setBusyId(null);
                    }
                  }}
                  className="rounded-full border border-red-400/20 px-4 py-2 text-sm text-[var(--ledger-danger)] transition-colors hover:bg-red-500/10 disabled:opacity-60"
                >
                  Archive
                </button>
              ) : null}
            </div>
          ) : null}
        </div>

        <div className="space-y-4">
          <ClueSection
            mysteryId={mystery.id}
            clues={mystery.clues}
            canEdit={canEdit}
            newClue={newClue}
            setNewClue={setNewClue}
          />
          <EntitySection
            mysteryId={mystery.id}
            entities={mystery.entities}
            canEdit={canEdit}
            draft={newEntity}
            setDraft={setNewEntity}
          />
          <LocationSection
            mysteryId={mystery.id}
            locations={mystery.locations}
            canEdit={canEdit}
            draft={newLocation}
            setDraft={setNewLocation}
          />
        </div>
      </div>
      </article>
    </details>
  );
}

function useMysteryMutation() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const pending = useRef(false);
  async function run(action: () => Promise<unknown>) {
    if (pending.current) return;
    pending.current = true; setBusy(true); setError("");
    try { await action(); router.refresh(); }
    catch (e) { setError(e instanceof Error ? e.message : "This change could not be saved. Please try again."); }
    finally { pending.current = false; setBusy(false); }
  }
  return { run, busy, error };
}

function ClueSection({
  mysteryId,
  clues,
  canEdit,
  newClue,
  setNewClue,
}: {
  mysteryId: string;
  clues: Array<{ id: string; content: string; isResolved: boolean; isRevealed: boolean }>;
  canEdit: boolean;
  newClue: string;
  setNewClue: (value: string) => void;
}) {
  const { run, busy, error } = useMysteryMutation();

  return (
    <section aria-busy={busy} className="rounded-sm border border-[var(--ledger-line)]/55 bg-[var(--ledger-surface)] p-4">
      {error && <p role="alert" className="ledger-status mb-3">{error}</p>}
      <h3 className="text-lg font-semibold text-[var(--ledger-ink)]">Clues</h3>
      <div className="mt-3 space-y-2">
        {clues.length > 0 ? clues.map((clue) => (
          <div key={clue.id} className="flex items-start gap-3 rounded-lg border border-[var(--ledger-line)]/55 p-3">
            {canEdit ? (
              <input
                aria-label={`Resolve clue: ${clue.content}`}
                disabled={busy}
                type="checkbox"
                checked={clue.isResolved}
                onChange={async (event) => {
                  await run(() => toggleMysteryClue(clue.id, event.target.checked));
                }}
                className="mt-1"
              />
            ) : (
              <span className="mt-1 text-xs text-[var(--ledger-ink-soft)]">{clue.isResolved ? "Resolved" : "Open"}</span>
            )}
            <p className="flex-1 text-sm text-[var(--ledger-ink)]">{clue.content}
                {canEdit && <VisibilityButton kind="clue" id={clue.id} visible={clue.isRevealed} />}</p>
            {canEdit ? (
              <button
                disabled={busy}
                type="button"
                onClick={async () => {
                  await run(() => deleteMysteryClue(clue.id));
                }}
                className="text-xs text-[var(--ledger-danger)]"
              >
                Delete
              </button>
            ) : null}
          </div>
        )) : (
          <p className="text-sm text-[var(--ledger-ink-soft)]">No clues recorded.</p>
        )}
      </div>

      {canEdit ? (
        <form
          onSubmit={async (event) => {
            event.preventDefault();
            if (!newClue.trim()) {
              return;
            }
            await run(async () => { await addMysteryClue(mysteryId, newClue.trim()); setNewClue(""); });
          }}
          className="mt-4 flex gap-3"
        >
          <input
            aria-label="New clue"
            value={newClue}
            onChange={(event) => setNewClue(event.target.value)}
            className="flex-1 rounded-sm border border-[var(--ledger-line)]/55 bg-[var(--ledger-paper)] px-3 py-2 text-sm text-[var(--ledger-ink)] outline-none"
            placeholder="Add a clue"
          />
          <button disabled={busy} type="submit" className="rounded-full border border-[var(--ledger-line)]/55 px-4 py-2 text-sm text-[var(--ledger-ink)]">
            Add
          </button>
        </form>
      ) : null}
    </section>
  );
}

function EntitySection({
  mysteryId,
  entities,
  canEdit,
  draft,
  setDraft,
}: {
  mysteryId: string;
  entities: Array<{ id: string; name: string; type: MysteryEntityType; details: string | null; isRevealed: boolean }>;
  canEdit: boolean;
  draft: { name: string; type: MysteryEntityType; details: string };
  setDraft: (value: { name: string; type: MysteryEntityType; details: string }) => void;
}) {
  const { run, busy, error } = useMysteryMutation();

  return (
    <section aria-busy={busy} className="rounded-sm border border-[var(--ledger-line)]/55 bg-[var(--ledger-surface)] p-4">
      {error && <p role="alert" className="ledger-status mb-3">{error}</p>}
      <h3 className="text-lg font-semibold text-[var(--ledger-ink)]">Entities</h3>
      <div className="mt-3 space-y-2">
        {entities.length > 0 ? entities.map((entity) => (
          <div key={entity.id} className="rounded-lg border border-[var(--ledger-line)]/55 p-3">
            <div className="flex items-center justify-between gap-3">
              <p className="font-medium text-[var(--ledger-ink)]">{entity.name}</p>
              {canEdit && <VisibilityButton kind="entity" id={entity.id} visible={entity.isRevealed} />}
              <div className="flex items-center gap-3">
                <span className="text-xs uppercase tracking-[0.2em] text-[var(--ledger-ink-soft)]">{entity.type}</span>
                {canEdit ? (
                  <button
                disabled={busy}
                    type="button"
                    onClick={async () => {
                      await run(() => deleteMysteryEntity(entity.id));
                    }}
                    className="text-xs text-[var(--ledger-danger)]"
                  >
                    Delete
                  </button>
                ) : null}
              </div>
            </div>
            {entity.details ? <p className="mt-1 text-sm text-[var(--ledger-ink-soft)]">{entity.details}</p> : null}
          </div>
        )) : (
          <p className="text-sm text-[var(--ledger-ink-soft)]">No entities logged.</p>
        )}
      </div>

      {canEdit ? (
        <form
          onSubmit={async (event) => {
            event.preventDefault();
            if (!draft.name.trim()) {
              return;
            }
            await run(async () => { await addMysteryEntity(mysteryId, {
              name: draft.name.trim(),
              type: draft.type,
              details: draft.details.trim(),
            }); setDraft({ name: "", type: "PERSON", details: "" }); });
          }}
          className="mt-4 grid gap-3"
        >
          <div className="grid gap-3 md:grid-cols-[1fr_0.45fr]">
            <input
              aria-label="Entity name"
              value={draft.name}
              onChange={(event) => setDraft({ ...draft, name: event.target.value })}
              className="rounded-sm border border-[var(--ledger-line)]/55 bg-[var(--ledger-paper)] px-3 py-2 text-sm text-[var(--ledger-ink)] outline-none"
              placeholder="Name"
            />
            <select
              aria-label="Entity type"
              value={draft.type}
              onChange={(event) => setDraft({ ...draft, type: event.target.value as MysteryEntityType })}
              className="rounded-sm border border-[var(--ledger-line)]/55 bg-[var(--ledger-paper)] px-3 py-2 text-sm text-[var(--ledger-ink)] outline-none"
            >
              <option value="PERSON">Person</option>
              <option value="NPC">NPC</option>
              <option value="VAESEN">Vaesen</option>
            </select>
          </div>
          <input
            aria-label="Entity details"
            value={draft.details}
            onChange={(event) => setDraft({ ...draft, details: event.target.value })}
            className="rounded-sm border border-[var(--ledger-line)]/55 bg-[var(--ledger-paper)] px-3 py-2 text-sm text-[var(--ledger-ink)] outline-none"
            placeholder="Details"
          />
          <button disabled={busy} type="submit" className="w-fit rounded-full border border-[var(--ledger-line)]/55 px-4 py-2 text-sm text-[var(--ledger-ink)]">
            Add Entity
          </button>
        </form>
      ) : null}
    </section>
  );
}

function LocationSection({
  mysteryId,
  locations,
  canEdit,
  draft,
  setDraft,
}: {
  mysteryId: string;
  locations: Array<{ id: string; name: string; details: string | null; isRevealed: boolean }>;
  canEdit: boolean;
  draft: { name: string; details: string };
  setDraft: (value: { name: string; details: string }) => void;
}) {
  const { run, busy, error } = useMysteryMutation();

  return (
    <section aria-busy={busy} className="rounded-sm border border-[var(--ledger-line)]/55 bg-[var(--ledger-surface)] p-4">
      {error && <p role="alert" className="ledger-status mb-3">{error}</p>}
      <h3 className="text-lg font-semibold text-[var(--ledger-ink)]">Locations</h3>
      <div className="mt-3 space-y-2">
        {locations.length > 0 ? locations.map((location) => (
          <div key={location.id} className="rounded-lg border border-[var(--ledger-line)]/55 p-3">
            <div className="flex items-center justify-between gap-3">
              <p className="font-medium text-[var(--ledger-ink)]">{location.name}</p>
              {canEdit && <VisibilityButton kind="location" id={location.id} visible={location.isRevealed} />}
              {canEdit ? (
                <button
                disabled={busy}
                  type="button"
                  onClick={async () => {
                    await run(() => deleteMysteryLocation(location.id));
                  }}
                  className="text-xs text-[var(--ledger-danger)]"
                >
                  Delete
                </button>
              ) : null}
            </div>
            {location.details ? <p className="mt-1 text-sm text-[var(--ledger-ink-soft)]">{location.details}</p> : null}
          </div>
        )) : (
          <p className="text-sm text-[var(--ledger-ink-soft)]">No locations logged.</p>
        )}
      </div>

      {canEdit ? (
        <form
          onSubmit={async (event) => {
            event.preventDefault();
            if (!draft.name.trim()) {
              return;
            }
            await run(async () => { await addMysteryLocation(mysteryId, {
              name: draft.name.trim(),
              details: draft.details.trim(),
            }); setDraft({ name: "", details: "" }); });
          }}
          className="mt-4 grid gap-3"
        >
          <input
            aria-label="Location name"
            value={draft.name}
            onChange={(event) => setDraft({ ...draft, name: event.target.value })}
            className="rounded-sm border border-[var(--ledger-line)]/55 bg-[var(--ledger-paper)] px-3 py-2 text-sm text-[var(--ledger-ink)] outline-none"
            placeholder="Location name"
          />
          <input
            aria-label="Location details"
            value={draft.details}
            onChange={(event) => setDraft({ ...draft, details: event.target.value })}
            className="rounded-sm border border-[var(--ledger-line)]/55 bg-[var(--ledger-paper)] px-3 py-2 text-sm text-[var(--ledger-ink)] outline-none"
            placeholder="Details"
          />
          <button disabled={busy} type="submit" className="w-fit rounded-full border border-[var(--ledger-line)]/55 px-4 py-2 text-sm text-[var(--ledger-ink)]">
            Add Location
          </button>
        </form>
      ) : null}
    </section>
  );
}

function VisibilityButton({ kind, id, visible }: { kind: "mystery" | "clue" | "entity" | "location"; id: string; visible: boolean }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  return <span className="inline-flex flex-wrap gap-2">
    <button type="button" disabled={busy} className="ledger-roll-trigger text-xs" onClick={async () => {
      setBusy(true); setError("");
      try { await setMysteryVisibility(kind, id, !visible); router.refresh(); }
      catch (error) { setError(error instanceof Error ? error.message : "Visibility update failed"); }
      finally { setBusy(false); }
    }}>{visible ? "Hide from players" : "Reveal to players"}</button>
    {error && <span role="alert">{error}</span>}
  </span>;
}
