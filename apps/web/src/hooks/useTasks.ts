import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { Task, TaskDetail, TaskComment, PaginatedResponse, ApiResponse } from "@cotask/types";
import { useTaskStore } from "@/stores/taskStore";

export interface TaskFilters {
  status?: string;
  assigneeId?: string;
  priority?: number;
  sortBy?: "created_at" | "due_date" | "priority" | "updated_at";
  sortDir?: "asc" | "desc";
}

export function useTasks(workspaceId: string, filters: TaskFilters = {}) {
  const params = new URLSearchParams();
  if (filters.status)     params.set("status", filters.status);
  if (filters.assigneeId) params.set("assigneeId", filters.assigneeId);
  if (filters.priority)   params.set("priority", String(filters.priority));
  if (filters.sortBy)     params.set("sortBy", filters.sortBy);
  if (filters.sortDir)    params.set("sortDir", filters.sortDir);
  const qs = params.toString();

  return useQuery<Task[]>({
    queryKey: ["tasks", workspaceId, filters],
    queryFn: () =>
      api.get<PaginatedResponse<Task>>(`/workspaces/${workspaceId}/tasks${qs ? `?${qs}` : ""}`).then((r) => r.data),
    enabled: !!workspaceId,
  });
}

export function useTask(workspaceId: string, taskId: string) {
  return useQuery<TaskDetail>({
    queryKey: ["task-detail", workspaceId, taskId],
    queryFn: () =>
      api.get<ApiResponse<TaskDetail>>(`/workspaces/${workspaceId}/tasks/${taskId}`).then((r) => r.data),
    enabled: !!workspaceId && !!taskId,
  });
}

export function useCreateTask(workspaceId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: Partial<Task>) =>
      api.post<ApiResponse<Task>>(`/workspaces/${workspaceId}/tasks`, body).then((r) => r.data),
    onSuccess: (task) => {
      qc.setQueryData<Task[]>(["tasks", workspaceId, {}], (old) => (old ? [task, ...old] : [task]));
      // Invalidate all task list queries for this workspace
      qc.invalidateQueries({ queryKey: ["tasks", workspaceId] });
    },
  });
}

export function useUpdateTask(workspaceId: string) {
  const qc = useQueryClient();
  const { applyOptimistic, clearOptimistic } = useTaskStore();
  return useMutation({
    mutationFn: ({ taskId, changes }: { taskId: string; changes: Partial<Task> }) =>
      api.patch<ApiResponse<Task>>(`/workspaces/${workspaceId}/tasks/${taskId}`, changes).then((r) => r.data),
    onMutate: ({ taskId, changes }) => {
      applyOptimistic(taskId, changes);
    },
    onSuccess: (task) => {
      clearOptimistic(task.id);
      qc.invalidateQueries({ queryKey: ["tasks", workspaceId] });
      qc.invalidateQueries({ queryKey: ["task-detail", workspaceId, task.id] });
    },
    onError: (_err, { taskId }) => {
      clearOptimistic(taskId);
    },
  });
}

export function useDeleteTask(workspaceId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (taskId: string) =>
      api.delete(`/workspaces/${workspaceId}/tasks/${taskId}`),
    onSuccess: (_data, taskId) => {
      qc.invalidateQueries({ queryKey: ["tasks", workspaceId] });
      qc.removeQueries({ queryKey: ["task-detail", workspaceId, taskId] });
    },
  });
}

export function useDuplicateTask(workspaceId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (taskId: string) =>
      api.post<ApiResponse<Task>>(`/workspaces/${workspaceId}/tasks/${taskId}/duplicate`, {}).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["tasks", workspaceId] });
    },
  });
}

export function useAddComment(workspaceId: string, taskId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: string) =>
      api.post<ApiResponse<TaskComment>>(`/workspaces/${workspaceId}/tasks/${taskId}/comments`, { body }).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["task-detail", workspaceId, taskId] });
    },
  });
}
