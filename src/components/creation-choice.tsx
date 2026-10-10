"use client";

import { ChevronDown, Check } from "lucide-react";
import type { ReactNode } from "react";

export default function CreationChoice({ title, summary, selected, onChoose, children, included = false }: {
  title: string; summary?: ReactNode; selected?: boolean; onChoose?: () => void; children: ReactNode; included?: boolean;
}) {
  return <article className={`creation-choice ${selected || included ? "creation-choice-selected" : ""}`}>
    <details>
      <summary className={onChoose || included ? "creation-choice-summary has-choice" : "creation-choice-summary"}>
        <ChevronDown className="creation-choice-chevron" size={18} aria-hidden="true" />
        <span className="min-w-0"><span className="block font-bold text-lg">{title}</span>{summary && <span className="block mt-1 text-sm text-[var(--ledger-ink-soft)]">{summary}</span>}</span>
      </summary>
      <div className="creation-choice-body">{children}</div>
    </details>
    {onChoose && <button type="button" className="creation-choice-select" aria-label={`${selected ? "Selected" : "Choose"} ${title}`} aria-pressed={!!selected} onClick={onChoose}>{selected && <Check size={15} aria-hidden="true" />}{selected ? "Selected" : "Choose"}</button>}
    {included && <span className="creation-choice-included"><Check size={15} aria-hidden="true" /> Included</span>}
  </article>;
}
