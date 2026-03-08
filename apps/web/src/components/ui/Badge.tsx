import { clsx } from "clsx";
import type { TaskPriority, TaskStatus, ConfidenceLabel } from "@cotask/types";

const PRIORITY_MAP: Record<TaskPriority, { label: string; class: string }> = {
  1: { label: "P1", class: "bg-[#FEE2E2] text-red-700" },
  2: { label: "P2", class: "bg-[#FEF3C7] text-amber-700" },
  3: { label: "P3", class: "bg-[#EDE9FE] text-purple-700" },
  4: { label: "P4", class: "bg-[#F5F5F5] text-[#666666]" },
};

const STATUS_MAP: Record<TaskStatus, { label: string; dot: string; class: string }> = {
  todo:        { label: "To Do",       dot: "bg-[#999999]",  class: "bg-[#F5F5F5] text-[#666666]" },
  in_progress: { label: "In Progress", dot: "bg-blue-400",   class: "bg-blue-50 text-blue-700" },
  in_review:   { label: "In Review",   dot: "bg-[#7C3AED]",  class: "bg-[#F3EFFE] text-[#7C3AED]" },
  done:        { label: "Done",        dot: "bg-[#058527]",  class: "bg-green-50 text-[#058527]" },
  cancelled:   { label: "Cancelled",   dot: "bg-[#CCCCCC]",  class: "bg-[#F5F5F5] text-[#999999]" },
};

const CONFIDENCE_MAP: Record<ConfidenceLabel, { label: string; class: string }> = {
  high:   { label: "High confidence",   class: "bg-green-50 text-[#058527]" },
  medium: { label: "Medium confidence", class: "bg-[#FEF3C7] text-[#E07800]" },
  low:    { label: "Low confidence",    class: "bg-[#FEE2E2] text-[#DB4035]" },
};

export function PriorityBadge({ priority }: { priority: TaskPriority }) {
  const { label, class: cls } = PRIORITY_MAP[priority];
  return (
    <span className={clsx("inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium", cls)}>
      {label}
    </span>
  );
}

export function StatusBadge({ status }: { status: TaskStatus }) {
  const { label, dot, class: cls } = STATUS_MAP[status];
  return (
    <span className={clsx("inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-medium", cls)}>
      <span className={clsx("w-1.5 h-1.5 rounded-full", dot)} />
      {label}
    </span>
  );
}

export function ConfidenceBadge({ confidence }: { confidence: ConfidenceLabel }) {
  const { label, class: cls } = CONFIDENCE_MAP[confidence];
  return (
    <span className={clsx("inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium", cls)}>
      {label}
    </span>
  );
}
