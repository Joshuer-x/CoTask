import type { Task } from "@cotask/types";
import { StatusBadge } from "@/components/ui/Badge";

const PRIORITY_ACCENT: Record<number, string> = {
  1: "border-l-red-400",
  2: "border-l-orange-400",
  3: "border-l-yellow-400",
  4: "border-l-gray-200",
};

const PRIORITY_DOT: Record<number, string> = {
  1: "bg-red-400",
  2: "bg-orange-400",
  3: "bg-yellow-400",
  4: "bg-gray-300",
};

interface TaskCardProps {
  task: Task;
  onClick?: () => void;
}

export function TaskCard({ task, onClick }: TaskCardProps) {
  return (
    <div
      className={`bg-white border border-gray-200/80 border-l-[3px] ${PRIORITY_ACCENT[task.priority] ?? "border-l-gray-200"} rounded-xl p-3.5 cursor-pointer hover:shadow-md hover:border-gray-300/80 transition-all duration-150 group animate-fade-in`}
      onClick={onClick}
    >
      <p className="text-sm font-medium text-gray-800 leading-snug group-hover:text-brand-700 transition-colors line-clamp-2 mb-2.5">
        {task.title}
      </p>

      <div className="flex items-center gap-1.5 flex-wrap">
        <StatusBadge status={task.status} />
        {task.source === "ai_meeting" && (
          <span className="inline-flex items-center gap-0.5 text-[10px] bg-brand-50 text-brand-600 px-1.5 py-0.5 rounded-md font-semibold tracking-wide">
            AI
          </span>
        )}
        {task.dueDate && (
          <span className={`text-[11px] ml-auto tabular-nums ${
            new Date(task.dueDate) < new Date() && task.status !== "done"
              ? "text-red-500 font-medium"
              : "text-gray-400"
          }`}>
            {new Date(task.dueDate).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
          </span>
        )}
      </div>

      {task.assignee && (
        <div className="mt-2.5 flex items-center gap-1.5 pt-2.5 border-t border-gray-100">
          <div className="w-5 h-5 rounded-full bg-gradient-to-br from-brand-300 to-brand-500 flex items-center justify-center text-[10px] font-semibold text-white shrink-0">
            {task.assignee.displayName[0]?.toUpperCase()}
          </div>
          <span className="text-[11px] text-gray-500 truncate">{task.assignee.displayName}</span>
          <span className={`ml-auto w-1.5 h-1.5 rounded-full shrink-0 ${PRIORITY_DOT[task.priority] ?? "bg-gray-300"}`} title={`P${task.priority}`} />
        </div>
      )}
    </div>
  );
}
