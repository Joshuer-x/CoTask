"use client";
import { useState } from "react";
import { useAuthStore } from "@/stores/authStore";
import { useWorkspaceMembers } from "@/hooks/useWorkspace";
import { InviteMemberModal } from "@/components/settings/InviteMemberModal";

const ROLE_STYLES: Record<string, string> = {
  admin:  "bg-purple-50 text-purple-700 ring-1 ring-purple-200",
  member: "bg-gray-50 text-gray-600 ring-1 ring-gray-200",
  guest:  "bg-yellow-50 text-yellow-700 ring-1 ring-yellow-200",
};

const AVATAR_COLORS = [
  "from-pink-400 to-rose-500",
  "from-orange-400 to-amber-500",
  "from-green-400 to-emerald-500",
  "from-blue-400 to-indigo-500",
  "from-purple-400 to-violet-500",
];

export default function SettingsPage() {
  const workspaceId = useAuthStore((s) => s.workspaceId) ?? process.env["NEXT_PUBLIC_DEFAULT_WORKSPACE"] ?? "";
  const { data: members, isLoading } = useWorkspaceMembers(workspaceId);
  const [showInvite, setShowInvite] = useState(false);

  return (
    <div className="max-w-xl">
      {showInvite && (
        <InviteMemberModal workspaceId={workspaceId} onClose={() => setShowInvite(false)} />
      )}

      <div className="mb-8">
        <h1 className="text-xl font-bold text-gray-900">Settings</h1>
        <p className="text-sm text-gray-500 mt-0.5">Manage your workspace and team</p>
      </div>

      <section className="card p-6 mb-4">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h2 className="text-sm font-semibold text-gray-900">Team Members</h2>
            {members && <p className="text-xs text-gray-400 mt-0.5">{members.length} members</p>}
          </div>
          <button onClick={() => setShowInvite(true)} className="btn-primary text-xs px-3 py-1.5">
            <svg viewBox="0 0 16 16" fill="currentColor" className="w-3.5 h-3.5">
              <path d="M8 2a.75.75 0 01.75.75v4.5h4.5a.75.75 0 010 1.5h-4.5v4.5a.75.75 0 01-1.5 0v-4.5h-4.5a.75.75 0 010-1.5h4.5v-4.5A.75.75 0 018 2z" />
            </svg>
            Invite
          </button>
        </div>

        {isLoading ? (
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="flex items-center gap-3 animate-pulse">
                <div className="w-9 h-9 rounded-full bg-gray-200" />
                <div className="flex-1 space-y-1.5">
                  <div className="h-3 bg-gray-200 rounded w-32" />
                  <div className="h-2.5 bg-gray-100 rounded w-48" />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {members?.map((m, i) => (
              <div key={m.userId} className="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
                <div className={`w-9 h-9 rounded-full bg-gradient-to-br ${AVATAR_COLORS[i % AVATAR_COLORS.length]} flex items-center justify-center text-sm font-semibold text-white shrink-0`}>
                  {m.user.displayName[0]?.toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900">{m.user.displayName}</p>
                  <p className="text-xs text-gray-400 truncate">{m.user.email}</p>
                </div>
                <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full capitalize ${ROLE_STYLES[m.role] ?? ROLE_STYLES.member}`}>
                  {m.role}
                </span>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
