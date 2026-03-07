import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { WorkspaceMember } from "@cotask/types";

export function useWorkspaceMembers(workspaceId: string) {
  return useQuery<WorkspaceMember[]>({
    queryKey: ["workspace-members", workspaceId],
    queryFn: () =>
      api.get<{ data: WorkspaceMember[] }>(`/workspaces/${workspaceId}/members`).then((r) => r.data),
    enabled: !!workspaceId,
  });
}
