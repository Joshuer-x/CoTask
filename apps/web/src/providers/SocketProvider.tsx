"use client";
import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { getSocket, disconnectSocket, onWsEvent } from "@/lib/socket";
import { useAuthStore } from "@/stores/authStore";
import { useNotificationStore } from "@/stores/notificationStore";
import type { Task } from "@cotask/types";

export function SocketProvider({ children }: { children: React.ReactNode }) {
  const accessToken = useAuthStore((s) => s.accessToken);
  const workspaceId = useAuthStore((s) => s.workspaceId);
  const addNotification = useNotificationStore((s) => s.addNotification);
  const qc = useQueryClient();

  useEffect(() => {
    if (!accessToken || !workspaceId) return;

    const socket = getSocket(accessToken);

    const offTaskCreated = onWsEvent("task:created", ({ task }) => {
      qc.setQueryData<Task[]>(["tasks", workspaceId], (old) =>
        old ? [task, ...old.filter((t) => t.id !== task.id)] : [task],
      );
    });

    const offTaskUpdated = onWsEvent("task:updated", ({ taskId, changes }) => {
      qc.setQueryData<Task[]>(["tasks", workspaceId], (old) =>
        old ? old.map((t) => (t.id === taskId ? { ...t, ...changes } : t)) : [],
      );
    });

    const offTaskDeleted = onWsEvent("task:deleted", ({ taskId }) => {
      qc.setQueryData<Task[]>(["tasks", workspaceId], (old) =>
        old ? old.filter((t) => t.id !== taskId) : [],
      );
    });

    const offActionPoints = onWsEvent("action_points:ready", ({ meetingId }) => {
      qc.invalidateQueries({ queryKey: ["meetings", workspaceId, meetingId] });
      qc.invalidateQueries({ queryKey: ["meetings", workspaceId] });
    });

    const offMeetingStatus = onWsEvent("meeting:status", ({ meetingId }: { meetingId: string; status: string }) => {
      qc.invalidateQueries({ queryKey: ["meetings", workspaceId, meetingId] });
      qc.invalidateQueries({ queryKey: ["meetings", workspaceId] });
    });

    const offNotification = onWsEvent("notification:new", ({ notification }) => {
      addNotification(notification);
    });

    return () => {
      offTaskCreated();
      offTaskUpdated();
      offTaskDeleted();
      offActionPoints();
      offMeetingStatus();
      offNotification();
      disconnectSocket();
    };
  }, [accessToken, workspaceId, qc, addNotification]);

  return <>{children}</>;
}
