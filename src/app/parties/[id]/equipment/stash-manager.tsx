"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ItemType } from "@prisma/client";
import { CARRIED_TYPES } from "@/lib/equipment";
import { removePartyStashItem, upsertPartyStashItem } from "../../actions";

type ItemOption = {
  id: string;
  name: string;
  type: ItemType;
  bonus: number;
  availability: number;
  description: string | null;
};

type StashEntry = {
  id: string;
  quantity: number;
  notes: string | null;
  item: ItemOption;
};

const TYPE_LABELS: Record<ItemType, string> = {
  WEAPON: "Weapons",
  ARMOR: "Armor",
  GEAR: "Equipment",
  MAGIC: "Special",
  SERVICE: "Services",
  COVER: "Cover",
  ATTACK: "Attack references",
};

export default function StashManager({
  partyId,
  items,
  stashItems,
  canEdit,
}: {
  partyId: string;
  items: ItemOption[];
  stashItems: StashEntry[];
  canEdit: boolean;
}) {
  const router = useRouter();
  const [selectedItemId, setSelectedItemId] = useState(items[0]?.id ?? "");
  const [quantity, setQuantity] = useState("1");
  const [notes, setNotes] = useState("");
  const [busyKey, setBusyKey] = useState<string | null>(null);

  const grouped = useMemo(() => {
    return CARRIED_TYPES.map((type) => ({
      type,
      label: TYPE_LABELS[type],
      entries: stashItems.filter((entry) => entry.item.type === type),
    }));
  }, [stashItems]);

  async function handleAdd(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedItemId) {
      return;
    }

    setBusyKey("create");
    try {
      await upsertPartyStashItem(partyId, selectedItemId, Math.max(1, Number(quantity) || 1), notes.trim());
      setQuantity("1");
      setNotes("");
      router.refresh();
    } finally {
      setBusyKey(null);
    }
  }

  async function handleUpdate(itemId: string, nextQuantity: number, nextNotes: string) {
    setBusyKey(itemId);
    try {
      await upsertPartyStashItem(partyId, itemId, nextQuantity, nextNotes);
      router.refresh();
    } finally {
      setBusyKey(null);
    }
  }

  async function handleRemove(itemId: string) {
    setBusyKey(itemId);
    try {
      await removePartyStashItem(partyId, itemId);
      router.refresh();
    } finally {
      setBusyKey(null);
    }
  }

  return (
    <div className="space-y-8">
      {canEdit ? (
        <form onSubmit={handleAdd} className="grid gap-4 rounded-sm border border-[var(--ledger-line)]/55 bg-[var(--ledger-surface-strong)] p-5 lg:grid-cols-[1.2fr_0.3fr_1fr_auto]">
          <div>
            <label className="mb-2 block text-sm font-medium text-[var(--ledger-ink)]">Item</label>
            <select
              value={selectedItemId}
              onChange={(event) => setSelectedItemId(event.target.value)}
              className="w-full rounded-sm border border-[var(--ledger-line)]/55 bg-[var(--ledger-surface)] px-4 py-3 text-[var(--ledger-ink)] outline-none"
            >
              {items.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name} · {TYPE_LABELS[item.type]}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-[var(--ledger-ink)]">Qty</label>
            <input
              type="number"
              min={1}
              value={quantity}
              onChange={(event) => setQuantity(event.target.value)}
              className="w-full rounded-sm border border-[var(--ledger-line)]/55 bg-[var(--ledger-surface)] px-4 py-3 text-[var(--ledger-ink)] outline-none"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-[var(--ledger-ink)]">Notes</label>
            <input
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              placeholder="Stashed after the latest mystery"
              className="w-full rounded-sm border border-[var(--ledger-line)]/55 bg-[var(--ledger-surface)] px-4 py-3 text-[var(--ledger-ink)] outline-none"
            />
          </div>

          <div className="flex items-end">
            <button
              type="submit"
              disabled={busyKey === "create" || items.length === 0}
              className="rounded-full border border-[var(--ledger-accent)]/65 bg-[rgba(127,48,40,0.12)] px-5 py-3 text-sm font-semibold text-[var(--ledger-accent)] transition-colors hover:bg-[rgba(127,48,40,0.12)] disabled:opacity-60"
            >
              {busyKey === "create" ? "Saving..." : "Add to Stash"}
            </button>
          </div>
        </form>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-2">
        {grouped.map((group) => (
          <section key={group.type} className="rounded-sm border border-[var(--ledger-line)]/55 bg-[var(--ledger-paper)] p-5">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-xl font-bold text-[var(--ledger-ink)]">{group.label}</h2>
              <span className="text-xs uppercase tracking-[0.2em] text-[var(--ledger-ink-soft)]">{group.entries.length} entries</span>
            </div>

            <div className="mt-4 space-y-3">
              {group.entries.length > 0 ? (
                group.entries.map((entry) => (
                  <StashEntryCard
                    key={entry.id}
                    entry={entry}
                    canEdit={canEdit}
                    isBusy={busyKey === entry.item.id}
                    onSave={handleUpdate}
                    onRemove={handleRemove}
                  />
                ))
              ) : (
                <div className="rounded-sm border border-dashed border-[var(--ledger-line)]/55 p-4 text-sm text-[var(--ledger-ink-soft)]">
                  No {group.label.toLowerCase()} stored here.
                </div>
              )}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}

function StashEntryCard({
  entry,
  canEdit,
  isBusy,
  onSave,
  onRemove,
}: {
  entry: StashEntry;
  canEdit: boolean;
  isBusy: boolean;
  onSave: (itemId: string, quantity: number, notes: string) => Promise<void>;
  onRemove: (itemId: string) => Promise<void>;
}) {
  const [quantity, setQuantity] = useState(String(entry.quantity));
  const [notes, setNotes] = useState(entry.notes ?? "");

  return (
    <article className="rounded-sm border border-[var(--ledger-line)]/55 bg-[var(--ledger-surface-strong)] p-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="text-lg font-semibold text-[var(--ledger-ink)]">{entry.item.name}</h3>
          <p className="mt-1 text-xs uppercase tracking-[0.2em] text-[var(--ledger-ink-soft)]">
            Bonus +{entry.item.bonus} · Availability {entry.item.availability}
          </p>
        </div>
        <span className="rounded-full border border-[var(--ledger-line)]/55 px-3 py-1 text-xs text-[var(--ledger-ink)]">
          x{entry.quantity}
        </span>
      </div>

      {entry.item.description ? (
        <p className="mt-3 text-sm text-[var(--ledger-ink-soft)]">{entry.item.description}</p>
      ) : null}

      {canEdit ? (
        <div className="mt-4 grid gap-3 md:grid-cols-[0.25fr_1fr_auto_auto]">
          <input
            type="number"
            min={1}
            value={quantity}
            onChange={(event) => setQuantity(event.target.value)}
            className="rounded-sm border border-[var(--ledger-line)]/55 bg-[var(--ledger-surface)] px-3 py-2 text-sm text-[var(--ledger-ink)] outline-none"
          />
          <input
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            placeholder="No notes"
            className="rounded-sm border border-[var(--ledger-line)]/55 bg-[var(--ledger-surface)] px-3 py-2 text-sm text-[var(--ledger-ink)] outline-none"
          />
          <button
            type="button"
            disabled={isBusy}
            onClick={() => onSave(entry.item.id, Math.max(1, Number(quantity) || 1), notes)}
            className="rounded-full border border-[var(--ledger-line)]/55 px-4 py-2 text-sm text-[var(--ledger-ink)] transition-colors hover:border-[var(--ledger-line)]/55 disabled:opacity-60"
          >
            Save
          </button>
          <button
            type="button"
            disabled={isBusy}
            onClick={() => onRemove(entry.item.id)}
            className="rounded-full border border-red-400/20 px-4 py-2 text-sm text-[var(--ledger-danger)] transition-colors hover:bg-red-500/10 disabled:opacity-60"
          >
            Remove
          </button>
        </div>
      ) : notes ? (
        <p className="mt-3 text-sm text-[var(--ledger-ink-soft)]">Notes: {notes}</p>
      ) : null}
    </article>
  );
}
