"use client";
import type { Task, TaskStatus, TaskPriority } from "@cotask/types";
import type { WorkspaceMember } from "@cotask/types";
import { StatusBadge, PriorityBadge } from "@/components/ui/Badge";
import type { TaskFilters } from "@/hooks/useTasks";

interface TaskListViewProps {
  tasks: Task[];
  members: WorkspaceMember[];
  filters: TaskFilters;
  onFiltersChange: (f: TaskFilters) => void;
  onTaskClick: (task: Task) => void;
}

const STATUS_OPTIONS: { value: TaskStatus | ""; label: string }[] = [
  { value: "", label: "All statuses" },
  { value: "todo", label: "To Do" },
  { value: "in_progress", label: "In Progress" },
  { value: "in_review", label: "In Review" },
  { value: "done", label: "Done" },
  { value: "cancelled", label: "Cancelled" },
];

const PRIORITY_OPTIONS: { value: TaskPriority | 0; label: string }[] = [
  { value: 0, label: "All priorities" },
  { value: 1, label: "P1 — Urgent" },
  { value: 2, label: "P2 — High" },
  { value: 3, label: "P3 — Normal" },
  { value: 4, label: "P4 — Low" },
];

const SORT_OPTIONS = [
  { value: "created_at", label: "Date created" },
  { value: "updated_at", label: "Last updated" },
  { value: "due_date",   label: "Due date" },
  { value: "priority",   label: "Priority" },
] as const;

const PRIORITY_BORDER: Record<number, string> = {
  1: "border-l-red-400",
  2: "border-l-orange-400",
  3: "border-l-yellow-400",
  4: "border-l-gray-200",
};

const AVATAR_COLORS = ["from-pink-400 to-rose-500","from-orange-400 to-amber-500","from-green-400 to-emerald-500","from-blue-400 to-indigo-500","from-purple-400 to-violet-500"];

export function TaskListView({ tasks, members, filters, onFiltersChange, onTaskClick }: TaskListViewProps) {
  const memberMap = Object.fromEntries(members.map((m, i) => [m.userId, { name: m.user.displayName, colorIdx: i }]));

  function set(patch: Partial<TaskFilters>) {
    onFiltersChange({ ...filters, ...patch });
  }

  return (
    <div>
      {/* Filter bar */}
      <div className="flex items-center gap-2 mb-4 flex-wrap">
        <select
          value={filters.status ?? ""}
          onChange={(e) => set({ status: e.target.value as TaskStatus || undefined })}
          className="input py-1.5 text-xs w-auto"
        >
          {STATUS_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>

        <select
          value={filters.priority ?? 0}
          onChange={(e) => set({ priority: Number(e.target.value) || undefined })}
          className="input py-1.5 text-xs w-auto"
        >
          {PRIORITY_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>

        <select
          value={filters.assigneeId ?? ""}
          onChange={(e) => set({ assigneeId: e.target.value || undefined })}
          className="input py-1.5 text-xs w-auto"
        >
          <option value="">All assignees</option>
          {members.map((m) => <option key={m.userId} value={m.userId}>{m.user.displayName}</option>)}
        </select>

        <div className="flex items-center gap-1.5 ml-auto">
          <select
            value={filters.sortBy ?? "created_at"}
            onChange={(e) => set({ sortBy: e.target.value as TaskFilters["sortBy"] })}
            className="input py-1.5 text-xs w-auto"
          >
            {SORT_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
          <button
            onClick={() => set({ sortDir: filters.sortDir === "asc" ? "desc" : "asc" })}
            className="btn-secondary px-2.5 py-1.5 text-xs"
            title={filters.sortDir === "asc" ? "Ascending" : "Descending"}
          >
            {filters.sortDir === "asc" ? (
              <svg viewBox="0 0 16 16" fill="currentColor" className="w-3.5 h-3.5">
                <path fillRule="evenodd" d="M8 2a.75.75 0 01.75.75v8.69l2.22-2.22a.75.75 0 111.06 1.06l-3.5 3.5a.75.75 0 01-1.06 0l-3.5-3.5a.75.75 0 111.06-1.06L7.25 11.44V2.75A.75.75 0 018 2z" clipRule="evenodd" />
              </svg>
            ) : (
              <svg viewBox="0 0 16 16" fill="currentColor" className="w-3.5 h-3.5">
                <path fillRule="evenodd" d="M8 14a.75.75 0 01-.75-.75V4.56L5.03 6.78a.75.75 0 01-1.06-1.06l3.5-3.5a.75.75 0 011.06 0l3.5 3.5a.75.75 0 01-1.06 1.06L8.75 4.56v8.69A.75.75 0 018 14z" clipRule="evenodd" />
              </svg>
            )}
          </button>
        </div>

        <span className="text-xs text-gray-400 ml-2">{tasks.length} tasks</span>
      </div>

      {/* Table */}
      {tasks.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <p className="text-sm">No tasks match your filters.</p>
        </div>
      ) : (
        <div className="card overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 text-[11px] text-gray-400 font-semibold uppercase tracking-wide">
                <th className="px-4 py-2.5 text-left">Title</th>
                <th className="px-4 py-2.5 text-left hidden md:table-cell">Assignee</th>
                <th className="px-4 py-2.5 text-left">Priority</th>
                <th className="px-4 py-2.5 text-left">Status</th>
                <th className="px-4 py-2.5 text-left hidden lg:table-cell">Due</th>
              </tr>
            </thead>
            <tbody>
              {tasks.map((task) => {
                const member = task.assigneeId ? memberMap[task.assigneeId] : null;
                return (
                  <tr
                    key={task.id}
                    onClick={() => onTaskClick(task)}
                    className={`border-b border-gray-50 last:border-0 cursor-pointer hover:bg-gray-50 transition-colors border-l-2 ${PRIORITY_BORDER[task.priority] ?? "border-l-transparent"}`}
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="font-medium text-gray-800 truncate">{task.title}</span>
                        {task.source === "ai_meeting" && (
                          <span className="shrink-0 text-[10px] bg-brand-50 text-brand-600 px-1.5 py-0.5 rounded font-medium">AI</span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell">
                      {member ? (
                        <div className="flex items-center gap-1.5">
                          <div className={`w-5 h-5 rounded-full bg-gradient-to-br ${AVATAR_COLORS[member.colorIdx % AVATAR_COLORS.length]} flex items-center justify-center text-[10px] font-bold text-white`}>
                            {member.name[0]?.toUpperCase()}
                          </div>
                          <span className="text-xs text-gray-600 truncate max-w-[100px]">{member.name}</span>
                        </div>
                      ) : (
                        <span className="text-xs text-gray-400">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <PriorityBadge priority={task.priority} />
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={task.status} />
                    </td>
                    <td className="px-4 py-3 hidden lg:table-cell">
                      {task.dueDate ? (
                        <span className="text-xs text-gray-500">
                          {new Date(task.dueDate).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                        </span>
                      ) : (
                        <span className="text-xs text-gray-300">—</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
