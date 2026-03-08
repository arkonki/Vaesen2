"use client";

import { useState, useEffect, useRef } from "react";
import { Save, Bold, Italic, List, Heading1, Heading2 } from "lucide-react";
import { updatePartyNotes } from "../../actions";
import { cn } from "@/lib/utils";

export default function NoteEditor({ partyId, initialContent, isGM }: { partyId: string, initialContent: string, isGM: boolean }) {
  const [content, setContent] = useState(initialContent);
  const [isSaving, setIsSaving] = useState(false);
  const editorRef = useRef<HTMLDivElement>(null);

  // Initialize content
  useEffect(() => {
    if (editorRef.current && initialContent) {
      editorRef.current.innerHTML = initialContent;
    }
  }, []);

  async function handleSave() {
    setIsSaving(true);
    const html = editorRef.current?.innerHTML || "";
    try {
      await updatePartyNotes(partyId, html);
      setContent(html);
    } catch (e) {
      console.error("Save failed", e);
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
      <div className="flex items-center gap-1 mb-6 pb-4 border-b border-neutral-800">
        <button onClick={() => execCommand("bold")} className="p-2 hover:bg-neutral-800 rounded transition-colors" title="Bold">
          <Bold className="w-4 h-4 text-neutral-400" />
        </button>
        <button onClick={() => execCommand("italic")} className="p-2 hover:bg-neutral-800 rounded transition-colors" title="Italic">
          <Italic className="w-4 h-4 text-neutral-400" />
        </button>
        <div className="w-px h-4 bg-neutral-800 mx-2" />
        <button onClick={() => execCommand("formatBlock", "H1")} className="p-2 hover:bg-neutral-800 rounded transition-colors" title="Heading 1">
          <Heading1 className="w-4 h-4 text-neutral-400" />
        </button>
        <button onClick={() => execCommand("formatBlock", "H2")} className="p-2 hover:bg-neutral-800 rounded transition-colors" title="Heading 2">
          <Heading2 className="w-4 h-4 text-neutral-400" />
        </button>
        <button onClick={() => execCommand("insertUnorderedList")} className="p-2 hover:bg-neutral-800 rounded transition-colors" title="Bullet List">
          <List className="w-4 h-4 text-neutral-400" />
        </button>
        
        <div className="flex-1" />
        
        <button 
          onClick={handleSave}
          disabled={isSaving}
          className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white px-4 py-2 rounded-lg text-sm font-bold transition-all"
        >
          <Save className={cn("w-4 h-4", isSaving && "animate-spin")} />
          {isSaving ? "Saving..." : "Save Notes"}
        </button>
      </div>

      {/* Editor */}
      <div 
        ref={editorRef}
        contentEditable={true}
        className="flex-1 outline-none text-neutral-300 leading-relaxed font-serif prose prose-invert max-w-none prose-headings:text-white prose-p:text-neutral-300"
      />
    </div>
  );
}
