"use client";
import { useState } from "react";
import { useAuthStore } from "@/stores/authStore";
import { useWorkspaceMembers } from "@/hooks/useWorkspace";
import { InviteMemberModal } from "@/components/settings/InviteMemberModal";

type Tab = "team" | "billing" | "advanced";

const ROLE_STYLES: Record<string, string> = {
  admin:  "bg-[#F3EFFE] text-[#7C3AED]",
  member: "bg-[#F5F5F5] text-[#666666]",
  guest:  "bg-[#FEF3C7] text-[#E07800]",
};

export default function SettingsPage() {
  const workspaceId = useAuthStore((s) => s.workspaceId) ?? process.env["NEXT_PUBLIC_DEFAULT_WORKSPACE"] ?? "";
  const { data: members, isLoading } = useWorkspaceMembers(workspaceId);
  const [showInvite, setShowInvite] = useState(false);
  const [activeTab, setActiveTab] = useState<Tab>("team");

  const NAV_TABS: { id: Tab; label: string }[] = [
    { id: "team", label: "Team" },
    { id: "billing", label: "Billing" },
    { id: "advanced", label: "Advanced" },
  ];

  return (
    <div className="flex h-full -mx-6 -my-5 overflow-hidden" style={{ minHeight: "calc(100vh - 48px)" }}>
      {showInvite && (
        <InviteMemberModal workspaceId={workspaceId} onClose={() => setShowInvite(false)} />
      )}

      {/* Left nav */}
      <div className="w-[200px] shrink-0 bg-[#FAF7F5] border-r border-[#EEEEEE] p-3 flex flex-col gap-0.5">
        <p className="section-label px-3 mb-2 mt-1">Settings</p>
        {NAV_TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`text-left text-[13px] py-2 px-3 rounded-md transition-colors duration-150 ${
              activeTab === tab.id
                ? "bg-[#FDECEA] text-[#DB4035] font-medium"
                : "text-[#444444] hover:bg-[#F0EDEA]"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Right content */}
      <div className="flex-1 overflow-y-auto bg-white p-8">
        {activeTab === "team" && (
          <div className="max-w-lg">
            {/* Team Name */}
            <section className="mb-8">
              <label className="block text-[13px] font-semibold text-[#202020] mb-1">Team Name</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  defaultValue="My Workspace"
                  className="input flex-1"
                  placeholder="Enter team name"
                />
                <button className="btn-secondary px-4">Save</button>
              </div>
            </section>

            {/* Invite Team Members */}
            <section className="mb-8">
              <label className="block text-[13px] font-semibold text-[#202020] mb-1">Invite Team Members</label>
              <p className="text-[13px] text-[#666666] mb-3">Send an invitation to add someone to your workspace.</p>
              <div className="flex gap-2 mb-2">
                <input
                  type="email"
                  className="input flex-1"
                  placeholder="colleague@example.com"
                />
                <select className="input w-auto text-xs">
                  <option value="member">Member</option>
                  <option value="admin">Admin</option>
                  <option value="guest">Guest</option>
                </select>
              </div>
              <button onClick={() => setShowInvite(true)} className="btn-primary">
                Send Invite
              </button>
            </section>

            {/* Team Members */}
            <section>
              <div className="flex items-center justify-between mb-3">
                <label className="block text-[13px] font-semibold text-[#202020]">
                  Team Members {members ? `(${members.length})` : ""}
                </label>
              </div>

              {isLoading ? (
                <div className="space-y-3">
                  {[...Array(3)].map((_, i) => (
                    <div key={i} className="flex items-center gap-3 animate-pulse">
                      <div className="w-8 h-8 rounded-full bg-[#F0F0F0]" />
                      <div className="flex-1 space-y-1.5">
                        <div className="h-3 bg-[#F0F0F0] rounded w-32" />
                        <div className="h-2.5 bg-[#F5F5F5] rounded w-48" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="divide-y divide-[#F0F0F0]">
                  {members?.map((m) => (
                    <div key={m.userId} className="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
                      <div className="w-8 h-8 rounded-full bg-[#DB4035] flex items-center justify-center text-sm font-semibold text-white shrink-0">
                        {m.user.displayName[0]?.toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-[#202020]">{m.user.displayName}</p>
                        <p className="text-xs text-[#999999] truncate">{m.user.email}</p>
                      </div>
                      <span className={`badge capitalize ${ROLE_STYLES[m.role] ?? ROLE_STYLES.member}`}>
                        {m.role}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </div>
        )}

        {activeTab === "billing" && (
          <div className="max-w-lg">
            <h2 className="text-base font-semibold text-[#202020] mb-2">Billing</h2>
            <p className="text-sm text-[#666666]">Billing management is not yet available.</p>
          </div>
        )}

        {activeTab === "advanced" && (
          <div className="max-w-lg">
            <h2 className="text-base font-semibold text-[#202020] mb-6">Advanced</h2>

            {/* Danger zone */}
            <div className="border border-[#FEE2E2] rounded-lg p-5">
              <h3 className="text-sm font-semibold text-[#DB4035] mb-1">Danger Zone</h3>
              <p className="text-sm text-[#666666] mb-4">These actions are irreversible. Please proceed with caution.</p>
              <button className="inline-flex items-center justify-center gap-2 rounded-md border border-[#DB4035] bg-white px-4 py-2 text-sm font-medium text-[#DB4035] transition-colors duration-150 hover:bg-[#FFF5F5] active:scale-[0.98]">
                Delete Workspace
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
