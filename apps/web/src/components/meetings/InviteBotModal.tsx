"use client";
import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { MeetingPlatform } from "@cotask/types";

interface InviteBotModalProps {
  workspaceId: string;
  onClose: () => void;
}

const PLATFORMS: { value: MeetingPlatform; label: string; icon: string }[] = [
  { value: "zoom",        label: "Zoom",          icon: "Z" },
  { value: "google_meet", label: "Google Meet",   icon: "G" },
  { value: "teams",       label: "Microsoft Teams", icon: "T" },
];

export function InviteBotModal({ workspaceId, onClose }: InviteBotModalProps) {
  const qc = useQueryClient();
  const [title, setTitle] = useState("");
  const [platform, setPlatform] = useState<MeetingPlatform>("zoom");
  const [meetingUrl, setMeetingUrl] = useState("");
  const [externalId, setExternalId] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim() || !meetingUrl.trim()) return;
    setError(null);
    setLoading(true);
    try {
      await api.post(`/workspaces/${workspaceId}/meetings`, {
        title: title.trim(),
        platform,
        botJoinUrl: meetingUrl.trim(),
        externalMeetingId: externalId.trim() || crypto.randomUUID(),
      });
      qc.invalidateQueries({ queryKey: ["meetings", workspaceId] });
      onClose();
    } catch (err: unknown) {
      const msg = (err as { error?: { message?: string } })?.error?.message ?? "Failed to invite bot";
      setError(msg);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-gray-950/50 backdrop-blur-sm animate-fade-in"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="w-full max-w-md bg-white rounded-2xl shadow-modal p-6 animate-scale-in">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h2 className="text-base font-semibold text-gray-900">Invite CoTask Bot</h2>
            <p className="text-xs text-gray-500 mt-0.5">Bot will join, listen, and create tasks automatically</p>
          </div>
          <button onClick={onClose} className="w-7 h-7 rounded-lg flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors">
            <svg viewBox="0 0 16 16" fill="currentColor" className="w-4 h-4">
              <path d="M3.72 3.72a.75.75 0 011.06 0L8 6.94l3.22-3.22a.75.75 0 111.06 1.06L9.06 8l3.22 3.22a.75.75 0 11-1.06 1.06L8 9.06l-3.22 3.22a.75.75 0 01-1.06-1.06L6.94 8 3.72 4.78a.75.75 0 010-1.06z" />
            </svg>
          </button>
        </div>

        {error && (
          <div className="mb-4 rounded-xl bg-red-50 border border-red-200 px-3 py-2.5 text-sm text-red-700">{error}</div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Meeting title <span className="text-red-500">*</span></label>
            <input
              autoFocus
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Weekly team sync"
              className="input"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Platform</label>
            <div className="grid grid-cols-3 gap-2">
              {PLATFORMS.map((p) => (
                <button
                  key={p.value}
                  type="button"
                  onClick={() => setPlatform(p.value)}
                  className={`flex flex-col items-center gap-1.5 px-3 py-2.5 rounded-xl border text-xs font-medium transition-all ${
                    platform === p.value
                      ? "border-brand-500 bg-brand-50 text-brand-700"
                      : "border-gray-200 text-gray-600 hover:border-gray-300 hover:bg-gray-50"
                  }`}
                >
                  <span className={`w-6 h-6 rounded-md flex items-center justify-center text-xs font-bold text-white ${
                    p.value === "zoom" ? "bg-blue-500" : p.value === "google_meet" ? "bg-green-500" : "bg-purple-500"
                  }`}>{p.icon}</span>
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Meeting link <span className="text-red-500">*</span></label>
            <input
              type="url"
              required
              value={meetingUrl}
              onChange={(e) => setMeetingUrl(e.target.value)}
              placeholder="https://zoom.us/j/..."
              className="input"
            />
            <p className="mt-1 text-xs text-gray-400">Paste the join link from your calendar invite or meeting app.</p>
          </div>

          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose} className="btn-secondary flex-1">Cancel</button>
            <button type="submit" disabled={loading || !title.trim() || !meetingUrl.trim()} className="btn-primary flex-1">
              {loading ? (
                <>
                  <svg className="animate-spin w-3.5 h-3.5" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4l3-3-3-3v4a8 8 0 00-8 8h4z" />
                  </svg>
                  Inviting…
                </>
              ) : "Invite bot"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
