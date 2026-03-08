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

export default function TasksPage() {
  const workspaceId = useAuthStore((s) => s.workspaceId) ?? process.env["NEXT_PUBLIC_DEFAULT_WORKSPACE"] ?? "";
  const userId = useAuthStore((s) => s.userId);

  const [view, setView] = useState<"board" | "list">("board");
  const [showNewTask, setShowNewTask] = useState(false);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [listFilters, setListFilters] = useState<TaskFilters>({ sortBy: "created_at", sortDir: "desc" });

  // My tasks: only tasks assigned to me
  const myFilters: TaskFilters = userId
    ? { assigneeId: userId, ...listFilters }
    : listFilters;

  const { data: tasks = [], isLoading } = useTasks(workspaceId, view === "board" ? { assigneeId: userId ?? undefined } : myFilters);
  const { data: members = [] } = useWorkspaceMembers(workspaceId);

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
        <div className="page-header mb-0">
          <h1 className="page-title">My Tasks</h1>
          <p className="page-subtitle">{tasks.length} tasks</p>
        </div>

        <div className="flex items-center gap-2 mt-1">
          {/* View toggle */}
          <div className="flex items-center gap-1 bg-white border border-[#E0E0E0] rounded-full px-1 py-1">
            {(["board", "list"] as const).map((v) => (
              <button
                key={v}
                onClick={() => setView(v)}
                className={`rounded-full px-3 py-1 text-sm transition-colors capitalize ${
                  view === v
                    ? "bg-[#202020] text-white font-medium"
                    : "text-[#444444] hover:bg-[#EEEEEE]"
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

      {isLoading ? (
        <div className="flex items-center justify-center py-24">
          <div className="flex items-center gap-2.5 text-[#999999] text-sm">
            <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4l3-3-3-3v4a8 8 0 00-8 8h4z" />
            </svg>
            Loading tasks…
          </div>
        </div>
      ) : view === "board" ? (
        <TaskBoard workspaceId={workspaceId} tasks={tasks} onTaskClick={(t) => setSelectedTaskId(t.id)} />
      ) : (
        <TaskListView
          tasks={tasks}
          members={members}
          filters={listFilters}
          onFiltersChange={setListFilters}
          onTaskClick={(t) => setSelectedTaskId(t.id)}
        />
      )}
    </div>
  );
}
