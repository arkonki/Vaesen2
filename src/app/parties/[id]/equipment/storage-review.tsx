"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { reviewCastleStorage } from "../../castle-actions";
export default function StorageReview({
  hqId,
  rows,
  capacity,
  canEdit,
}: {
  hqId: string;
  rows: Array<{
    id: string;
    name: string;
    type: string;
    quantity: number;
    retainedQuantity: number;
  }>;
  capacity: { common: number; occult: number };
  canEdit: boolean;
}) {
  const router = useRouter();
  const [quantities, setQuantities] = useState<Record<string, number>>(
    Object.fromEntries(rows.map((r) => [r.id, r.retainedQuantity])),
  );
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  return (
    <section className="ledger-panel p-5 space-y-4">
      <h2 className="text-2xl font-bold">Between-Mystery Storage Review</h2>
      <p>
        Castle capacity: {capacity.common} common items, {capacity.occult}{" "}
        power/magic items. Record what survives to the next mystery. Unretained
        items remain visible until the GM removes them; this screen never
        deletes equipment.
      </p>
      <p>
        Investigators also keep their original gear, mementos, everyday items
        and one newly acquired item each. Review those personal choices on their
        sheets.
      </p>
      <form
        className="space-y-3"
        onSubmit={async (e) => {
          e.preventDefault();
          setBusy(true);
          setMessage("");
          try {
            await reviewCastleStorage(
              hqId,
              rows.map((r) => ({ id: r.id, quantity: quantities[r.id] || 0 })),
            );
            setMessage("Retention review saved.");
            router.refresh();
          } catch (e) {
            setMessage(e instanceof Error ? e.message : "Review failed");
          } finally {
            setBusy(false);
          }
        }}
      >
        {rows.map((r) => (
          <label
            key={r.id}
            className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--ledger-line)] py-2"
          >
            <span>
              {r.name} / {r.type} / {r.quantity} in stash
            </span>
            <input
              className="ledger-input w-24"
              aria-label={`Retain ${r.name}`}
              disabled={!canEdit || busy}
              type="number"
              min={0}
              max={r.quantity}
              value={quantities[r.id] || 0}
              onChange={(e) =>
                setQuantities({ ...quantities, [r.id]: Number(e.target.value) })
              }
            />
          </label>
        ))}
        {!rows.length && <p>The party stash is empty.</p>}
        {canEdit && (
          <button
            className="ledger-roll-trigger"
            disabled={busy || !rows.length}
          >
            {busy ? "Saving..." : "Save Retention Review"}
          </button>
        )}
        <p role="status">{message}</p>
      </form>
    </section>
  );
}
