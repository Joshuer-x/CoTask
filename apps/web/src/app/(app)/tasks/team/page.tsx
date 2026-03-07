"use client";
import { useState } from "react";
import { useAuthStore } from "@/stores/authStore";
import { useTasks, type TaskFilters } from "@/hooks/useTasks";
import { useWorkspaceMembers } from "@/hooks/useWorkspace";
import { TaskBoard } from "@/components/tasks/TaskBoard";
import { TaskListView } from "@/components/tasks/TaskListView";
import { TaskDetailPanel } from "@/components/tasks/TaskDetailPanel";
import { NewTaskModal } from "@/components/tasks/NewTaskModal";
import type { Task } from "@cotask/types";

export default function TeamTasksPage() {
  const workspaceId = useAuthStore((s) => s.workspaceId) ?? process.env["NEXT_PUBLIC_DEFAULT_WORKSPACE"] ?? "";

  const [view, setView] = useState<"board" | "list">("list");
  const [showNewTask, setShowNewTask] = useState(false);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [filters, setFilters] = useState<TaskFilters>({ sortBy: "created_at", sortDir: "desc" });

  const { data: tasks = [], isLoading } = useTasks(workspaceId, filters);
  const { data: members = [] } = useWorkspaceMembers(workspaceId);

  const assigneeCounts = tasks.reduce<Record<string, number>>((acc, t: Task) => {
    if (t.assigneeId) acc[t.assigneeId] = (acc[t.assigneeId] ?? 0) + 1;
    return acc;
  }, {});

  return (
    <div>
      {showNewTask && <NewTaskModal workspaceId={workspaceId} onClose={() => setShowNewTask(false)} />}
      {selectedTaskId && (
        <TaskDetailPanel
          workspaceId={workspaceId}
          taskId={selectedTaskId}
          onClose={() => setSelectedTaskId(null)}
          onDeleted={() => setSelectedTaskId(null)}
        />
      )}

      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Team Tasks</h1>
          <p className="text-sm text-gray-500 mt-0.5">{tasks.length} tasks across {members.length} members</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex rounded-xl border border-gray-200 overflow-hidden bg-white shadow-sm">
            {(["board", "list"] as const).map((v) => (
              <button
                key={v}
                onClick={() => setView(v)}
                className={`px-3 py-1.5 text-xs font-semibold transition-colors capitalize ${
                  view === v ? "bg-brand-600 text-white" : "text-gray-500 hover:bg-gray-50"
                }`}
              >
                {v}
              </button>
            ))}
          </div>
          <button onClick={() => setShowNewTask(true)} className="btn-primary">
            <svg viewBox="0 0 16 16" fill="currentColor" className="w-3.5 h-3.5">
              <path d="M8 2a.75.75 0 01.75.75v4.5h4.5a.75.75 0 010 1.5h-4.5v4.5a.75.75 0 01-1.5 0v-4.5h-4.5a.75.75 0 010-1.5h4.5v-4.5A.75.75 0 018 2z" />
            </svg>
            New task
          </button>
        </div>
      </div>

      {/* Assignee quick-filter chips */}
      {members.length > 1 && (
        <div className="flex flex-wrap gap-2 mb-5">
          <button
            onClick={() => setFilters((f) => ({ ...f, assigneeId: undefined }))}
            className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
              !filters.assigneeId ? "bg-brand-600 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >
            Everyone
          </button>
          {members.map((m) => (
            <button
              key={m.userId}
              onClick={() => setFilters((f) => ({ ...f, assigneeId: m.userId === f.assigneeId ? undefined : m.userId }))}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                filters.assigneeId === m.userId ? "bg-brand-600 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              {m.user.displayName}
              {assigneeCounts[m.userId] !== undefined && (
                <span className={`text-[10px] rounded-full px-1 ${filters.assigneeId === m.userId ? "bg-white/20" : "bg-gray-200 text-gray-500"}`}>
                  {assigneeCounts[m.userId]}
                </span>
              )}
            </button>
          ))}
        </div>
      )}

      {isLoading ? (
        <div className="flex items-center justify-center py-24">
          <div className="flex items-center gap-2.5 text-gray-400 text-sm">
            <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4l3-3-3-3v4a8 8 0 00-8 8h4z" />
            </svg>
            Loading…
          </div>
        </div>
      ) : view === "board" ? (
        <TaskBoard tasks={tasks} onTaskClick={(t) => setSelectedTaskId(t.id)} />
      ) : (
        <TaskListView
          tasks={tasks}
          members={members}
          filters={filters}
          onFiltersChange={setFilters}
          onTaskClick={(t) => setSelectedTaskId(t.id)}
        />
      )}
    </div>
  );
}
