import type { Task } from "@cotask/types";

interface TaskCardProps {
  task: Task;
  onClick?: () => void;
  onDragStart?: (e: React.DragEvent) => void;
  onDragEnd?: () => void;
  isDragging?: boolean;
}

export function TaskCard({ task, onClick, onDragStart, onDragEnd, isDragging }: TaskCardProps) {
  const isOverdue = task.dueDate && new Date(task.dueDate) < new Date() && task.status !== "done";
  const isToday = task.dueDate && new Date(task.dueDate).toDateString() === new Date().toDateString();

  return (
    <div
      draggable
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      className={`bg-white border border-[#E8E8E8] rounded-lg p-3.5 cursor-grab active:cursor-grabbing transition-all duration-150 select-none animate-fade-in ${
        isDragging ? "opacity-40 scale-95" : ""
      }`}
      style={{
        boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
      }}
      onMouseEnter={(e) => { (e.currentTarget as HTMLDivElement).style.boxShadow = "0 3px 8px rgba(0,0,0,0.10)"; }}
      onMouseLeave={(e) => { (e.currentTarget as HTMLDivElement).style.boxShadow = "0 1px 3px rgba(0,0,0,0.06)"; }}
      onClick={onClick}
    >
      <p className="text-[15px] font-medium text-[#202020] leading-snug line-clamp-2 mb-2">
        {task.title}
      </p>

      {task.description && (
        <p className="text-[13px] text-[#666666] mt-1.5 mb-2 line-clamp-2">{task.description}</p>
      )}

      {task.source === "ai_meeting" && (
        <span className="inline-flex items-center rounded px-1.5 py-0.5 text-[11px] font-medium bg-[#F3EFFE] text-[#7C3AED] mb-2">
          AI
        </span>
      )}

      {/* Footer row */}
      <div className="flex items-center gap-2 mt-2">
        {task.dueDate && (
          <span className={`text-[12px] font-medium ${
            isOverdue ? "text-[#DB4035]" : isToday ? "text-[#058527]" : "text-[#999999]"
          }`}>
            {new Date(task.dueDate).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
          </span>
        )}
        <div className="flex-1" />
        {task.assignee && (
          <div
            className="w-6 h-6 rounded-full bg-[#DB4035] flex items-center justify-center text-[10px] font-semibold text-white shrink-0"
            title={task.assignee.displayName}
          >
            {task.assignee.displayName[0]?.toUpperCase()}
          </div>
        )}
      </div>
    </div>
  );
}
