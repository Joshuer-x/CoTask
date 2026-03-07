"use client";
import { useState, useRef, useEffect } from "react";
import { useTask, useUpdateTask, useDeleteTask, useDuplicateTask, useAddComment } from "@/hooks/useTasks";
import { useWorkspaceMembers } from "@/hooks/useWorkspace";
import { StatusBadge, PriorityBadge } from "@/components/ui/Badge";
import type { Task, TaskStatus, TaskPriority, TaskActivity } from "@cotask/types";

interface Props {
  workspaceId: string;
  taskId: string;
  onClose: () => void;
  onDeleted?: () => void;
}

const STATUSES: { value: TaskStatus; label: string }[] = [
  { value: "todo",        label: "To Do" },
  { value: "in_progress", label: "In Progress" },
  { value: "in_review",   label: "In Review" },
  { value: "done",        label: "Done" },
  { value: "cancelled",   label: "Cancelled" },
];

const PRIORITIES: { value: TaskPriority; label: string }[] = [
  { value: 1, label: "P1 — Urgent" },
  { value: 2, label: "P2 — High" },
  { value: 3, label: "P3 — Normal" },
  { value: 4, label: "P4 — Low" },
];

const AVATAR_COLORS = ["from-pink-400 to-rose-500","from-orange-400 to-amber-500","from-green-400 to-emerald-500","from-blue-400 to-indigo-500","from-purple-400 to-violet-500"];

function activityDescription(entry: TaskActivity): string {
  try {
    const nv = entry.newVal ? JSON.parse(entry.newVal) as Record<string, unknown> : null;
    const ov = entry.oldVal ? JSON.parse(entry.oldVal) as Record<string, unknown> : null;
    if (entry.eventType === "created") return "created this task";
    if (entry.eventType === "deleted") return "deleted this task";
    if (nv?.status) return `changed status from "${ov?.status ?? "?"}" to "${nv.status}"`;
    if (nv?.assigneeId !== undefined) return nv.assigneeId ? "reassigned this task" : "unassigned this task";
    if (nv?.priority) return `changed priority to P${nv.priority}`;
    if (nv?.title) return `renamed this task`;
    if (nv?.dueDate !== undefined) return nv.dueDate ? `set due date to ${nv.dueDate}` : "removed due date";
    return "updated this task";
  } catch {
    return "updated this task";
  }
}

export function TaskDetailPanel({ workspaceId, taskId, onClose, onDeleted }: Props) {
  const { data: task, isLoading } = useTask(workspaceId, taskId);
  const { data: members = [] } = useWorkspaceMembers(workspaceId);
  const updateTask = useUpdateTask(workspaceId);
  const deleteTask = useDeleteTask(workspaceId);
  const duplicate = useDuplicateTask(workspaceId);
  const addComment = useAddComment(workspaceId, taskId);

  const [activeTab, setActiveTab] = useState<"comments" | "activity">("comments");
  const [commentText, setCommentText] = useState("");
  const [editingTitle, setEditingTitle] = useState(false);
  const [titleDraft, setTitleDraft] = useState("");
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const titleRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (task) setTitleDraft(task.title);
  }, [task?.title]);

  function saveTitle() {
    if (!task || titleDraft.trim() === task.title || !titleDraft.trim()) {
      setEditingTitle(false);
      return;
    }
    updateTask.mutate({ taskId, changes: { title: titleDraft.trim() } });
    setEditingTitle(false);
  }

  function patch(changes: Partial<Task>) {
    updateTask.mutate({ taskId, changes });
  }

  async function handleDelete() {
    await deleteTask.mutateAsync(taskId);
    onDeleted?.();
    onClose();
  }

  async function handleDuplicate() {
    await duplicate.mutateAsync(taskId);
    onClose();
  }

  async function submitComment(e: React.FormEvent) {
    e.preventDefault();
    if (!commentText.trim()) return;
    await addComment.mutateAsync(commentText.trim());
    setCommentText("");
  }

  return (
    <div className="fixed inset-0 z-40 flex" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      {/* Backdrop */}
      <div className="flex-1 bg-gray-900/30 backdrop-blur-[2px]" onClick={onClose} />

      {/* Panel */}
      <div className="w-full max-w-xl bg-white shadow-2xl flex flex-col h-full overflow-hidden animate-slide-in-right">
        {isLoading || !task ? (
          <div className="flex-1 flex items-center justify-center">
            <svg className="animate-spin w-5 h-5 text-brand-500" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4l3-3-3-3v4a8 8 0 00-8 8h4z" />
            </svg>
          </div>
        ) : (
          <>
            {/* Header */}
            <div className="px-5 pt-5 pb-4 border-b border-gray-100">
              <div className="flex items-start justify-between gap-3 mb-3">
                {editingTitle ? (
                  <input
                    ref={titleRef}
                    value={titleDraft}
                    onChange={(e) => setTitleDraft(e.target.value)}
                    onBlur={saveTitle}
                    onKeyDown={(e) => { if (e.key === "Enter") saveTitle(); if (e.key === "Escape") { setEditingTitle(false); setTitleDraft(task.title); } }}
                    className="flex-1 text-base font-semibold text-gray-900 border border-brand-400 rounded-lg px-2 py-1 outline-none focus:ring-2 focus:ring-brand-500/20"
                    autoFocus
                  />
                ) : (
                  <h2
                    className="flex-1 text-base font-semibold text-gray-900 cursor-text hover:text-brand-700 transition-colors"
                    onClick={() => { setEditingTitle(true); setTimeout(() => titleRef.current?.select(), 0); }}
                  >
                    {task.title}
                  </h2>
                )}
                <button onClick={onClose} className="w-7 h-7 rounded-lg flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-100 shrink-0 transition-colors">
                  <svg viewBox="0 0 16 16" fill="currentColor" className="w-4 h-4">
                    <path d="M3.72 3.72a.75.75 0 011.06 0L8 6.94l3.22-3.22a.75.75 0 111.06 1.06L9.06 8l3.22 3.22a.75.75 0 11-1.06 1.06L8 9.06l-3.22 3.22a.75.75 0 01-1.06-1.06L6.94 8 3.72 4.78a.75.75 0 010-1.06z" />
                  </svg>
                </button>
              </div>

              {/* Source badge */}
              {task.source === "ai_meeting" && (
                <span className="inline-flex items-center gap-1 text-[11px] bg-brand-50 text-brand-600 px-2 py-0.5 rounded-md font-medium mb-3">
                  <svg viewBox="0 0 12 12" fill="currentColor" className="w-3 h-3">
                    <path d="M6 1a5 5 0 100 10A5 5 0 006 1zm.75 2.75a.75.75 0 00-1.5 0v2.5c0 .199.079.39.22.53l1.5 1.5a.75.75 0 001.06-1.06L6.75 5.94V3.75z" />
                  </svg>
                  From AI meeting
                </span>
              )}

              {/* Quick action buttons */}
              <div className="flex items-center gap-2">
                <button
                  onClick={handleDuplicate}
                  disabled={duplicate.isPending}
                  className="btn-secondary text-xs px-2.5 py-1.5"
                >
                  <svg viewBox="0 0 16 16" fill="currentColor" className="w-3.5 h-3.5">
                    <path d="M2 4.75A2.75 2.75 0 014.75 2h5.5a2.75 2.75 0 012.75 2.75v.5a.75.75 0 01-1.5 0v-.5c0-.69-.56-1.25-1.25-1.25h-5.5C4.06 3.5 3.5 4.06 3.5 4.75v5.5c0 .69.56 1.25 1.25 1.25h.5a.75.75 0 010 1.5h-.5A2.75 2.75 0 012 10.25v-5.5z" />
                    <path d="M6.75 7A2.75 2.75 0 004 9.75v2.5A2.75 2.75 0 006.75 15h2.5A2.75 2.75 0 0012 12.25v-2.5A2.75 2.75 0 009.25 7h-2.5z" />
                  </svg>
                  Duplicate
                </button>
                {showDeleteConfirm ? (
                  <div className="flex items-center gap-1.5 ml-auto">
                    <span className="text-xs text-red-600">Delete task?</span>
                    <button onClick={handleDelete} className="text-xs px-2.5 py-1.5 rounded-lg bg-red-600 text-white hover:bg-red-700">Yes, delete</button>
                    <button onClick={() => setShowDeleteConfirm(false)} className="text-xs px-2.5 py-1.5 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50">Cancel</button>
                  </div>
                ) : (
                  <button onClick={() => setShowDeleteConfirm(true)} className="btn-secondary text-xs px-2.5 py-1.5 ml-auto text-red-600 hover:text-red-700 hover:border-red-200">
                    <svg viewBox="0 0 16 16" fill="currentColor" className="w-3.5 h-3.5">
                      <path fillRule="evenodd" d="M5 3.25V4H2.75a.75.75 0 000 1.5h.3l.815 8.15A1.5 1.5 0 005.357 15h5.285a1.5 1.5 0 001.493-1.35l.815-8.15h.3a.75.75 0 000-1.5H11v-.75A2.25 2.25 0 008.75 1h-1.5A2.25 2.25 0 005 3.25zm2.25-.75a.75.75 0 00-.75.75V4h3v-.75a.75.75 0 00-.75-.75h-1.5zM6.05 6a.75.75 0 01.787.713l.275 5.5a.75.75 0 01-1.498.075l-.275-5.5A.75.75 0 016.05 6zm3.9 0a.75.75 0 01.712.787l-.275 5.5a.75.75 0 01-1.498-.075l.275-5.5A.75.75 0 019.95 6z" clipRule="evenodd" />
                    </svg>
                    Delete
                  </button>
                )}
              </div>
            </div>

            {/* Meta fields */}
            <div className="px-5 py-4 grid grid-cols-2 gap-3 border-b border-gray-100">
              <div>
                <label className="block text-[11px] font-semibold text-gray-400 uppercase tracking-wide mb-1.5">Status</label>
                <select
                  value={task.status}
                  onChange={(e) => patch({ status: e.target.value as TaskStatus })}
                  className="input py-1.5 text-xs"
                >
                  {STATUSES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-gray-400 uppercase tracking-wide mb-1.5">Priority</label>
                <select
                  value={task.priority}
                  onChange={(e) => patch({ priority: Number(e.target.value) as TaskPriority })}
                  className="input py-1.5 text-xs"
                >
                  {PRIORITIES.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-gray-400 uppercase tracking-wide mb-1.5">Assignee</label>
                <select
                  value={task.assigneeId ?? ""}
                  onChange={(e) => patch({ assigneeId: e.target.value || undefined })}
                  className="input py-1.5 text-xs"
                >
                  <option value="">Unassigned</option>
                  {members.map((m) => (
                    <option key={m.userId} value={m.userId}>{m.user.displayName}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-gray-400 uppercase tracking-wide mb-1.5">Due date</label>
                <input
                  type="date"
                  value={task.dueDate ?? ""}
                  onChange={(e) => patch({ dueDate: e.target.value || undefined })}
                  className="input py-1.5 text-xs"
                />
              </div>
            </div>

            {/* Description */}
            <div className="px-5 py-4 border-b border-gray-100">
              <label className="block text-[11px] font-semibold text-gray-400 uppercase tracking-wide mb-1.5">Description</label>
              <textarea
                defaultValue={task.description ?? ""}
                onBlur={(e) => {
                  const val = e.target.value.trim();
                  if (val !== (task.description ?? "")) patch({ description: val || undefined });
                }}
                rows={3}
                placeholder="Add a description…"
                className="input resize-none text-sm"
              />
            </div>

            {/* Tabs */}
            <div className="flex border-b border-gray-100 px-5">
              {(["comments", "activity"] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`py-2.5 px-1 mr-5 text-xs font-semibold border-b-2 capitalize transition-colors ${
                    activeTab === tab
                      ? "border-brand-500 text-brand-600"
                      : "border-transparent text-gray-400 hover:text-gray-600"
                  }`}
                >
                  {tab}
                  {tab === "comments" && task.comments.length > 0 && (
                    <span className="ml-1.5 bg-gray-100 text-gray-500 text-[10px] rounded-full px-1.5 py-0.5">{task.comments.length}</span>
                  )}
                  {tab === "activity" && task.activity.length > 0 && (
                    <span className="ml-1.5 bg-gray-100 text-gray-500 text-[10px] rounded-full px-1.5 py-0.5">{task.activity.length}</span>
                  )}
                </button>
              ))}
            </div>

            {/* Tab content */}
            <div className="flex-1 overflow-y-auto px-5 py-4">
              {activeTab === "comments" && (
                <div className="space-y-4">
                  {task.comments.map((c, i) => (
                    <div key={c.id} className="flex gap-3">
                      <div className={`w-7 h-7 rounded-full bg-gradient-to-br ${AVATAR_COLORS[i % AVATAR_COLORS.length]} flex items-center justify-center text-xs font-semibold text-white shrink-0 mt-0.5`}>
                        {c.author.displayName[0]?.toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-baseline gap-2 mb-0.5">
                          <span className="text-xs font-semibold text-gray-800">{c.author.displayName}</span>
                          <span className="text-[11px] text-gray-400">{new Date(c.createdAt).toLocaleString(undefined, { dateStyle: "short", timeStyle: "short" })}</span>
                        </div>
                        <p className="text-sm text-gray-700 leading-relaxed bg-gray-50 rounded-xl px-3 py-2">{c.body}</p>
                      </div>
                    </div>
                  ))}

                  {task.comments.length === 0 && (
                    <p className="text-sm text-gray-400 text-center py-4">No comments yet. Be the first to comment.</p>
                  )}

                  {/* Add comment */}
                  <form onSubmit={submitComment} className="flex gap-2 pt-2">
                    <input
                      value={commentText}
                      onChange={(e) => setCommentText(e.target.value)}
                      placeholder="Add a comment…"
                      className="input flex-1 py-2 text-sm"
                    />
                    <button
                      type="submit"
                      disabled={!commentText.trim() || addComment.isPending}
                      className="btn-primary px-3 py-2 text-xs"
                    >
                      {addComment.isPending ? "…" : "Send"}
                    </button>
                  </form>
                </div>
              )}

              {activeTab === "activity" && (
                <div className="space-y-3">
                  {task.activity.map((entry) => (
                    <div key={entry.id} className="flex items-start gap-2.5">
                      <div className="w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center shrink-0 mt-0.5">
                        <span className="text-[10px] font-bold text-gray-500">{entry.actor.displayName[0]?.toUpperCase()}</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <span className="text-xs text-gray-700">
                          <span className="font-semibold">{entry.actor.displayName}</span>{" "}
                          {activityDescription(entry)}
                        </span>
                        <p className="text-[11px] text-gray-400 mt-0.5">{new Date(entry.createdAt).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })}</p>
                      </div>
                    </div>
                  ))}
                  {task.activity.length === 0 && (
                    <p className="text-sm text-gray-400 text-center py-4">No activity yet.</p>
                  )}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
