import { create } from "zustand";
import type { Task } from "@cotask/types";

interface TaskState {
  // Optimistic task map keyed by id for instant UI updates
  optimisticUpdates: Record<string, Partial<Task>>;
  applyOptimistic: (taskId: string, changes: Partial<Task>) => void;
  clearOptimistic: (taskId: string) => void;
}

export const useTaskStore = create<TaskState>((set) => ({
  optimisticUpdates: {},
  applyOptimistic(taskId, changes) {
    set((s) => ({ optimisticUpdates: { ...s.optimisticUpdates, [taskId]: changes } }));
  },
  clearOptimistic(taskId) {
    set((s) => {
      const next = { ...s.optimisticUpdates };
      delete next[taskId];
      return { optimisticUpdates: next };
    });
  },
}));
