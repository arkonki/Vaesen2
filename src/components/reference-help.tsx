"use client";

import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { Info, X } from "lucide-react";

/** Short contextual rules; full catalogue entries belong in expandable rows. */
export default function ReferenceHelp({ label, children }: { label: string; children: ReactNode }) {
  const id = useId();
  const trigger = useRef<HTMLButtonElement>(null);
  const panel = useRef<HTMLDivElement>(null);
  const pinned = useRef(false);
  const suppressFocus = useRef(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState({ top: 0, left: 0 });
  function close() { pinned.current = false; setOpen(false); }
  function dismiss() { close(); suppressFocus.current = true; trigger.current?.focus(); }
  function enter() { if (timer.current) clearTimeout(timer.current); setOpen(true); }
  function leave() {
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => { if (!pinned.current && document.activeElement !== trigger.current && !panel.current?.contains(document.activeElement)) setOpen(false); }, 180);
  }
  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);
  useEffect(() => {
    if (!open) return;
    function locate() {
      const rect = trigger.current?.getBoundingClientRect();
      if (!rect) return;
      const width = Math.min(340, window.innerWidth - 24);
      const height = panel.current?.offsetHeight ?? 180;
      setPosition({ left: Math.max(12, Math.min(rect.left, window.innerWidth - width - 12)), top: Math.max(12, Math.min(rect.bottom + 8, window.innerHeight - height - 12)) });
    }
    function outside(event: PointerEvent) { if (!trigger.current?.contains(event.target as Node) && !panel.current?.contains(event.target as Node)) close(); }
    function escape(event: KeyboardEvent) { if (event.key === "Escape") { close(); if (panel.current?.contains(document.activeElement)) { suppressFocus.current = true; trigger.current?.focus(); } } }
    locate();
    window.addEventListener("resize", locate);
    window.addEventListener("scroll", locate, true);
    document.addEventListener("pointerdown", outside);
    document.addEventListener("keydown", escape);
    return () => {
      window.removeEventListener("resize", locate); window.removeEventListener("scroll", locate, true);
      document.removeEventListener("pointerdown", outside); document.removeEventListener("keydown", escape);
    };
  }, [open]);
  return <>
    <button ref={trigger} type="button" className="creation-help" aria-label={`About ${label}`} aria-expanded={open} aria-controls={open ? id : undefined}
      onPointerEnter={event => { if (event.pointerType === "mouse") enter(); }} onPointerLeave={leave}
      onFocus={() => { if (suppressFocus.current) suppressFocus.current = false; else enter(); }} onBlur={leave} onClick={() => { if (pinned.current) close(); else { pinned.current = true; enter(); } }}><Info size={17} aria-hidden="true" /></button>
    {open && createPortal(<div ref={panel} id={id} role="region" aria-label={`About ${label}`} className="creation-help-panel" style={position}
      onPointerEnter={enter} onPointerLeave={leave} onFocus={enter} onBlur={leave}>
      <div className="flex items-center justify-between gap-3"><strong>{label}</strong><button type="button" aria-label="Close help" className="creation-help" onClick={dismiss}><X size={16} /></button></div>
      <div className="mt-2 leading-relaxed">{children}</div>
    </div>, document.body)}
  </>;
}
