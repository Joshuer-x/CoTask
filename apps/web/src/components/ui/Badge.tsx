import { clsx } from "clsx";
import type { TaskPriority, TaskStatus, ConfidenceLabel } from "@cotask/types";

const PRIORITY_MAP: Record<TaskPriority, { label: string; class: string }> = {
  1: { label: "P1", class: "bg-red-50 text-red-600 ring-1 ring-red-200" },
  2: { label: "P2", class: "bg-orange-50 text-orange-600 ring-1 ring-orange-200" },
  3: { label: "P3", class: "bg-yellow-50 text-yellow-600 ring-1 ring-yellow-200" },
  4: { label: "P4", class: "bg-gray-50 text-gray-500 ring-1 ring-gray-200" },
};

const STATUS_MAP: Record<TaskStatus, { label: string; dot: string; class: string }> = {
  todo:        { label: "To Do",       dot: "bg-gray-400",   class: "bg-gray-50 text-gray-600" },
  in_progress: { label: "In Progress", dot: "bg-blue-400",   class: "bg-blue-50 text-blue-700" },
  in_review:   { label: "In Review",   dot: "bg-purple-400", class: "bg-purple-50 text-purple-700" },
  done:        { label: "Done",        dot: "bg-green-400",  class: "bg-green-50 text-green-700" },
  cancelled:   { label: "Cancelled",   dot: "bg-gray-300",   class: "bg-gray-50 text-gray-400" },
};

const CONFIDENCE_MAP: Record<ConfidenceLabel, { label: string; class: string }> = {
  high:   { label: "High confidence",   class: "bg-green-50 text-green-700 ring-1 ring-green-200" },
  medium: { label: "Medium confidence", class: "bg-yellow-50 text-yellow-700 ring-1 ring-yellow-200" },
  low:    { label: "Low confidence",    class: "bg-red-50 text-red-700 ring-1 ring-red-200" },
};

export function PriorityBadge({ priority }: { priority: TaskPriority }) {
  const { label, class: cls } = PRIORITY_MAP[priority];
  return (
    <span className={clsx("inline-flex items-center px-1.5 py-0.5 rounded-md text-[11px] font-semibold", cls)}>
      {label}
    </span>
  );
}

export function StatusBadge({ status }: { status: TaskStatus }) {
  const { label, dot, class: cls } = STATUS_MAP[status];
  return (
    <span className={clsx("inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-medium", cls)}>
      <span className={clsx("w-1.5 h-1.5 rounded-full", dot)} />
      {label}
    </span>
  );
}

export function ConfidenceBadge({ confidence }: { confidence: ConfidenceLabel }) {
  const { label, class: cls } = CONFIDENCE_MAP[confidence];
  return (
    <span className={clsx("inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium", cls)}>
      {label}
    </span>
  );
}
