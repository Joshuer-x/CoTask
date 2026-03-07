"use client";
import Link from "next/link";
import { useAuthStore } from "@/stores/authStore";
import { useTasks } from "@/hooks/useTasks";
import { useMeetings } from "@/hooks/useMeetings";
import { useWorkspaceMembers } from "@/hooks/useWorkspace";
import type { Task, Meeting } from "@cotask/types";

const PRIORITY_BORDER: Record<number, string> = {
  1: "border-l-red-400",
  2: "border-l-orange-400",
  3: "border-l-yellow-400",
  4: "border-l-gray-200",
};

const STATUS_DOT: Record<string, string> = {
  scheduled: "bg-gray-400", active: "bg-blue-400 animate-pulse",
  processing: "bg-yellow-400 animate-pulse", completed: "bg-green-400", failed: "bg-red-400",
};

const STATS_ICONS = {
  todo: (
    <svg viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm.75-11.25a.75.75 0 00-1.5 0v4.59L7.3 9.24a.75.75 0 00-1.1 1.02l3.25 3.5a.75.75 0 001.1 0l3.25-3.5a.75.75 0 10-1.1-1.02l-1.95 2.1V6.75z" clipRule="evenodd" />
    </svg>
  ),
  inProgress: (
    <svg viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
      <path fillRule="evenodd" d="M10 2a8 8 0 100 16A8 8 0 0010 2zM5.904 9.458a.75.75 0 00.042 1.042L8.5 13.25a.75.75 0 001.06 0l5-5a.75.75 0 00-1.06-1.06L9 11.689 6.946 9.5a.75.75 0 00-1.042-.042z" clipRule="evenodd" />
    </svg>
  ),
  inReview: (
    <svg viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
      <path d="M10 12.5a2.5 2.5 0 100-5 2.5 2.5 0 000 5z" />
      <path fillRule="evenodd" d="M.664 10.59a1.651 1.651 0 010-1.186A10.004 10.004 0 0110 3c4.257 0 7.893 2.66 9.336 6.41.147.381.146.804 0 1.186A10.004 10.004 0 0110 17c-4.257 0-7.893-2.66-9.336-6.41zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd" />
    </svg>
  ),
  done: (
    <svg viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z" clipRule="evenodd" />
    </svg>
  ),
  overdue: (
    <svg viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
      <path fillRule="evenodd" d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495zM10 5a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 0110 5zm0 9a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
    </svg>
  ),
  aiTasks: (
    <svg viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
      <path d="M15.98 1.804a1 1 0 00-1.96 0l-.24 1.192a1 1 0 01-.784.785l-1.192.24a1 1 0 000 1.962l1.192.24a1 1 0 01.784.785l.24 1.192a1 1 0 001.962 0l.24-1.192a1 1 0 01.785-.785l1.192-.24a1 1 0 000-1.962l-1.192-.24a1 1 0 01-.785-.785l-.24-1.192zM6.949 5.684a1 1 0 00-1.898 0l-.683 2.051a1 1 0 01-.633.633l-2.051.683a1 1 0 000 1.898l2.051.683a1 1 0 01.633.633l.683 2.051a1 1 0 001.898 0l.683-2.051a1 1 0 01.633-.633l2.051-.683a1 1 0 000-1.898l-2.051-.683a1 1 0 01-.633-.633L6.95 5.684z" />
    </svg>
  ),
};

export default function DashboardPage() {
  const workspaceId = useAuthStore((s) => s.workspaceId) ?? process.env["NEXT_PUBLIC_DEFAULT_WORKSPACE"] ?? "";
  const userId = useAuthStore((s) => s.userId);

  const { data: allTasks = [] } = useTasks(workspaceId);
  const { data: myTasks = [] } = useTasks(workspaceId, { assigneeId: userId ?? undefined });
  const { data: meetings = [] } = useMeetings(workspaceId);
  const { data: members = [] } = useWorkspaceMembers(workspaceId);

  const todo       = myTasks.filter((t: Task) => t.status === "todo").length;
  const inProgress = myTasks.filter((t: Task) => t.status === "in_progress").length;
  const inReview   = myTasks.filter((t: Task) => t.status === "in_review").length;
  const done       = myTasks.filter((t: Task) => t.status === "done").length;
  const overdue    = myTasks.filter((t: Task) => t.dueDate && new Date(t.dueDate) < new Date() && t.status !== "done" && t.status !== "cancelled").length;
  const aiTasks    = allTasks.filter((t: Task) => t.source === "ai_meeting").length;

  const recentMyTasks = myTasks.slice(0, 5);
  const recentMeetings = meetings.slice(0, 4);

  const STATS = [
    { label: "To Do",       value: todo,       color: "text-gray-700",   iconColor: "text-gray-500",   bg: "bg-white",       iconBg: "bg-gray-100",    icon: STATS_ICONS.todo },
    { label: "In Progress", value: inProgress, color: "text-blue-700",   iconColor: "text-blue-600",   bg: "bg-blue-50",     iconBg: "bg-blue-100",    icon: STATS_ICONS.inProgress },
    { label: "In Review",   value: inReview,   color: "text-purple-700", iconColor: "text-purple-600", bg: "bg-purple-50",   iconBg: "bg-purple-100",  icon: STATS_ICONS.inReview },
    { label: "Done",        value: done,       color: "text-green-700",  iconColor: "text-green-600",  bg: "bg-green-50",    iconBg: "bg-green-100",   icon: STATS_ICONS.done },
    { label: "Overdue",     value: overdue,    color: "text-red-700",    iconColor: "text-red-600",    bg: "bg-red-50",      iconBg: "bg-red-100",     icon: STATS_ICONS.overdue },
    { label: "From AI",     value: aiTasks,    color: "text-brand-700",  iconColor: "text-brand-600",  bg: "bg-brand-50",    iconBg: "bg-brand-100",   icon: STATS_ICONS.aiTasks },
  ];

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Dashboard</h1>
        <p className="page-subtitle">Your workspace at a glance</p>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-8">
        {STATS.map((s) => (
          <div key={s.label} className={`card p-4 ${s.bg} animate-slide-up`}>
            <div className={`w-9 h-9 rounded-xl ${s.iconBg} ${s.iconColor} flex items-center justify-center mb-3`}>
              {s.icon}
            </div>
            <p className={`text-2xl font-bold tracking-tight ${s.color}`}>{s.value}</p>
            <p className="text-xs text-gray-500 mt-0.5 font-medium">{s.label}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* My tasks */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-gray-700">My Tasks</h2>
            <Link href="/tasks" className="text-xs text-brand-600 hover:underline font-medium">View all</Link>
          </div>
          <div className="card divide-y divide-gray-100">
            {recentMyTasks.length === 0 ? (
              <div className="py-10 text-center">
                <p className="text-sm text-gray-400">No tasks assigned to you.</p>
                <Link href="/tasks" className="text-xs text-brand-600 hover:underline mt-1 inline-block">Create one →</Link>
              </div>
            ) : (
              recentMyTasks.map((t: Task) => (
                <Link
                  key={t.id}
                  href="/tasks"
                  className={`flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors border-l-[3px] ${PRIORITY_BORDER[t.priority] ?? "border-l-transparent"}`}
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-800 truncate">{t.title}</p>
                    {t.dueDate && (
                      <p className={`text-xs mt-0.5 ${new Date(t.dueDate) < new Date() && t.status !== "done" ? "text-red-500" : "text-gray-400"}`}>
                        Due {new Date(t.dueDate).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                      </p>
                    )}
                  </div>
                  <span className={`w-2 h-2 rounded-full shrink-0 ${
                    t.status === "done" ? "bg-green-400" :
                    t.status === "in_progress" ? "bg-blue-400" :
                    t.status === "in_review" ? "bg-purple-400" : "bg-gray-300"
                  }`} />
                </Link>
              ))
            )}
          </div>
        </section>

        {/* Recent meetings */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-gray-700">Recent Meetings</h2>
            <Link href="/meetings" className="text-xs text-brand-600 hover:underline font-medium">View all</Link>
          </div>
          <div className="card divide-y divide-gray-100">
            {recentMeetings.length === 0 ? (
              <div className="py-10 text-center">
                <p className="text-sm text-gray-400">No meetings yet.</p>
                <Link href="/meetings" className="text-xs text-brand-600 hover:underline mt-1 inline-block">Invite CoTask Bot →</Link>
              </div>
            ) : (
              recentMeetings.map((m: Meeting) => (
                <Link
                  key={m.id}
                  href={`/meetings/${m.id}`}
                  className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors"
                >
                  <span className={`w-2 h-2 rounded-full shrink-0 ${STATUS_DOT[m.status] ?? "bg-gray-400"}`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-800 truncate">{m.title}</p>
                    <p className="text-xs text-gray-400 mt-0.5 capitalize">
                      {m.platform.replace("_", " ")}
                      {" · "}
                      {new Date(m.createdAt).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                    </p>
                  </div>
                </Link>
              ))
            )}
          </div>
        </section>

        {/* Team workload */}
        {members.length > 0 && (
          <section className="lg:col-span-2">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold text-gray-700">Team Workload</h2>
              <Link href="/tasks/team" className="text-xs text-brand-600 hover:underline font-medium">Team tasks</Link>
            </div>
            <div className="card p-5">
              <div className="space-y-4">
                {members.map((m, i) => {
                  const memberTasks = allTasks.filter((t: Task) => t.assigneeId === m.userId && t.status !== "done" && t.status !== "cancelled");
                  const maxTasks = Math.max(...members.map((mb) => allTasks.filter((t: Task) => t.assigneeId === mb.userId && t.status !== "done" && t.status !== "cancelled").length), 1);
                  const pct = Math.round((memberTasks.length / maxTasks) * 100);
                  const COLORS = ["bg-brand-500","bg-blue-500","bg-green-500","bg-purple-500","bg-orange-500"];
                  const AVATAR_COLORS = ["from-pink-400 to-rose-500","from-orange-400 to-amber-500","from-green-400 to-emerald-500","from-blue-400 to-indigo-500","from-purple-400 to-violet-500"];
                  return (
                    <div key={m.userId} className="flex items-center gap-3">
                      <div className={`w-7 h-7 rounded-full bg-gradient-to-br ${AVATAR_COLORS[i % AVATAR_COLORS.length]} flex items-center justify-center text-[11px] font-bold text-white shrink-0`}>
                        {m.user.displayName[0]?.toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="text-xs font-medium text-gray-700">{m.user.displayName}</span>
                          <span className="text-[11px] text-gray-400 tabular-nums">{memberTasks.length} active</span>
                        </div>
                        <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all duration-500 ${COLORS[i % COLORS.length]}`}
                            style={{ width: `${Math.max(pct, memberTasks.length > 0 ? 4 : 0)}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
