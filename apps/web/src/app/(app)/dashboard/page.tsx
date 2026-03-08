"use client";
import Link from "next/link";
import { useAuthStore } from "@/stores/authStore";
import { useTasks } from "@/hooks/useTasks";
import { useMeetings } from "@/hooks/useMeetings";
import { useWorkspaceMembers } from "@/hooks/useWorkspace";
import type { Task, Meeting } from "@cotask/types";

const STATUS_DOT: Record<string, string> = {
  scheduled: "bg-gray-400", active: "bg-blue-400 animate-pulse",
  processing: "bg-yellow-400 animate-pulse", completed: "bg-[#058527]", failed: "bg-[#DB4035]",
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
  const done       = myTasks.filter((t: Task) => t.status === "done").length;
  const overdue    = myTasks.filter((t: Task) => t.dueDate && new Date(t.dueDate) < new Date() && t.status !== "done" && t.status !== "cancelled").length;

  const recentMyTasks = myTasks.slice(0, 5);
  const recentMeetings = meetings.slice(0, 4);

  const STATS = [
    { label: "To Do",       value: todo },
    { label: "In Progress", value: inProgress },
    { label: "Done",        value: done },
    { label: "Overdue",     value: overdue },
  ];

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Overview</h1>
        <p className="page-subtitle">Your workspace at a glance</p>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-8">
        {STATS.map((s) => (
          <div key={s.label} className="card p-4">
            <p className="text-3xl font-bold text-[#202020]">{s.value}</p>
            <p className="text-sm text-[#666666] mt-1">{s.label}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* My tasks */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-base font-semibold text-[#202020]">My Tasks</h2>
            <Link href="/tasks" className="text-xs text-[#DB4035] hover:text-[#C0392B] font-medium transition-colors">View all</Link>
          </div>
          <div className="card divide-y divide-[#F0F0F0] overflow-hidden">
            {recentMyTasks.length === 0 ? (
              <div className="py-10 text-center">
                <p className="text-sm text-[#999999]">No tasks assigned to you.</p>
                <Link href="/tasks" className="text-xs text-[#DB4035] hover:text-[#C0392B] mt-1 inline-block transition-colors">Create one →</Link>
              </div>
            ) : (
              recentMyTasks.map((t: Task) => {
                const isOverdue = t.dueDate && new Date(t.dueDate) < new Date() && t.status !== "done";
                const isToday = t.dueDate && new Date(t.dueDate).toDateString() === new Date().toDateString();
                return (
                  <Link
                    key={t.id}
                    href="/tasks"
                    className="task-row"
                  >
                    <div className="w-[18px] h-[18px] rounded-full border border-[#CCCCCC] shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-[#202020] truncate">{t.title}</p>
                    </div>
                    {t.dueDate && (
                      <span className={`text-xs shrink-0 ${
                        isOverdue ? "text-[#DB4035]" : isToday ? "text-[#058527]" : "text-[#999999]"
                      }`}>
                        {new Date(t.dueDate).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                      </span>
                    )}
                  </Link>
                );
              })
            )}
          </div>
        </section>

        {/* Recent meetings */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-base font-semibold text-[#202020]">Recent Meetings</h2>
            <Link href="/meetings" className="text-xs text-[#DB4035] hover:text-[#C0392B] font-medium transition-colors">View all</Link>
          </div>
          <div className="card divide-y divide-[#F0F0F0] overflow-hidden">
            {recentMeetings.length === 0 ? (
              <div className="py-10 text-center">
                <p className="text-sm text-[#999999]">No meetings yet.</p>
                <Link href="/meetings" className="text-xs text-[#DB4035] hover:text-[#C0392B] mt-1 inline-block transition-colors">Invite CoTask Bot →</Link>
              </div>
            ) : (
              recentMeetings.map((m: Meeting) => (
                <Link
                  key={m.id}
                  href={`/meetings/${m.id}`}
                  className="task-row"
                >
                  <span className={`w-2 h-2 rounded-full shrink-0 ${STATUS_DOT[m.status] ?? "bg-gray-400"}`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-[#202020] truncate">{m.title}</p>
                  </div>
                  <span className="text-xs text-[#999999] shrink-0">
                    {new Date(m.createdAt).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                  </span>
                </Link>
              ))
            )}
          </div>
        </section>

        {/* Team workload */}
        {members.length > 0 && (
          <section className="lg:col-span-2">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-base font-semibold text-[#202020]">Team Workload</h2>
              <Link href="/tasks/team" className="text-xs text-[#DB4035] hover:text-[#C0392B] font-medium transition-colors">Team tasks</Link>
            </div>
            <div className="card p-4">
              <div className="space-y-4">
                {members.map((m) => {
                  const memberTasks = allTasks.filter((t: Task) => t.assigneeId === m.userId && t.status !== "done" && t.status !== "cancelled");
                  const maxTasks = Math.max(...members.map((mb) => allTasks.filter((t: Task) => t.assigneeId === mb.userId && t.status !== "done" && t.status !== "cancelled").length), 1);
                  const pct = Math.round((memberTasks.length / maxTasks) * 100);
                  return (
                    <div key={m.userId} className="flex items-center gap-3">
                      <div className="w-7 h-7 rounded-full bg-[#DB4035] flex items-center justify-center text-[11px] font-bold text-white shrink-0">
                        {m.user.displayName[0]?.toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="text-xs font-medium text-[#202020]">{m.user.displayName}</span>
                          <span className="text-[11px] text-[#999999] tabular-nums">{memberTasks.length} active</span>
                        </div>
                        <div className="h-1.5 bg-[#F0F0F0] rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full bg-[#DB4035] transition-all duration-500"
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
