import React, { createContext, useContext, useMemo, useState } from "react";
import { TaskFilters, TaskView } from "./data/workspaceApi";

export type ViewId =
  | "card"
  | "list"
  | "compact"
  | "kanban"
  | "workload"
  | "calendar"
  | "timeline"
  | "wip"
  | "executive";

export interface TaskWorkspaceContextType {
  view: ViewId;
  setView: (v: ViewId) => void;
  filters: TaskFilters;
  setFilters: (patch: Partial<TaskFilters>) => void;
  resetFilters: () => void;
  selectedTask: TaskView | null;
  setSelectedTask: (t: TaskView | null) => void;
  isCreateOpen: boolean;
  setIsCreateOpen: (open: boolean) => void;
  editTask: TaskView | null;
  setEditTask: (t: TaskView | null) => void;
}

const DEFAULT_FILTERS: TaskFilters = {
  status: "all",
  priority: "all",
  assignment: "all",
  search: "",
};

const TaskWorkspaceContext = createContext<TaskWorkspaceContextType | null>(null);

export function TaskWorkspaceProvider({
  children,
  initialView = "card",
}: {
  children: React.ReactNode;
  initialView?: ViewId;
}) {
  const [view, setView] = useState<ViewId>(initialView);
  const [filters, setFiltersState] = useState<TaskFilters>(DEFAULT_FILTERS);
  const [selectedTask, setSelectedTask] = useState<TaskView | null>(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editTask, setEditTask] = useState<TaskView | null>(null);

  const setFilters = (patch: Partial<TaskFilters>) => {
    setFiltersState((prev) => ({ ...prev, ...patch }));
  };

  const resetFilters = () => {
    setFiltersState(DEFAULT_FILTERS);
  };

  const value = useMemo(
    () => ({
      view,
      setView,
      filters,
      setFilters,
      resetFilters,
      selectedTask,
      setSelectedTask,
      isCreateOpen,
      setIsCreateOpen,
      editTask,
      setEditTask,
    }),
    [view, filters, selectedTask, isCreateOpen, editTask]
  );

  return (
    <TaskWorkspaceContext.Provider value={value}>
      {children}
    </TaskWorkspaceContext.Provider>
  );
}

export function useTaskWorkspace() {
  const ctx = useContext(TaskWorkspaceContext);
  if (!ctx) {
    throw new Error("useTaskWorkspace must be used within a TaskWorkspaceProvider");
  }
  return ctx;
}
