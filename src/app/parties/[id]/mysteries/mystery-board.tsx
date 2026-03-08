"use client";

import { useState } from "react";
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
} from "../../actions";

type MysteryCard = {
  id: string;
  title: string;
  summary: string;
  hook: string | null;
  aftermath: string | null;
  status: MysteryStatus;
  startedAt: Date;
  completedAt: Date | null;
  clues: Array<{ id: string; content: string; isResolved: boolean }>;
  entities: Array<{ id: string; name: string; type: MysteryEntityType; details: string | null }>;
  locations: Array<{ id: string; name: string; details: string | null }>;
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
  const [draft, setDraft] = useState({ title: "", summary: "", hook: "", status: "PREP" as MysteryStatus });
  const [busyId, setBusyId] = useState<string | null>(null);

  async function handleCreate(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!draft.title.trim() || !draft.summary.trim()) {
      return;
    }

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
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="space-y-8">
      {canEdit ? (
        <div className="rounded-2xl border border-white/10 bg-neutral-900/70 p-5">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-bold text-white">Mystery Log</h2>
              <p className="mt-1 text-sm text-neutral-400">Create, track, resolve, and archive investigations.</p>
            </div>
            <button
              type="button"
              onClick={() => setIsCreating((value) => !value)}
              className="rounded-full border border-amber-300/30 bg-amber-500/10 px-5 py-3 text-sm font-semibold text-amber-100 transition-colors hover:bg-amber-500/20"
            >
              {isCreating ? "Cancel" : "New Mystery"}
            </button>
          </div>

          {isCreating ? (
            <form onSubmit={handleCreate} className="mt-5 grid gap-4">
              <input
                required
                value={draft.title}
                onChange={(event) => setDraft({ ...draft, title: event.target.value })}
                placeholder="The Lantern House"
                className="rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none"
              />
              <textarea
                required
                value={draft.summary}
                onChange={(event) => setDraft({ ...draft, summary: event.target.value })}
                placeholder="What is known at the outset?"
                className="min-h-28 rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none"
              />
              <div className="grid gap-4 md:grid-cols-[1fr_0.35fr_auto]">
                <input
                  value={draft.hook}
                  onChange={(event) => setDraft({ ...draft, hook: event.target.value })}
                  placeholder="Initial hook"
                  className="rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none"
                />
                <select
                  value={draft.status}
                  onChange={(event) => setDraft({ ...draft, status: event.target.value as MysteryStatus })}
                  className="rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none"
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
                  className="rounded-full border border-white/10 px-5 py-3 text-sm font-semibold text-white transition-colors hover:border-white/20 disabled:opacity-60"
                >
                  {busyId === "create" ? "Creating..." : "Create"}
                </button>
              </div>
            </form>
          ) : null}
        </div>
      ) : null}

      {mysteries.length > 0 ? (
        <div className="space-y-6">
          {mysteries.map((mystery) => (
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
        <div className="rounded-2xl border border-dashed border-white/10 bg-neutral-950/40 p-6 text-sm text-neutral-400">
          No mysteries logged for this party yet.
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
  const [summary, setSummary] = useState(mystery.summary);
  const [hook, setHook] = useState(mystery.hook ?? "");
  const [aftermath, setAftermath] = useState(mystery.aftermath ?? "");
  const [status, setStatus] = useState<MysteryStatus>(mystery.status);
  const [newClue, setNewClue] = useState("");
  const [newLocation, setNewLocation] = useState({ name: "", details: "" });
  const [newEntity, setNewEntity] = useState({ name: "", type: "PERSON" as MysteryEntityType, details: "" });

  async function saveCore() {
    setBusyId(mystery.id);
    try {
      await updateMystery(mystery.id, {
        title: title.trim(),
        summary: summary.trim(),
        hook: hook.trim(),
        aftermath: aftermath.trim(),
        status,
      });
      router.refresh();
    } finally {
      setBusyId(null);
    }
  }

  return (
    <article className="rounded-2xl border border-white/10 bg-neutral-950/60 p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.25em] text-amber-200">{status}</p>
          {canEdit ? (
            <input
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              className="mt-2 w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-2xl font-bold text-white outline-none"
            />
          ) : (
            <h2 className="mt-2 text-2xl font-bold text-white">{mystery.title}</h2>
          )}
        </div>
        <div className="text-right text-xs text-neutral-500">
          <p>Started {new Date(mystery.startedAt).toLocaleDateString()}</p>
          {mystery.completedAt ? <p>Completed {new Date(mystery.completedAt).toLocaleDateString()}</p> : null}
        </div>
      </div>

      <div className="mt-5 grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <div className="space-y-4">
          <label className="block text-sm font-medium text-neutral-300">
            Summary
            {canEdit ? (
              <textarea
                value={summary}
                onChange={(event) => setSummary(event.target.value)}
                className="mt-2 min-h-28 w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none"
              />
            ) : (
              <p className="mt-2 rounded-xl border border-white/10 bg-white/5 p-4 text-sm text-neutral-300">{summary}</p>
            )}
          </label>

          <label className="block text-sm font-medium text-neutral-300">
            Hook
            {canEdit ? (
              <textarea
                value={hook}
                onChange={(event) => setHook(event.target.value)}
                className="mt-2 min-h-20 w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none"
              />
            ) : (
              <p className="mt-2 rounded-xl border border-white/10 bg-white/5 p-4 text-sm text-neutral-300">{hook || "No hook recorded."}</p>
            )}
          </label>

          <label className="block text-sm font-medium text-neutral-300">
            Aftermath
            {canEdit ? (
              <textarea
                value={aftermath}
                onChange={(event) => setAftermath(event.target.value)}
                className="mt-2 min-h-24 w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none"
              />
            ) : (
              <p className="mt-2 rounded-xl border border-white/10 bg-white/5 p-4 text-sm text-neutral-300">{aftermath || "No aftermath recorded."}</p>
            )}
          </label>

          {canEdit ? (
            <div className="flex flex-wrap gap-3">
              <select
                value={status}
                onChange={(event) => setStatus(event.target.value as MysteryStatus)}
                className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-white outline-none"
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
                className="rounded-full border border-white/10 px-4 py-2 text-sm text-white transition-colors hover:border-white/20 disabled:opacity-60"
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
                    } finally {
                      setBusyId(null);
                    }
                  }}
                  className="rounded-full border border-red-400/20 px-4 py-2 text-sm text-red-200 transition-colors hover:bg-red-500/10 disabled:opacity-60"
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
  );
}

function ClueSection({
  mysteryId,
  clues,
  canEdit,
  newClue,
  setNewClue,
}: {
  mysteryId: string;
  clues: Array<{ id: string; content: string; isResolved: boolean }>;
  canEdit: boolean;
  newClue: string;
  setNewClue: (value: string) => void;
}) {
  const router = useRouter();

  return (
    <section className="rounded-xl border border-white/10 bg-white/5 p-4">
      <h3 className="text-lg font-semibold text-white">Clues</h3>
      <div className="mt-3 space-y-2">
        {clues.length > 0 ? clues.map((clue) => (
          <div key={clue.id} className="flex items-start gap-3 rounded-lg border border-white/10 p-3">
            {canEdit ? (
              <input
                type="checkbox"
                checked={clue.isResolved}
                onChange={async (event) => {
                  await toggleMysteryClue(clue.id, event.target.checked);
                  router.refresh();
                }}
                className="mt-1"
              />
            ) : (
              <span className="mt-1 text-xs text-neutral-500">{clue.isResolved ? "Resolved" : "Open"}</span>
            )}
            <p className="flex-1 text-sm text-neutral-300">{clue.content}</p>
            {canEdit ? (
              <button
                type="button"
                onClick={async () => {
                  await deleteMysteryClue(clue.id);
                  router.refresh();
                }}
                className="text-xs text-red-200"
              >
                Delete
              </button>
            ) : null}
          </div>
        )) : (
          <p className="text-sm text-neutral-500">No clues recorded.</p>
        )}
      </div>

      {canEdit ? (
        <form
          onSubmit={async (event) => {
            event.preventDefault();
            if (!newClue.trim()) {
              return;
            }
            await addMysteryClue(mysteryId, newClue.trim());
            setNewClue("");
            router.refresh();
          }}
          className="mt-4 flex gap-3"
        >
          <input
            value={newClue}
            onChange={(event) => setNewClue(event.target.value)}
            className="flex-1 rounded-xl border border-white/10 bg-neutral-950/70 px-3 py-2 text-sm text-white outline-none"
            placeholder="Add a clue"
          />
          <button type="submit" className="rounded-full border border-white/10 px-4 py-2 text-sm text-white">
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
  entities: Array<{ id: string; name: string; type: MysteryEntityType; details: string | null }>;
  canEdit: boolean;
  draft: { name: string; type: MysteryEntityType; details: string };
  setDraft: (value: { name: string; type: MysteryEntityType; details: string }) => void;
}) {
  const router = useRouter();

  return (
    <section className="rounded-xl border border-white/10 bg-white/5 p-4">
      <h3 className="text-lg font-semibold text-white">Entities</h3>
      <div className="mt-3 space-y-2">
        {entities.length > 0 ? entities.map((entity) => (
          <div key={entity.id} className="rounded-lg border border-white/10 p-3">
            <div className="flex items-center justify-between gap-3">
              <p className="font-medium text-white">{entity.name}</p>
              <div className="flex items-center gap-3">
                <span className="text-xs uppercase tracking-[0.2em] text-neutral-500">{entity.type}</span>
                {canEdit ? (
                  <button
                    type="button"
                    onClick={async () => {
                      await deleteMysteryEntity(entity.id);
                      router.refresh();
                    }}
                    className="text-xs text-red-200"
                  >
                    Delete
                  </button>
                ) : null}
              </div>
            </div>
            {entity.details ? <p className="mt-1 text-sm text-neutral-400">{entity.details}</p> : null}
          </div>
        )) : (
          <p className="text-sm text-neutral-500">No entities logged.</p>
        )}
      </div>

      {canEdit ? (
        <form
          onSubmit={async (event) => {
            event.preventDefault();
            if (!draft.name.trim()) {
              return;
            }
            await addMysteryEntity(mysteryId, {
              name: draft.name.trim(),
              type: draft.type,
              details: draft.details.trim(),
            });
            setDraft({ name: "", type: "PERSON", details: "" });
            router.refresh();
          }}
          className="mt-4 grid gap-3"
        >
          <div className="grid gap-3 md:grid-cols-[1fr_0.45fr]">
            <input
              value={draft.name}
              onChange={(event) => setDraft({ ...draft, name: event.target.value })}
              className="rounded-xl border border-white/10 bg-neutral-950/70 px-3 py-2 text-sm text-white outline-none"
              placeholder="Name"
            />
            <select
              value={draft.type}
              onChange={(event) => setDraft({ ...draft, type: event.target.value as MysteryEntityType })}
              className="rounded-xl border border-white/10 bg-neutral-950/70 px-3 py-2 text-sm text-white outline-none"
            >
              <option value="PERSON">Person</option>
              <option value="NPC">NPC</option>
              <option value="VAESEN">Vaesen</option>
            </select>
          </div>
          <input
            value={draft.details}
            onChange={(event) => setDraft({ ...draft, details: event.target.value })}
            className="rounded-xl border border-white/10 bg-neutral-950/70 px-3 py-2 text-sm text-white outline-none"
            placeholder="Details"
          />
          <button type="submit" className="w-fit rounded-full border border-white/10 px-4 py-2 text-sm text-white">
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
  locations: Array<{ id: string; name: string; details: string | null }>;
  canEdit: boolean;
  draft: { name: string; details: string };
  setDraft: (value: { name: string; details: string }) => void;
}) {
  const router = useRouter();

  return (
    <section className="rounded-xl border border-white/10 bg-white/5 p-4">
      <h3 className="text-lg font-semibold text-white">Locations</h3>
      <div className="mt-3 space-y-2">
        {locations.length > 0 ? locations.map((location) => (
          <div key={location.id} className="rounded-lg border border-white/10 p-3">
            <div className="flex items-center justify-between gap-3">
              <p className="font-medium text-white">{location.name}</p>
              {canEdit ? (
                <button
                  type="button"
                  onClick={async () => {
                    await deleteMysteryLocation(location.id);
                    router.refresh();
                  }}
                  className="text-xs text-red-200"
                >
                  Delete
                </button>
              ) : null}
            </div>
            {location.details ? <p className="mt-1 text-sm text-neutral-400">{location.details}</p> : null}
          </div>
        )) : (
          <p className="text-sm text-neutral-500">No locations logged.</p>
        )}
      </div>

      {canEdit ? (
        <form
          onSubmit={async (event) => {
            event.preventDefault();
            if (!draft.name.trim()) {
              return;
            }
            await addMysteryLocation(mysteryId, {
              name: draft.name.trim(),
              details: draft.details.trim(),
            });
            setDraft({ name: "", details: "" });
            router.refresh();
          }}
          className="mt-4 grid gap-3"
        >
          <input
            value={draft.name}
            onChange={(event) => setDraft({ ...draft, name: event.target.value })}
            className="rounded-xl border border-white/10 bg-neutral-950/70 px-3 py-2 text-sm text-white outline-none"
            placeholder="Location name"
          />
          <input
            value={draft.details}
            onChange={(event) => setDraft({ ...draft, details: event.target.value })}
            className="rounded-xl border border-white/10 bg-neutral-950/70 px-3 py-2 text-sm text-white outline-none"
            placeholder="Details"
          />
          <button type="submit" className="w-fit rounded-full border border-white/10 px-4 py-2 text-sm text-white">
            Add Location
          </button>
        </form>
      ) : null}
    </section>
  );
}
