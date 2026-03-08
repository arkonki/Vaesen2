"use client";

import { useState } from "react";
import { Plus, GripVertical, Trash2, CheckCircle2, Clock, HelpCircle, XCircle } from "lucide-react";
import { manageTask } from "../../actions";
import { TaskStatus } from "@prisma/client";
import { cn } from "@/lib/utils";

const STATUS_CONFIG: Record<TaskStatus, any> = {
  TODO: { label: "To Do", icon: HelpCircle, color: "text-neutral-500", bg: "bg-neutral-500/10", border: "border-neutral-500/20" },
  IN_PROGRESS: { label: "In Progress", icon: Clock, color: "text-indigo-400", bg: "bg-indigo-400/10", border: "border-indigo-400/20" },
  COMPLETED: { label: "Completed", icon: CheckCircle2, color: "text-emerald-400", bg: "bg-emerald-400/10", border: "border-emerald-400/20" },
  FAILED: { label: "Failed", icon: XCircle, color: "text-red-400", bg: "bg-red-400/10", border: "border-red-400/20" },
};

export default function TaskBoard({ partyId, initialTasks, isGM }: { partyId: string, initialTasks: any[], isGM: boolean }) {
  const [tasks, setTasks] = useState(initialTasks);
  const [isAdding, setIsAdding] = useState(false);
  const [newTask, setNewTask] = useState({ title: "", description: "", status: "TODO" as TaskStatus });

  async function handleAddTask() {
    if (!newTask.title) return;
    await manageTask(partyId, undefined, newTask);
    setNewTask({ title: "", description: "", status: "TODO" });
    setIsAdding(false);
  }

  async function handleUpdateStatus(taskId: string, status: TaskStatus) {
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;
    await manageTask(partyId, taskId, { ...task, status });
  }

  async function handleDelete(taskId: string) {
    if (!confirm("Delete this task?")) return;
    await manageTask(partyId, taskId);
  }

  return (
    <div className="space-y-8">
      {isGM && (
        <div className="flex justify-start">
          <button
            onClick={() => setIsAdding(true)}
            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded-lg text-sm font-bold transition-all"
          >
            <Plus className="w-4 h-4" /> Add Objective
          </button>
        </div>
      )}

      {isAdding && (
        <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-6 shadow-2xl animate-in fade-in zoom-in duration-200">
          <h3 className="text-lg font-bold text-white mb-4">New Objective</h3>
          <div className="space-y-4">
            <input
              type="text"
              placeholder="Title (e.g., Investigate the Old Mill)"
              className="w-full bg-neutral-950 border border-neutral-700 rounded-lg px-4 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
              value={newTask.title}
              onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
            />
            <textarea
              placeholder="Details or clues discovered..."
              className="w-full h-24 bg-neutral-950 border border-neutral-700 rounded-lg px-4 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
              value={newTask.description}
              onChange={(e) => setNewTask({ ...newTask, description: e.target.value })}
            />
            <div className="flex justify-end gap-3">
              <button onClick={() => setIsAdding(false)} className="text-neutral-500 hover:text-white text-sm font-medium">Cancel</button>
              <button onClick={handleAddTask} className="bg-indigo-600 hover:bg-indigo-500 text-white px-6 py-2 rounded-lg text-sm font-bold transition-colors">Create</button>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {(Object.keys(STATUS_CONFIG) as TaskStatus[]).map((status) => (
          <div key={status} className="space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-neutral-800">
              <div className="flex items-center gap-2">
                <span className={cn("w-2 h-2 rounded-full", STATUS_CONFIG[status].color.replace("text-", "bg-"))} />
                <h3 className="text-xs font-black uppercase tracking-widest text-neutral-500">{STATUS_CONFIG[status].label}</h3>
              </div>
              <span className="text-xs text-neutral-600 font-bold bg-neutral-900 px-2 py-0.5 rounded-full border border-neutral-800">
                {tasks.filter(t => t.status === status).length}
              </span>
            </div>

            <div className="space-y-4">
              {tasks.filter(t => t.status === status).map((task) => (
                <div 
                  key={task.id} 
                  className="bg-neutral-900 border border-neutral-800 p-4 rounded-xl shadow-lg hover:border-neutral-700 transition-all group"
                >
                  <div className="flex justify-between items-start mb-2">
                    <h4 className="text-sm font-bold text-neutral-200 leading-snug">{task.title}</h4>
                    {isGM && (
                      <button 
                        onClick={() => handleDelete(task.id)}
                        className="opacity-0 group-hover:opacity-100 p-1 text-neutral-600 hover:text-red-400 transition-all"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                  {task.description && (
                    <p className="text-xs text-neutral-500 line-clamp-2 mb-4 italic">{task.description}</p>
                  )}
                  
                  <div className="flex gap-2 mt-auto">
                    {(Object.keys(STATUS_CONFIG) as TaskStatus[]).filter(s => s !== status).map((newStatus) => {
                      const Icon = STATUS_CONFIG[newStatus].icon;
                      return (
                        <button
                          key={newStatus}
                          onClick={() => handleUpdateStatus(task.id, newStatus)}
                          title={`Move to ${STATUS_CONFIG[newStatus].label}`}
                          className="p-1.5 rounded-md bg-neutral-950 border border-neutral-800 text-neutral-600 hover:text-white hover:border-neutral-600 transition-all"
                        >
                          <Icon className="w-3.5 h-3.5" />
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
