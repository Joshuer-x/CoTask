"use client";
import { useState } from "react";
import type { Task, TaskStatus } from "@cotask/types";
import { TaskCard } from "./TaskCard";
import { useUpdateTask } from "@/hooks/useTasks";

const COLUMNS: { status: TaskStatus; label: string }[] = [
  { status: "todo",        label: "To Do" },
  { status: "in_progress", label: "In Progress" },
  { status: "in_review",   label: "In Review" },
  { status: "done",        label: "Done" },
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
            className={`flex-shrink-0 w-[280px] flex flex-col rounded-lg p-3 transition-colors duration-150 ${
              isOver ? "bg-[#FDECEA]" : "bg-[#FAF7F5]"
            }`}
            onDragOver={(e) => handleDragOver(e, col.status)}
            onDragLeave={() => setDragOverStatus(null)}
            onDrop={(e) => handleDrop(e, col.status)}
          >
            {/* Column header */}
            <div className="flex items-center gap-2 mb-3">
              <h3 className="text-sm font-semibold text-[#202020] flex-1">{col.label}</h3>
              <span className="text-[#999999] text-xs tabular-nums">{colTasks.length}</span>
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
                <div className={`border-2 border-dashed rounded-lg p-6 text-center mt-1 transition-colors duration-150 ${isOver ? "border-[#DB4035]/40" : "border-[#E0E0E0]"}`}>
                  <p className="text-xs text-[#CCCCCC]">{isOver ? "Drop here" : "No tasks"}</p>
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
