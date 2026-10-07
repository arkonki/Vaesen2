"use client";

import { useState, useEffect, useRef } from "react";
import { Save, Bold, Italic, List, Heading1, Heading2 } from "lucide-react";
import { updatePartyNotes } from "../../actions";
import { cn } from "@/lib/utils";

export default function NoteEditor({ partyId, initialContent, isGM }: { partyId: string, initialContent: string, isGM: boolean }) {
  const [error, setError] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const editorRef = useRef<HTMLDivElement>(null);

  // Initialize content
  useEffect(() => {
    if (editorRef.current) {
      editorRef.current.innerHTML = initialContent;
    }
  }, [initialContent]);

  async function handleSave() {
    if (!isGM || isSaving) return;
    setError("");
    setIsSaving(true);
    const html = editorRef.current?.innerHTML || "";
    try {
      await updatePartyNotes(partyId, html);

    } catch (e) {
      setError(e instanceof Error ? e.message : "Save failed");
    } finally {
      setIsSaving(false);
    }
  }

  const execCommand = (command: string, value?: string) => {
    document.execCommand(command, false, value);
    editorRef.current?.focus();
  };

  return (
    <div className="h-full flex flex-col">
      {/* Toolbar */}
      {isGM && <div className="flex items-center gap-1 mb-6 pb-4 border-b border-[var(--ledger-line)]/55">
        <button onClick={() => execCommand("bold")} className="p-2 hover:bg-[var(--ledger-paper-deep)] rounded transition-colors" title="Bold">
          <Bold className="w-4 h-4 text-[var(--ledger-ink-soft)]" />
        </button>
        <button onClick={() => execCommand("italic")} className="p-2 hover:bg-[var(--ledger-paper-deep)] rounded transition-colors" title="Italic">
          <Italic className="w-4 h-4 text-[var(--ledger-ink-soft)]" />
        </button>
        <div className="w-px h-4 bg-[var(--ledger-paper-deep)] mx-2" />
        <button onClick={() => execCommand("formatBlock", "H1")} className="p-2 hover:bg-[var(--ledger-paper-deep)] rounded transition-colors" title="Heading 1">
          <Heading1 className="w-4 h-4 text-[var(--ledger-ink-soft)]" />
        </button>
        <button onClick={() => execCommand("formatBlock", "H2")} className="p-2 hover:bg-[var(--ledger-paper-deep)] rounded transition-colors" title="Heading 2">
          <Heading2 className="w-4 h-4 text-[var(--ledger-ink-soft)]" />
        </button>
        <button onClick={() => execCommand("insertUnorderedList")} className="p-2 hover:bg-[var(--ledger-paper-deep)] rounded transition-colors" title="Bullet List">
          <List className="w-4 h-4 text-[var(--ledger-ink-soft)]" />
        </button>

        <div className="flex-1" />

        <button
          onClick={handleSave}
          disabled={isSaving}
          className="flex items-center gap-2 bg-[rgba(127,48,40,0.12)] hover:bg-[rgba(127,48,40,0.12)] disabled:opacity-50 text-[var(--ledger-ink)] px-4 py-2 rounded-lg text-sm font-bold transition-all"
        >
          <Save className={cn("w-4 h-4", isSaving && "animate-spin")} />
          {isSaving ? "Saving..." : "Save Notes"}
        </button>
      </div>}
      {error && <p role="alert">{error}</p>}

      {/* Editor */}
      <div
        ref={editorRef}
        contentEditable={isGM}
        role={isGM ? "textbox" : undefined}
        aria-label="Shared party notes"
        aria-multiline={isGM ? true : undefined}
        className="flex-1 outline-none text-[var(--ledger-ink)] leading-relaxed font-serif prose  max-w-none prose-headings:text-[var(--ledger-ink)] prose-p:text-[var(--ledger-ink)]"
      />
    </div>
  );
}
