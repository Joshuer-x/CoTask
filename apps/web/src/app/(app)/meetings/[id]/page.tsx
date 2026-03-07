"use client";
import { useParams, useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { useAuthStore } from "@/stores/authStore";
import { useMeeting } from "@/hooks/useMeetings";
import { ActionPointsList } from "@/components/meetings/ActionPointsList";

const STATUS_CONFIG: Record<string, { label: string; dot: string; bg: string; text: string }> = {
  scheduled:  { label: "Scheduled",  dot: "bg-gray-400",                 bg: "bg-gray-100",    text: "text-gray-600" },
  active:     { label: "Live",        dot: "bg-blue-400 animate-pulse",   bg: "bg-blue-100",    text: "text-blue-700" },
  processing: { label: "Processing", dot: "bg-yellow-400 animate-pulse", bg: "bg-yellow-100",  text: "text-yellow-700" },
  completed:  { label: "Completed",  dot: "bg-green-400",                bg: "bg-green-100",   text: "text-green-700" },
  failed:     { label: "Failed",     dot: "bg-red-400",                  bg: "bg-red-100",     text: "text-red-700" },
};

export default function MeetingDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const workspaceId = useAuthStore((s) => s.workspaceId) ?? process.env["NEXT_PUBLIC_DEFAULT_WORKSPACE"] ?? "";
  const qc = useQueryClient();

  const { data: meeting, isLoading } = useMeeting(workspaceId, id);

  if (isLoading) {
    return (
      <div className="max-w-2xl">
        <div className="animate-pulse space-y-4">
          <div className="h-4 bg-gray-200 rounded w-24" />
          <div className="h-7 bg-gray-200 rounded w-64" />
          <div className="h-4 bg-gray-100 rounded w-48" />
          <div className="h-px bg-gray-100 mt-6" />
          {[...Array(3)].map((_, i) => (
            <div key={i} className="card p-4 space-y-2">
              <div className="h-4 bg-gray-200 rounded w-3/4" />
              <div className="h-3 bg-gray-100 rounded w-1/2" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (!meeting) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <p className="text-sm font-semibold text-gray-700 mb-1">Meeting not found</p>
        <button onClick={() => router.back()} className="text-xs text-brand-600 hover:underline mt-1">Go back</button>
      </div>
    );
  }

  const cfg = STATUS_CONFIG[meeting.status] ?? STATUS_CONFIG.scheduled;

  return (
    <div className="max-w-2xl">
      {/* Back nav */}
      <button
        onClick={() => router.back()}
        className="inline-flex items-center gap-1.5 text-xs text-gray-400 hover:text-gray-700 transition-colors mb-5"
      >
        <svg viewBox="0 0 16 16" fill="currentColor" className="w-3.5 h-3.5">
          <path fillRule="evenodd" d="M9.78 4.22a.75.75 0 010 1.06L7.06 8l2.72 2.72a.75.75 0 11-1.06 1.06L5.47 8.53a.75.75 0 010-1.06l3.25-3.25a.75.75 0 011.06 0z" clipRule="evenodd" />
        </svg>
        Meetings
      </button>

      {/* Header */}
      <div className="mb-6">
        <div className="flex items-start justify-between gap-4">
          <h1 className="text-xl font-bold text-gray-900 leading-snug">{meeting.title}</h1>
          <span className={`inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full shrink-0 ${cfg.bg} ${cfg.text}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
            {cfg.label}
          </span>
        </div>
        <p className="text-sm text-gray-400 mt-1.5 flex items-center gap-2">
          <span>{new Date(meeting.createdAt).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })}</span>
          <span className="text-gray-300">·</span>
          <span className="capitalize">{meeting.platform.replace("_", " ")}</span>
          {meeting.durationSeconds ? (
            <>
              <span className="text-gray-300">·</span>
              <span>{Math.round(meeting.durationSeconds / 60)} min</span>
            </>
          ) : null}
        </p>
      </div>

      {meeting.status === "processing" && (
        <div className="mb-6 flex items-center gap-3 bg-yellow-50 border border-yellow-200 rounded-xl px-4 py-3">
          <svg className="animate-spin w-4 h-4 text-yellow-500 shrink-0" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4l3-3-3-3v4a8 8 0 00-8 8h4z" />
          </svg>
          <p className="text-sm text-yellow-800">CoTask is processing this meeting. Action items will appear shortly.</p>
        </div>
      )}

      {meeting.status === "completed" && (
        <ActionPointsList
          meetingId={meeting.id}
          workspaceId={workspaceId}
          actionPoints={meeting.actionPoints}
          onUpdate={() => qc.invalidateQueries({ queryKey: ["meetings", workspaceId, id] })}
        />
      )}

      {meeting.status === "failed" && (
        <div className="flex items-start gap-3 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
          <svg viewBox="0 0 16 16" fill="currentColor" className="w-4 h-4 text-red-500 shrink-0 mt-0.5">
            <path fillRule="evenodd" d="M8 15A7 7 0 108 1a7 7 0 000 14zm0-10a.75.75 0 01.75.75v4a.75.75 0 01-1.5 0v-4A.75.75 0 018 5zm0 6.5a.875.875 0 110 1.75.875.875 0 010-1.75z" clipRule="evenodd" />
          </svg>
          <p className="text-sm text-red-700">Processing failed. Please contact support.</p>
        </div>
      )}

      {meeting.status === "scheduled" && (
        <div className="text-center py-12 text-gray-400">
          <p className="text-sm">The bot hasn't joined this meeting yet.</p>
        </div>
      )}
    </div>
  );
}
