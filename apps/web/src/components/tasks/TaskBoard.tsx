"use client";
import { useState } from "react";
import type { Task, TaskStatus } from "@cotask/types";
import { TaskCard } from "./TaskCard";
import { useUpdateTask } from "@/hooks/useTasks";

const COLUMNS: { status: TaskStatus; label: string; dot: string; bg: string; bgDrop: string; count: string }[] = [
  { status: "todo",        label: "To Do",       dot: "bg-gray-400",   bg: "bg-gray-50/80",    bgDrop: "bg-gray-100",     count: "bg-gray-200 text-gray-600" },
  { status: "in_progress", label: "In Progress",  dot: "bg-blue-400",   bg: "bg-blue-50/50",    bgDrop: "bg-blue-100/60",  count: "bg-blue-100 text-blue-600" },
  { status: "in_review",   label: "In Review",    dot: "bg-purple-400", bg: "bg-purple-50/50",  bgDrop: "bg-purple-100/60",count: "bg-purple-100 text-purple-600" },
  { status: "done",        label: "Done",         dot: "bg-green-400",  bg: "bg-green-50/50",   bgDrop: "bg-green-100/60", count: "bg-green-100 text-green-600" },
];

interface TaskBoardProps {
  workspaceId: string;
  tasks: Task[];
  onTaskClick?: (task: Task) => void;
}

export function TaskBoard({ workspaceId, tasks, onTaskClick }: TaskBoardProps) {
  const { mutate: updateTask } = useUpdateTask(workspaceId);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dragOverStatus, setDragOverStatus] = useState<TaskStatus | null>(null);

  const byStatus = (status: TaskStatus) => tasks.filter((t) => t.status === status);

  function handleDragStart(e: React.DragEvent, taskId: string) {
    setDraggingId(taskId);
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("taskId", taskId);
  }

  function handleDragOver(e: React.DragEvent, status: TaskStatus) {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setDragOverStatus(status);
  }

  function handleDrop(e: React.DragEvent, status: TaskStatus) {
    e.preventDefault();
    const taskId = e.dataTransfer.getData("taskId");
    const task = tasks.find((t) => t.id === taskId);
    if (task && task.status !== status) {
      updateTask({ taskId, changes: { status } });
    }
    setDraggingId(null);
    setDragOverStatus(null);
  }

  function handleDragEnd() {
    setDraggingId(null);
    setDragOverStatus(null);
  }

  return (
    <div className="flex gap-3.5 overflow-x-auto pb-6 min-h-[calc(100vh-180px)] -mx-1 px-1">
      {COLUMNS.map((col) => {
        const colTasks = byStatus(col.status);
        const isOver = dragOverStatus === col.status;
        return (
          <div
            key={col.status}
            className={`flex-shrink-0 w-[272px] flex flex-col rounded-2xl p-3 transition-colors duration-150 ${isOver ? col.bgDrop : col.bg}`}
            onDragOver={(e) => handleDragOver(e, col.status)}
            onDragLeave={() => setDragOverStatus(null)}
            onDrop={(e) => handleDrop(e, col.status)}
          >
            {/* Column header */}
            <div className="flex items-center gap-2 mb-3">
              <span className={`w-2 h-2 rounded-full ${col.dot}`} />
              <h3 className="text-xs font-semibold text-gray-600 uppercase tracking-wide flex-1">{col.label}</h3>
              <span className={`text-[11px] font-semibold rounded-full w-5 h-5 flex items-center justify-center ${col.count}`}>
                {colTasks.length}
              </span>
            </div>

            {/* Cards */}
            <div className="flex-1 space-y-2 min-h-[60px]">
              {colTasks.map((task) => (
                <TaskCard
                  key={task.id}
                  task={task}
                  onClick={() => onTaskClick?.(task)}
                  isDragging={draggingId === task.id}
                  onDragStart={(e) => handleDragStart(e, task.id)}
                  onDragEnd={handleDragEnd}
                />
              ))}
              {colTasks.length === 0 && (
                <div className={`border-2 border-dashed rounded-xl p-6 text-center mt-1 transition-colors duration-150 ${isOver ? "border-current opacity-40" : "border-gray-200/80"}`}>
                  <p className="text-xs text-gray-400">{isOver ? "Drop here" : "No tasks"}</p>
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
