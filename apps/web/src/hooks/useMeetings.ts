import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { Meeting, ActionPoint, PaginatedResponse, ApiResponse } from "@cotask/types";

export interface MeetingDetail extends Meeting {
  actionPoints: ActionPoint[];
}

export function useMeetings(workspaceId: string) {
  return useQuery<Meeting[]>({
    queryKey: ["meetings", workspaceId],
    queryFn: () =>
      api.get<PaginatedResponse<Meeting>>(`/workspaces/${workspaceId}/meetings`).then((r) => r.data),
    enabled: !!workspaceId,
  });
}

export function useMeeting(workspaceId: string, meetingId: string) {
  return useQuery<MeetingDetail>({
    queryKey: ["meetings", workspaceId, meetingId],
    queryFn: () =>
      api.get<ApiResponse<MeetingDetail>>(`/workspaces/${workspaceId}/meetings/${meetingId}`).then((r) => r.data),
    enabled: !!workspaceId && !!meetingId,
  });
}

export function useConvertActionPoint(workspaceId: string, meetingId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (actionPointId: string) =>
      api.post<ApiResponse<ActionPoint>>(
        `/workspaces/${workspaceId}/meetings/${meetingId}/action-points/${actionPointId}/convert`,
        {},
      ).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["meetings", workspaceId, meetingId] });
    },
  });
}
