"use client";
import { useState } from "react";
import type { ActionPoint, InferenceReason } from "@cotask/types";
import { ConfidenceBadge } from "@/components/ui/Badge";
import { api } from "@/lib/api";

interface ActionPointsListProps {
  meetingId: string;
  workspaceId: string;
  actionPoints: ActionPoint[];
  onUpdate?: () => void;
}

const INFERENCE_LABELS: Record<InferenceReason, { label: string; detail: string }> = {
  explicit_name:  { label: "Explicit mention",  detail: "Their name was spoken directly in context with this task." },
  first_person:   { label: "First-person",       detail: "The speaker said \"I will\" or \"I'll\" — assigned to themselves." },
  role_match:     { label: "Role match",          detail: "Their workspace role matched the function mentioned (e.g. Engineering, Design)." },
  unresolved:     { label: "Unresolved",          detail: "No clear owner could be identified from the conversation." },
};

function WhyTooltip({ reason }: { reason: InferenceReason }) {
  const [open, setOpen] = useState(false);
  const info = INFERENCE_LABELS[reason];

  return (
    <span className="relative inline-flex items-center">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="inline-flex items-center gap-1 text-xs text-gray-400 hover:text-brand-600 transition-colors"
      >
        <svg viewBox="0 0 14 14" fill="currentColor" className="w-3 h-3">
          <path fillRule="evenodd" d="M7 1a6 6 0 100 12A6 6 0 007 1zm0 9.5a.75.75 0 110-1.5.75.75 0 010 1.5zm.75-3.75a.75.75 0 00-1.5 0v-.5c0-.414.336-.75.75-.75a.75.75 0 000-1.5 2.25 2.25 0 00-2.25 2.25v.5a2.25 2.25 0 004.5 0 .75.75 0 00-1.5 0z" clipRule="evenodd" />
        </svg>
        Why?
      </button>
      {open && (
        <div className="absolute bottom-full left-0 mb-2 z-20 w-56 bg-gray-900 text-white rounded-xl px-3 py-2.5 shadow-lg animate-fade-in">
          <p className="text-[11px] font-semibold mb-0.5">{info.label}</p>
          <p className="text-[11px] text-gray-300 leading-relaxed">{info.detail}</p>
          <div className="absolute top-full left-4 -translate-y-px w-0 h-0 border-l-4 border-r-4 border-t-4 border-l-transparent border-r-transparent border-t-gray-900" />
        </div>
      )}
    </span>
  );
}

export function ActionPointsList({ meetingId, workspaceId, actionPoints, onUpdate }: ActionPointsListProps) {
  const [busy, setBusy] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState("");

  const pending  = actionPoints.filter((ap) => ap.accepted === null);
  const accepted = actionPoints.filter((ap) => ap.accepted === true);
  const rejected = actionPoints.filter((ap) => ap.accepted === false);

  async function accept(apId: string) {
    setBusy(apId);
    await api.post(`/workspaces/${workspaceId}/meetings/${meetingId}/action-points/${apId}/accept`);
    onUpdate?.();
    setBusy(null);
  }

  async function reject(apId: string) {
    setBusy(apId);
    await api.post(`/workspaces/${workspaceId}/meetings/${meetingId}/action-points/${apId}/reject`);
    onUpdate?.();
    setBusy(null);
  }

  async function acceptAll() {
    setBusy("all");
    await api.post(`/workspaces/${workspaceId}/meetings/${meetingId}/action-points/accept-all`);
    onUpdate?.();
    setBusy(null);
  }

  async function saveEdit(apId: string) {
    if (!editText.trim()) return;
    await api.patch(`/workspaces/${workspaceId}/meetings/${meetingId}/action-points/${apId}`, {
      normalizedText: editText.trim(),
    });
    onUpdate?.();
    setEditingId(null);
  }

  const confidenceLabel = (score: number): "high" | "medium" | "low" =>
    score >= 0.85 ? "high" : score >= 0.6 ? "medium" : "low";

  return (
    <div className="space-y-6">
      {pending.length > 0 && (
        <section>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-yellow-400" />
              <h3 className="text-sm font-semibold text-gray-700">Pending review</h3>
              <span className="text-xs text-gray-400 bg-gray-100 rounded-full px-2 py-0.5">{pending.length}</span>
            </div>
            <button
              onClick={acceptAll}
              disabled={busy === "all"}
              className="btn-primary text-xs px-3 py-1.5"
            >
              {busy === "all" ? (
                <>
                  <svg className="animate-spin w-3 h-3" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4l3-3-3-3v4a8 8 0 00-8 8h4z" />
                  </svg>
                  Accepting…
                </>
              ) : "Accept all medium+"}
            </button>
          </div>

          <div className="space-y-2.5">
            {pending.map((ap) => (
              <div key={ap.id} className="card p-4">
                <div className="flex items-start gap-4">
                  <div className="flex-1 min-w-0">
                    {editingId === ap.id ? (
                      <div className="flex gap-2 mb-2">
                        <input
                          autoFocus
                          value={editText}
                          onChange={(e) => setEditText(e.target.value)}
                          onKeyDown={(e) => { if (e.key === "Enter") saveEdit(ap.id); if (e.key === "Escape") setEditingId(null); }}
                          className="input flex-1 text-sm py-1.5"
                        />
                        <button onClick={() => saveEdit(ap.id)} className="btn-primary text-xs px-2.5 py-1.5">Save</button>
                        <button onClick={() => setEditingId(null)} className="btn-secondary text-xs px-2.5 py-1.5">Cancel</button>
                      </div>
                    ) : (
                      <p
                        className="text-sm text-gray-900 leading-relaxed cursor-text hover:bg-gray-50 rounded px-1 -mx-1 transition-colors"
                        onClick={() => { setEditingId(ap.id); setEditText(ap.normalizedText); }}
                        title="Click to edit"
                      >
                        {ap.normalizedText}
                      </p>
                    )}

                    <div className="mt-2.5 flex items-center gap-2 flex-wrap">
                      <ConfidenceBadge confidence={confidenceLabel(ap.confidence)} />

                      {ap.inferredAssignee ? (
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs text-gray-500">
                            → <span className="font-medium text-gray-700">{ap.inferredAssignee.displayName}</span>
                          </span>
                          <WhyTooltip reason={ap.inferenceReason} />
                        </div>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-xs text-orange-600 font-medium bg-orange-50 px-2 py-0.5 rounded-full">
                          <svg viewBox="0 0 12 12" fill="currentColor" className="w-3 h-3">
                            <path fillRule="evenodd" d="M6 1a5 5 0 100 10A5 5 0 006 1zM5.25 3.75a.75.75 0 011.5 0v2.5a.75.75 0 01-1.5 0v-2.5zM6 8.5a.625.625 0 110 1.25A.625.625 0 016 8.5z" clipRule="evenodd" />
                          </svg>
                          Needs owner
                        </span>
                      )}

                      {ap.dueDateHint && (
                        <span className="text-xs text-gray-400">Due {ap.dueDateHint}</span>
                      )}
                    </div>
                  </div>

                  <div className="flex gap-2 shrink-0">
                    <button
                      onClick={() => reject(ap.id)}
                      disabled={busy === ap.id}
                      className="btn-secondary text-xs px-3 py-1.5"
                    >
                      Reject
                    </button>
                    <button
                      onClick={() => accept(ap.id)}
                      disabled={busy === ap.id}
                      className="btn-primary text-xs px-3 py-1.5"
                    >
                      {busy === ap.id ? "…" : "Accept"}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {accepted.length > 0 && (
        <section>
          <div className="flex items-center gap-2 mb-3">
            <span className="w-2 h-2 rounded-full bg-green-400" />
            <h3 className="text-sm font-semibold text-gray-500">Accepted</h3>
            <span className="text-xs text-gray-400 bg-gray-100 rounded-full px-2 py-0.5">{accepted.length}</span>
          </div>
          <div className="space-y-1.5">
            {accepted.map((ap) => (
              <div key={ap.id} className="flex items-start gap-2.5 px-3 py-2.5 rounded-xl bg-green-50 border border-green-100">
                <svg viewBox="0 0 16 16" fill="currentColor" className="w-4 h-4 text-green-500 mt-0.5 shrink-0">
                  <path fillRule="evenodd" d="M12.416 3.376a.75.75 0 01.208 1.04l-5 7.5a.75.75 0 01-1.154.114l-3-3a.75.75 0 011.06-1.06l2.353 2.353 4.493-6.74a.75.75 0 011.04-.207z" clipRule="evenodd" />
                </svg>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-green-800">{ap.normalizedText}</p>
                  {ap.inferredAssignee && (
                    <p className="text-xs text-green-600 mt-0.5">Assigned to {ap.inferredAssignee.displayName}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {rejected.length > 0 && (
        <section>
          <div className="flex items-center gap-2 mb-3">
            <span className="w-2 h-2 rounded-full bg-gray-300" />
            <h3 className="text-sm font-semibold text-gray-400">Rejected</h3>
            <span className="text-xs text-gray-300 bg-gray-100 rounded-full px-2 py-0.5">{rejected.length}</span>
          </div>
          <div className="space-y-1.5">
            {rejected.map((ap) => (
              <div key={ap.id} className="px-3 py-2.5 rounded-xl bg-gray-50 border border-gray-100">
                <p className="text-sm text-gray-400 line-through">{ap.normalizedText}</p>
              </div>
            ))}
          </div>
        </section>
      )}

      {actionPoints.length === 0 && (
        <div className="text-center py-10">
          <p className="text-sm text-gray-400">No action points were extracted from this meeting.</p>
        </div>
      )}
    </div>
  );
}
