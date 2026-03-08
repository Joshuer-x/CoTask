"use client";
import { useState } from "react";
import Link from "next/link";
import { useAuthStore } from "@/stores/authStore";
import { useMeetings } from "@/hooks/useMeetings";
import { InviteBotModal } from "@/components/meetings/InviteBotModal";
import type { Meeting } from "@cotask/types";

const STATUS_CONFIG: Record<string, { label: string; dot: string; textColor: string }> = {
  scheduled:  { label: "Scheduled",  dot: "bg-gray-400",                 textColor: "text-[#666666]" },
  active:     { label: "Live",        dot: "bg-blue-400 animate-pulse",   textColor: "text-blue-700" },
  processing: { label: "Processing", dot: "bg-yellow-400 animate-pulse", textColor: "text-[#E07800]" },
  completed:  { label: "Completed",  dot: "bg-[#058527]",                textColor: "text-[#058527]" },
  failed:     { label: "Failed",     dot: "bg-[#DB4035]",                textColor: "text-[#DB4035]" },
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

      <div className="flex items-start justify-between mb-6">
        <div className="page-header mb-0">
          <h1 className="page-title">Meetings</h1>
          <p className="page-subtitle">{meetings.length} recorded</p>
        </div>
        <div className="mt-1">
          <button onClick={() => setShowInviteBot(true)} className="btn-primary">
            <svg viewBox="0 0 16 16" fill="currentColor" className="w-3.5 h-3.5">
              <path d="M3.25 4A2.25 2.25 0 001 6.25v3.5A2.25 2.25 0 003.25 12h5.5A2.25 2.25 0 0011 9.75v-3.5A2.25 2.25 0 008.75 4h-5.5zM15 5.75a.75.75 0 00-1.28-.53l-2 2a.75.75 0 00-.22.53v1.5c0 .199.079.39.22.53l2 2a.75.75 0 001.28-.53V5.75z" />
            </svg>
            Invite CoTask Bot
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
            Loading meetings…
          </div>
        </div>
      ) : meetings.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <div className="w-12 h-12 rounded-lg bg-[#FFF5F5] flex items-center justify-center mb-4">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-6 h-6 text-[#DB4035]">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 10.5l4.72-4.72a.75.75 0 011.28.53v11.38a.75.75 0 01-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 002.25-2.25v-9a2.25 2.25 0 00-2.25-2.25h-9A2.25 2.25 0 002.25 7.5v9a2.25 2.25 0 002.25 2.25z" />
            </svg>
          </div>
          <p className="text-sm font-semibold text-[#202020] mb-1">No meetings yet</p>
          <p className="text-sm text-[#666666] max-w-xs mb-4">
            Invite the CoTask bot to your next Zoom, Meet, or Teams meeting to automatically extract action items.
          </p>
          <button onClick={() => setShowInviteBot(true)} className="btn-primary">
            Invite CoTask Bot
          </button>
        </div>
      ) : (
        <div className="card overflow-hidden">
          {meetings.map((m: Meeting) => {
            const cfg = STATUS_CONFIG[m.status] ?? STATUS_CONFIG.scheduled;
            return (
              <Link
                key={m.id}
                href={`/meetings/${m.id}`}
                className="task-row"
              >
                <span className={`w-2 h-2 rounded-full shrink-0 ${cfg.dot}`} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-[#202020] truncate">{m.title}</p>
                  <p className="text-xs text-[#999999] mt-0.5">
                    {new Date(m.createdAt).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })}
                    {" · "}
                    <span className="capitalize">{m.platform.replace("_", " ")}</span>
                    {m.durationSeconds ? ` · ${Math.round(m.durationSeconds / 60)}m` : ""}
                  </p>
                </div>
                <span className={`text-xs font-medium shrink-0 ${cfg.textColor}`}>
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
