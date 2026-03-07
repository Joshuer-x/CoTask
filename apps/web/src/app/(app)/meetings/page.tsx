"use client";
import { useState } from "react";
import Link from "next/link";
import { useAuthStore } from "@/stores/authStore";
import { useMeetings } from "@/hooks/useMeetings";
import { InviteBotModal } from "@/components/meetings/InviteBotModal";
import type { Meeting } from "@cotask/types";

const STATUS_CONFIG: Record<string, { label: string; dot: string; bg: string; text: string }> = {
  scheduled:  { label: "Scheduled",  dot: "bg-gray-400",                    bg: "bg-gray-50",   text: "text-gray-600" },
  active:     { label: "Live",        dot: "bg-blue-400 animate-pulse",      bg: "bg-blue-50",   text: "text-blue-700" },
  processing: { label: "Processing", dot: "bg-yellow-400 animate-pulse",    bg: "bg-yellow-50", text: "text-yellow-700" },
  completed:  { label: "Completed",  dot: "bg-green-400",                   bg: "bg-green-50",  text: "text-green-700" },
  failed:     { label: "Failed",     dot: "bg-red-400",                     bg: "bg-red-50",    text: "text-red-700" },
};

export default function MeetingsPage() {
  const workspaceId = useAuthStore((s) => s.workspaceId) ?? process.env["NEXT_PUBLIC_DEFAULT_WORKSPACE"] ?? "";
  const { data: meetings = [], isLoading } = useMeetings(workspaceId);
  const [showInviteBot, setShowInviteBot] = useState(false);

  return (
    <div>
      {showInviteBot && (
        <InviteBotModal workspaceId={workspaceId} onClose={() => setShowInviteBot(false)} />
      )}

      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Meetings</h1>
          <p className="text-sm text-gray-500 mt-0.5">{meetings.length} recorded</p>
        </div>
        <button onClick={() => setShowInviteBot(true)} className="btn-primary">
          <svg viewBox="0 0 16 16" fill="currentColor" className="w-3.5 h-3.5">
            <path d="M3.25 4A2.25 2.25 0 001 6.25v3.5A2.25 2.25 0 003.25 12h5.5A2.25 2.25 0 0011 9.75v-3.5A2.25 2.25 0 008.75 4h-5.5zM15 5.75a.75.75 0 00-1.28-.53l-2 2a.75.75 0 00-.22.53v1.5c0 .199.079.39.22.53l2 2a.75.75 0 001.28-.53V5.75z" />
          </svg>
          Invite CoTask Bot
        </button>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-24">
          <div className="flex items-center gap-2.5 text-gray-400 text-sm">
            <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4l3-3-3-3v4a8 8 0 00-8 8h4z" />
            </svg>
            Loading meetings…
          </div>
        </div>
      ) : meetings.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <div className="w-14 h-14 rounded-2xl bg-brand-50 flex items-center justify-center mb-4">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-7 h-7 text-brand-500">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 10.5l4.72-4.72a.75.75 0 011.28.53v11.38a.75.75 0 01-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 002.25-2.25v-9a2.25 2.25 0 00-2.25-2.25h-9A2.25 2.25 0 002.25 7.5v9a2.25 2.25 0 002.25 2.25z" />
            </svg>
          </div>
          <p className="text-sm font-semibold text-gray-700 mb-1">No meetings yet</p>
          <p className="text-sm text-gray-400 max-w-xs mb-4">
            Invite the CoTask bot to your next Zoom, Meet, or Teams meeting to automatically extract action items.
          </p>
          <button onClick={() => setShowInviteBot(true)} className="btn-primary">
            Invite CoTask Bot
          </button>
        </div>
      ) : (
        <div className="space-y-2">
          {meetings.map((m: Meeting) => {
            const cfg = STATUS_CONFIG[m.status] ?? STATUS_CONFIG.scheduled;
            return (
              <Link
                key={m.id}
                href={`/meetings/${m.id}`}
                className="flex items-center gap-4 card px-4 py-3.5 hover:shadow-card-hover hover:border-gray-300 transition-all group"
              >
                <div className="w-9 h-9 rounded-xl bg-brand-50 flex items-center justify-center shrink-0">
                  <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 text-brand-500">
                    <path d="M3.25 4A2.25 2.25 0 001 6.25v7.5A2.25 2.25 0 003.25 16h7.5A2.25 2.25 0 0013 13.75v-7.5A2.25 2.25 0 0010.75 4h-7.5zM19 4.75a.75.75 0 00-1.28-.53l-3 3a.75.75 0 00-.22.53v4.5c0 .199.079.39.22.53l3 3a.75.75 0 001.28-.53V4.75z" />
                  </svg>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 group-hover:text-brand-700 transition-colors truncate">{m.title}</p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {new Date(m.createdAt).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })}
                    {" · "}
                    <span className="capitalize">{m.platform.replace("_", " ")}</span>
                    {m.durationSeconds ? ` · ${Math.round(m.durationSeconds / 60)}m` : ""}
                  </p>
                </div>
                <span className={`inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full ${cfg.bg} ${cfg.text}`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
                  {cfg.label}
                </span>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
