"use client";

import { useState } from "react";
import { Plus, Trash2, CheckCircle2, Clock, HelpCircle, XCircle } from "lucide-react";
import { manageTask } from "../../actions";
import { AdventureTask, TaskStatus } from "@prisma/client";
import { cn } from "@/lib/utils";

const STATUS_CONFIG: Record<TaskStatus, { label: string; icon: typeof HelpCircle; color: string; bg: string; border: string }> = {
  TODO: { label: "To Do", icon: HelpCircle, color: "text-[var(--ledger-ink-soft)]", bg: "bg-neutral-500/10", border: "border-neutral-500/20" },
  IN_PROGRESS: { label: "In Progress", icon: Clock, color: "text-[var(--ledger-accent)]", bg: "bg-[rgba(127,48,40,0.12)]", border: "border-[var(--ledger-accent)]/65" },
  COMPLETED: { label: "Completed", icon: CheckCircle2, color: "text-[var(--ledger-success)]", bg: "bg-emerald-400/10", border: "border-emerald-400/20" },
  FAILED: { label: "Failed", icon: XCircle, color: "text-[var(--ledger-danger)]", bg: "bg-red-400/10", border: "border-red-400/20" },
};

export default function TaskBoard({ partyId, initialTasks, isGM }: { partyId: string, initialTasks: AdventureTask[], isGM: boolean }) {
  const tasks = initialTasks;
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function mutate(work: () => Promise<void>) {
    if (!isGM || busy) return;
    setBusy(true); setError("");
    try { await work(); } catch (error) { setError(error instanceof Error ? error.message : "Could not save objective"); }
    finally { setBusy(false); }
  }
  const [isAdding, setIsAdding] = useState(false);
  const [newTask, setNewTask] = useState({ title: "", description: "", status: "TODO" as TaskStatus });

  async function handleAddTask() {
    if (!newTask.title) return;
    await mutate(async () => {
      await manageTask(partyId, undefined, newTask);
      setNewTask({ title: "", description: "", status: "TODO" });
      setIsAdding(false);
    });
  }

  async function handleUpdateStatus(taskId: string, status: TaskStatus) {
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;
    await mutate(() => manageTask(partyId, taskId, { title: task.title, description: task.description, status }));
  }

  async function handleDelete(taskId: string) {
    if (!confirm("Delete this task?")) return;
    await mutate(() => manageTask(partyId, taskId));
  }

  return (
    <div className="space-y-8">
      {error && <p role="alert">{error}</p>}
      {isGM && (
        <div className="flex justify-start">
          <button
            onClick={() => setIsAdding(true)}
            className="flex items-center gap-2 bg-[rgba(127,48,40,0.12)] hover:bg-[rgba(127,48,40,0.12)] text-[var(--ledger-ink)] px-4 py-2 rounded-lg text-sm font-bold transition-all"
          >
            <Plus className="w-4 h-4" /> Add Objective
          </button>
        </div>
      )}

      {isAdding && (
        <div className="bg-[var(--ledger-surface-strong)] border border-[var(--ledger-line)]/55 rounded-sm p-6 shadow-2xl animate-in fade-in zoom-in duration-200">
          <h3 className="text-lg font-bold text-[var(--ledger-ink)] mb-4">New Objective</h3>
          <div className="space-y-4">
            <input
              type="text"
              placeholder="Title (e.g., Investigate the Old Mill)"
              className="w-full bg-[var(--ledger-paper)] border border-[var(--ledger-line)]/55 rounded-lg px-4 py-2 text-sm focus:ring-2 focus:ring-[var(--ledger-focus)] outline-none"
              value={newTask.title}
              onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
            />
            <textarea
              placeholder="Details or clues discovered..."
              className="w-full h-24 bg-[var(--ledger-paper)] border border-[var(--ledger-line)]/55 rounded-lg px-4 py-2 text-sm focus:ring-2 focus:ring-[var(--ledger-focus)] outline-none"
              value={newTask.description}
              onChange={(e) => setNewTask({ ...newTask, description: e.target.value })}
            />
            <div className="flex justify-end gap-3">
              <button onClick={() => setIsAdding(false)} className="text-[var(--ledger-ink-soft)] hover:text-[var(--ledger-ink)] text-sm font-medium">Cancel</button>
              <button disabled={busy} onClick={handleAddTask} className="bg-[rgba(127,48,40,0.12)] hover:bg-[rgba(127,48,40,0.12)] text-[var(--ledger-ink)] px-6 py-2 rounded-lg text-sm font-bold transition-colors">Create</button>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {(Object.keys(STATUS_CONFIG) as TaskStatus[]).map((status) => (
          <div key={status} className="space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-[var(--ledger-line)]/55">
              <div className="flex items-center gap-2">
                <span className={cn("w-2 h-2 rounded-full", STATUS_CONFIG[status].color.replace("text-", "bg-"))} />
                <h3 className="text-xs font-black uppercase tracking-widest text-[var(--ledger-ink-soft)]">{STATUS_CONFIG[status].label}</h3>
              </div>
              <span className="text-xs text-[var(--ledger-ink-soft)] font-bold bg-[var(--ledger-surface-strong)] px-2 py-0.5 rounded-full border border-[var(--ledger-line)]/55">
                {tasks.filter(t => t.status === status).length}
              </span>
            </div>

            <div className="space-y-4">
              {tasks.filter(t => t.status === status).map((task) => (
                <div
                  key={task.id}
                  className="bg-[var(--ledger-surface-strong)] border border-[var(--ledger-line)]/55 p-4 rounded-sm shadow-lg hover:border-[var(--ledger-line)]/55 transition-all group"
                >
                  <div className="flex justify-between items-start mb-2">
                    <h4 className="text-sm font-bold text-[var(--ledger-ink)] leading-snug">{task.title}</h4>
                    {isGM && (
                      <button
                        disabled={busy}
                        onClick={() => handleDelete(task.id)}
                        className="opacity-0 group-hover:opacity-100 p-1 text-[var(--ledger-ink-soft)] hover:text-[var(--ledger-danger)] transition-all"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                  {task.description && (
                    <p className="text-xs text-[var(--ledger-ink-soft)] line-clamp-2 mb-4 italic">{task.description}</p>
                  )}

                  {isGM && <div className="flex gap-2 mt-auto">
                    {(Object.keys(STATUS_CONFIG) as TaskStatus[]).filter(s => s !== status).map((newStatus) => {
                      const Icon = STATUS_CONFIG[newStatus].icon;
                      return (
                        <button
                          key={newStatus}
                          disabled={busy}
                          onClick={() => handleUpdateStatus(task.id, newStatus)}
                          title={`Move to ${STATUS_CONFIG[newStatus].label}`}
                          className="p-1.5 rounded-md bg-[var(--ledger-paper)] border border-[var(--ledger-line)]/55 text-[var(--ledger-ink-soft)] hover:text-[var(--ledger-ink)] hover:border-[var(--ledger-line)]/55 transition-all"
                        >
                          <Icon className="w-3.5 h-3.5" />
                        </button>
                      );
                    })}
                  </div>}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
